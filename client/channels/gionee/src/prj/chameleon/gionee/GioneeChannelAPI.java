package prj.chameleon.gionee;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import com.gionee.gamesdk.AccountInfo;
import com.gionee.gamesdk.GamePayer;
import com.gionee.gamesdk.GamePlatform;
import com.gionee.gamesdk.OrderInfo;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class GioneeChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class UserInfo {
        public String mUserId;
        public String mUserToken;
    }

    private static class Config {
        public String mAppKey;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IAccountActionListener mAccountActionListener;
    private GamePayer mGamePayer;
    private IDispatcherCb mPayCb;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppKey = cfg.getString("appKey");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        GamePlatform.getInstance(activity).init(mCfg.mAppKey);
        if (mGamePayer != null)
            return;
        mGamePayer = new GamePayer(activity);
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        GamePlatform.getInstance(activity).loginAccount(111, true, new GamePlatform.LoginListener() {
            @Override
            public void onSuccess(AccountInfo accountInfo) {
                UserInfo userInfo = new UserInfo();
                userInfo.mUserId = accountInfo.mPlayerId;
                userInfo.mUserToken = accountInfo.mToken;
                mUserInfo = userInfo;
                cb.onFinished(Constants.ErrorCode.ERR_OK,
                        JsonMaker.makeLoginResponse(userInfo.mUserToken, userInfo.mUserId,
                                mChannel));
                mAccountActionListener = accountActionListener;
            }

            @Override
            public void onError(Exception e) {
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }

            @Override
            public void onCancel() {
                cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
            }
        });
    }

    @Override
    public void logout(Activity activity) {
        if (mAccountActionListener != null) {
            mAccountActionListener.onAccountLogout();
        }
        mUserInfo = null;
    }

    @Override
    public void charge(Activity activity,
                       String orderId,
                       String uidInGame,
                       String userNameInGame,//用户名 无用
                       String serverId,
                       String currencyName,//货币名称 无用
                       String payInfo,
                       int rate,//单价
                       int realPayMoney,//总价
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
        onStartPay(orderId, payInfo, cb);
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
                    IDispatcherCb cb) {
        onStartPay(orderId, payInfo, cb);
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
            return mUserInfo.mUserToken;
        }
    }

    @Override
    public boolean isLogined() {
        return mUserInfo != null;
    }

    @Override
    public String getId() {
        return "gionee";
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

    @Override
    public void onResume(Activity activity, IDispatcherCb cb) {
        super.onResume(activity, cb);
        if (mPayCb != null) {
            mPayCb = null;
        }
        if (mGamePayer != null)
            mGamePayer.onResume();
    }

    @Override
    public void onDestroy(Activity activity) {
        super.onDestroy(activity);
        mPayCb = null;
        if (mGamePayer != null)
            mGamePayer.onDestroy();
    }

    //以下为辅助方法
    private void onStartPay(String orderId, String payInfo, IDispatcherCb cb){
        if (mGamePayer == null || mPayCb != null)
            return;
        GamePayer.GamePayCallback mGamePayCallback = mGamePayer.new GamePayCallback(){
            @Override
            public void onPaySuccess() {
                if (mPayCb == null)
                    return;
                mPayCb.onFinished(Constants.ErrorCode.ERR_OK, null);
                mPayCb = null;
            }

            @Override
            public void onPayCancel() {
                if (mPayCb == null)
                    return;
                mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                mPayCb = null;
            }

            @Override
            public void onPayFail(String stateCode) {
                if (mPayCb == null)
                    return;
                mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                mPayCb = null;
            }
        };
        String submitTime = null;

        try {
            JSONObject jsonObject = new JSONObject(payInfo);
            submitTime = jsonObject.getString("time");
        } catch (JSONException e) {
            Log.e("GioneeChannelAPI", "fail to get payinfo", e);
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
        OrderInfo mOrderInfo = new OrderInfo();
        mOrderInfo.setApiKey(mCfg.mAppKey);
        mOrderInfo.setOutOrderNo(orderId);
        mOrderInfo.setSubmitTime(submitTime);

        try {
            mGamePayer.pay(mOrderInfo, mGamePayCallback);
            mPayCb = cb;
        } catch (Exception e) {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
    }
}