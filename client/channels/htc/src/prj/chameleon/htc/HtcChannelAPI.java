package prj.chameleon.htc;

import android.app.Activity;
import android.app.Application;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.jolo.account.Jolo;
import com.jolo.jolopay.JoloPay;
import com.jolo.sdk.JoloSDK;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class HtcChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class UserInfo {
        public String mUserId;
        public String mUserName;
        public String mUserSession;
        public String mAccountSign;
        public String mAccount;
    }

    private static class Config {
        public String mGameCode;
        public String mGameName;
        public String mNotifyURL;
    }

    private Config mCfg;

    private UserInfo mUserInfo;
    private IDispatcherCb mLoginCb;
    private IAccountActionListener mAccountActionListener;

    private IDispatcherCb mPayCb;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mGameCode = cfg.getString("gameCode");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        JoloSDK.initJoloSDK(activity, mCfg.mGameCode);
        JoloSDK.initCallBack(joloLoginCb, joloPayCb);
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    private final Jolo.onAccountResult joloLoginCb = new Jolo.onAccountResult() {
        @Override
        public void onAccount(int resultCode, Intent data) {
            if (resultCode != Activity.RESULT_OK || data == null)
                return;
            onLoginResult(data);
        }
    };

    private final JoloPay.onPayResult joloPayCb = new JoloPay.onPayResult() {
        @Override
        public void onPay(int resultCode, Intent data) {
            if (resultCode != Activity.RESULT_OK || data == null)
                return;
            onPayResult(data);
        }
    };

    @Override
    public void login(Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        if (mLoginCb != null) {
            cb.onFinished(Constants.ErrorCode.ERR_LOGIN_IN_PROGRESS, null);
            return;
        }
        JoloSDK.login(activity);
        mLoginCb = cb;
        mAccountActionListener = accountActionListener;
    }

    @Override
    public void logout(Activity activity) {
        JoloSDK.logoff(activity);
        if (mAccountActionListener != null) {
            mAccountActionListener.onAccountLogout();
        }
        mUserInfo = null;
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        super.onActivityResult(activity, requestCode, resultCode, data);
        if (resultCode != Activity.RESULT_OK || data == null)
            return;
        switch (requestCode) {
            case JoloSDK.ACCOUNT_REQUESTCODE: {
                onLoginResult(data);
            }
            break;
            case JoloSDK.PAY_REQUESTCODE: {
                onPayResult(data);
            }
            break;
            default:
                break;
        }
    }

    @Override
    public void onResume(Activity activity, final IDispatcherCb cb) {
        if (mPayCb != null) {
            mPayCb = null;
        }
        super.onResume(activity, cb);
    }

    @Override
    public void onDestroy(Activity activity) {
        mLoginCb = null;
        mPayCb = null;
        JoloSDK.releaseJoloSDK();// 销毁SDK所使用的资源
        super.onDestroy(activity);
    }

    @Override
    public void charge(Activity activity,
                       String orderId,
                       String uidInGame,
                       String userNameInGame,//用户名
                       String serverId,
                       String currencyName,//货币名称
                       String payInfo,
                       int rate,//单价
                       int realPayMoney,//总价
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
        onStartPay(activity, orderId, realPayMoney, payInfo, cb);
    }

    @Override
    public void buy(Activity activity,
                    String orderId,
                    String uidInGame,
                    String userNameInGame,
                    String serverId,
                    String productName,
                    String productID,
                    String payInfo,
                    int productCount,//个数
                    int realPayMoney,
                    final IDispatcherCb cb) {
        onStartPay(activity, orderId, realPayMoney, payInfo, cb);
    }

    @Override
    public String getUid() {
        if (mUserInfo == null) {
            return "";
        } else {
            return mUserInfo.mUserId;
        }
    }

    @Override
    public String getToken() {
        if (mUserInfo == null) {
            return "";
        } else {
            return mUserInfo.mUserSession;
        }
    }

    @Override
    public boolean isLogined() {
        return mUserInfo != null;
    }

    @Override
    public String getId() {
        return "htc";
    }

    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
    }

    //以下为辅助方法
    private void onStartPay(Activity activity, String orderId, int realPayMoney, String payInfo, IDispatcherCb cb){
        if (mUserInfo == null) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_SESSION_INVALID, null);
            return;
        }
        if (mPayCb != null) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
            return;
        }

        Order order = new Order();
        String joloOrder = "";
        String joloOrderSign = "";

        try {
            JSONObject jsonObject = new JSONObject(payInfo);
            joloOrderSign = jsonObject.getString("orderSign");
            order.setProductID(jsonObject.getString("productID")); // 设置产品ID
            order.setProductDes(jsonObject.getString("productDes")); // 设置产品描述
            order.setProductName(jsonObject.getString("productName")); // 设置产品名称
        } catch (JSONException e) {
        }

        order.setAmount(String.valueOf(realPayMoney)); // 设置支付金额，单位分
        order.setGameCode(mCfg.mGameCode); // 设置游戏唯一ID,由Jolo提供
        order.setGameName(mCfg.mGameName); // 设置游戏名称
        order.setGameOrderid(orderId); // 设置游戏订单号
        order.setNotifyUrl(mCfg.mNotifyURL); // 设置支付通知

        order.setSession(mUserInfo.mUserSession); // 设置用户session
        order.setUsercode(mUserInfo.mUserId); // 设置用户ID

        joloOrder = order.toJsonOrder(); // 生成Json字符串订单

        JoloSDK.startPay(activity, joloOrder, joloOrderSign);
        mPayCb = cb;
    }

    private void onLoginResult(Intent data){
        if (mLoginCb == null) {
            return;
        }
        UserInfo userInfo = new UserInfo();
        // 用户账号ID
        userInfo.mUserId = data.getStringExtra(JoloSDK.USER_ID);
        // 用户账号名
        userInfo.mUserName = data.getStringExtra(JoloSDK.USER_NAME);
        // 账号的session，支付时使用
        userInfo.mUserSession = data.getStringExtra(JoloSDK.USER_SESSION);
        // 用户帐号信息签名(聚乐公钥验签)，密文，CP对该密文用公钥进行校验
        userInfo.mAccountSign = data.getStringExtra(JoloSDK.ACCOUNT_SIGN);
        // 用户帐号信息，明文，用户加密的字符串
        userInfo.mAccount = data.getStringExtra(JoloSDK.ACCOUNT);

        mUserInfo = userInfo;

        mLoginCb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(userInfo.mUserSession, userInfo.mUserId, mChannel));
    }

    private void onPayResult(Intent data){
        if (mPayCb == null) {
            return;
        }
        ResultOrder resultOrder = new ResultOrder(data.getStringExtra(JoloSDK.PAY_RESP_ORDER));
        if (resultOrder.getResultCode() == 200){
            mPayCb.onFinished(Constants.ErrorCode.ERR_OK, null);
        }else {
            mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
        }

    }

}