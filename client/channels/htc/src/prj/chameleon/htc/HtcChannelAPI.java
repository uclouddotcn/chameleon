package prj.chameleon.htc;

import android.app.Activity;
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
        mCfg.mGameName = cfg.getString("gameName");;
        mCfg.mNotifyURL = cfg.getString("payUrl");
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
            onLoginResult(resultCode, data);
        }
    };

    private final JoloPay.onPayResult joloPayCb = new JoloPay.onPayResult() {
        @Override
        public void onPay(int resultCode, Intent data) {
            onPayResult(resultCode, data);
        }
    };

    @Override
    public JSONObject getPayInfo() {
        if (mUserInfo == null) {
            return null;
        }
        JSONObject obj = new JSONObject();
        try {
            obj.put("s", mUserInfo.mUserSession);
            return obj;
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to make json obj", e);
            return null;
        }
    }

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
                onLoginResult(resultCode, data);
            }
            break;
            case JoloSDK.PAY_REQUESTCODE: {
                onPayResult(resultCode, data);
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
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
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
                cb.onFinished(Constants.ErrorCode.ERR_LOGIN_GAME_EXIT_NOCARE, null);
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
        String joloOrderSign = "";
        String joloOrder= "";
        try {
            JSONObject jsonObject = new JSONObject(payInfo);
            joloOrderSign = jsonObject.getString("sign");
            joloOrder = jsonObject.getString("p");
        } catch (JSONException e) {
        }

        JoloSDK.startPay(activity, joloOrder, joloOrderSign);
        mPayCb = cb;
    }

    private void onLoginResult(int resultCode, Intent data){
        if (mLoginCb == null) {
            return;
        }
        if (resultCode != Activity.RESULT_OK || data == null){
            mLoginCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
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
        mLoginCb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(userInfo.mAccountSign, userInfo.mAccount, mChannel));
        mLoginCb = null;
    }

    private void onPayResult(int resultCode, Intent data){
        if (mPayCb == null) {
            return;
        }
        if (resultCode != Activity.RESULT_OK || data == null){
            mPayCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
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