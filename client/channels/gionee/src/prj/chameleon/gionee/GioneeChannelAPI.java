package prj.chameleon.gionee;

import android.app.Activity;
import android.os.Bundle;

import com.gionee.gamesdk.AccountInfo;
import com.gionee.gamesdk.GamePayer;
import com.gionee.gamesdk.GamePlatform;
import com.gionee.gamesdk.OrderInfo;

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
        public String mAppID;
        public String mAppKey;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IAccountActionListener mAccountActionListener;
    private GamePayer mGamePayer;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppKey = cfg.getString("appKey");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        GamePlatform.getInstance(activity).init(mCfg.mAppKey);
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

        mGamePayer = new GamePayer(activity);

        OrderInfo mOrderInfo = new OrderInfo();
        mOrderInfo.setApiKey(mCfg.mAppKey);
        mOrderInfo.setOutOrderNo(serverId);
        mOrderInfo.setSubmitTime(payInfo);

        GamePayer.GamePayCallback mGamePayCallback = mGamePayer.new GamePayCallback(){
            //支付成功
            @Override
            public void onPaySuccess() {
                // 可以在这里处理自己的业务
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

            //支付取消
            @Override
            public void onPayCancel() {
                // 可以在这里处理自己的业务
                cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
            }

            //支付失败，stateCode为支付失败状态码，详见接入指南
            @Override
            public void onPayFail(String stateCode) {
                // 可以在这里处理自己的业务
                cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
            }
        };

        try {
            mGamePayer.pay(mOrderInfo, mGamePayCallback);
        } catch (Exception e) {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
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

        GamePayer mGamePayer = new GamePayer(activity);

        OrderInfo mOrderInfo = new OrderInfo();
        mOrderInfo.setApiKey(mCfg.mAppKey);
        mOrderInfo.setOutOrderNo(serverId);
        mOrderInfo.setSubmitTime(payInfo);

        GamePayer.GamePayCallback mGamePayCallback = mGamePayer.new GamePayCallback(){
            //支付成功
            @Override
            public void onPaySuccess() {
                // 可以在这里处理自己的业务
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

            //支付取消
            @Override
            public void onPayCancel() {
                // 可以在这里处理自己的业务
                cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
            }

            //支付失败，stateCode为支付失败状态码，详见接入指南
            @Override
            public void onPayFail(String stateCode) {
                // 可以在这里处理自己的业务
                cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
            }
        };

        try {
            mGamePayer.pay(mOrderInfo, mGamePayCallback);
        } catch (Exception e) {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
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
        // 在不能静默安装的手机，升级成功后自动调起收银台
        if (mGamePayer != null)
            mGamePayer.onResume();
    }

    @Override
    public void onDestroy(Activity activity) {
        super.onDestroy(activity);
        if (mGamePayer != null)
            mGamePayer.onDestroy();
    }
}