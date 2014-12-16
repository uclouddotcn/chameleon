package prj.chameleon.meizu;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.util.Log;

import com.meizu.gamecenter.sdk.LoginResultCode;
import com.meizu.gamecenter.sdk.MzAccountInfo;
import com.meizu.gamecenter.sdk.MzBuyInfo;
import com.meizu.gamecenter.sdk.MzGameBarPlatform;
import com.meizu.gamecenter.sdk.MzGameCenterPlatform;
import com.meizu.gamecenter.sdk.MzLoginListener;
import com.meizu.gamecenter.sdk.MzPayListener;
import com.meizu.gamecenter.sdk.PayResultCode;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class MeizuChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class UserInfo {
        public String mUserId;
        public String mUserName;
        public String mUserSession;
    }

    private static class Config {
        public String mAppID;
        public String mAppKey;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IAccountActionListener mAccountActionListener;

    private MzGameBarPlatform mMzGameBarPlatform;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppID = cfg.getString("appId");
        mCfg.mAppKey = cfg.getString("appKey");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void onApplicationEvent(int event, Object... arguments) {
        switch (event) {
            case Constants.ApplicationEvent.AFTER_ON_CREATE:
                Application app = (Application) arguments[0];
                MzGameCenterPlatform.init(app, mCfg.mAppID, mCfg.mAppKey);
                break;
        }
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        mMzGameBarPlatform = new MzGameBarPlatform(activity, MzGameBarPlatform.GRAVITY_RIGHT_BOTTOM);
        mMzGameBarPlatform.onActivityCreate();
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        MzGameCenterPlatform.login(activity, new MzLoginListener() {
            @Override
            public void onLoginResult(int code, MzAccountInfo mzAccountInfo, String errorMsg) {
                UserInfo userInfo = new UserInfo();
                switch(code){
                    case LoginResultCode.LOGIN_SUCCESS:
                        userInfo.mUserId = mzAccountInfo.getUid();
                        userInfo.mUserName = mzAccountInfo.getName();
                        userInfo.mUserSession = mzAccountInfo.getSession();
                        mUserInfo = userInfo;
                        cb.onFinished(Constants.ErrorCode.ERR_OK,
                                JsonMaker.makeLoginResponse(userInfo.mUserSession, userInfo.mUserId,
                                        mChannel));
                        mAccountActionListener = accountActionListener;
                        break;
                    case LoginResultCode.LOGIN_ERROR_CANCEL:
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                        break;
                    default:
                        Log.e(Constants.TAG, String.format("unknown login rsp state from meizu: %d", code));
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, JsonMaker.makeLoginResponse(null, errorMsg, mChannel));
                        break;
                }
            }
        });
    }

    @Override
    public void logout(Activity activity) {
        MzGameCenterPlatform.logout(activity.getApplicationContext());
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
        if (realPayMoney > 9999900) {
            Log.e(Constants.TAG, "meizu: excceeds money limit");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            return;
        }

        MzBuyInfo buyInfo = new MzBuyInfo();
        try {
            JSONObject payInfoObj = new JSONObject(payInfo);
            buyInfo.setPayType(payInfoObj.getInt("pay_type")).setCreateTime(payInfoObj.getLong("create_time"))
                    .setCpUserInfo(payInfoObj.optString("user_info")).setSignType(payInfoObj.getString("sign_type"))
                    .setProductSubject(payInfoObj.optString("product_subject")).setProductBody(payInfoObj.optString("product_body"))
                    .setProductUnit(payInfoObj.optString("product_unit")).setSign(payInfoObj.getString("sign"))
                    .setOrderId(payInfoObj.getString("cp_order_id")).setUserUid(payInfoObj.getString("uid"))
                    .setProductId(payInfoObj.getString("product_id")).setOrderAmount(payInfoObj.getString("total_price"))
                    .setPerPrice(payInfoObj.getString("product_per_price")).setBuyCount(payInfoObj.getInt("buy_amount"))
                    .setAppid(payInfoObj.getString("app_id"));
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to get pay info", e);
        }

        MzGameCenterPlatform.payOnline(activity, buyInfo, new MzPayListener(){
            @Override
            public void onPayResult(int code, MzBuyInfo mzBuyInfo, String errorMsg) {
                switch(code){
                    case PayResultCode.PAY_SUCCESS:
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        break;
                    case PayResultCode.PAY_ERROR_CANCEL:
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                        break;
                    default:
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                        Log.e(Constants.TAG, String.format("unknown pay rsp state from meizu: %d", code));
                        break;
                }
            }
        });
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

        if (realPayMoney > 9999900) {
            Log.e(Constants.TAG, "meizu: excceeds money limit");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            return;
        }

        MzBuyInfo buyInfo = new MzBuyInfo();
        try {
            JSONObject payInfoObj = new JSONObject(payInfo);
            buyInfo.setPayType(payInfoObj.getInt("pay_type")).setCreateTime(payInfoObj.getLong("create_time"))
                    .setCpUserInfo(payInfoObj.optString("user_info")).setSignType(payInfoObj.getString("sign_type"))
                    .setProductSubject(payInfoObj.optString("product_subject")).setProductBody(payInfoObj.optString("product_body"))
                    .setProductUnit(payInfoObj.optString("product_unit")).setSign(payInfoObj.getString("sign"))
                    .setOrderId(payInfoObj.getString("cp_order_id")).setUserUid(payInfoObj.getString("uid"))
                    .setProductId(payInfoObj.getString("product_id")).setOrderAmount(payInfoObj.getString("total_price"))
                    .setPerPrice(payInfoObj.getString("product_per_price")).setBuyCount(payInfoObj.getInt("buy_amount"))
                    .setAppid(payInfoObj.getString("app_id"));
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to get pay info", e);
        }

        MzGameCenterPlatform.payOnline(activity, buyInfo, new MzPayListener(){
            @Override
            public void onPayResult(int code, MzBuyInfo mzBuyInfo, String errorMsg) {
                switch(code){
                    case PayResultCode.PAY_SUCCESS:
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        break;
                    case PayResultCode.PAY_ERROR_CANCEL:
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                        break;
                    default:
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                        Log.e(Constants.TAG, String.format("unknown pay rsp state from meizu: %d", code));
                        break;
                }
            }
        });
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
        return "meizu";
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

    @Override
    public void onDestroy(Activity activity) {
        super.onDestroy(activity);
        if(mMzGameBarPlatform != null){
            mMzGameBarPlatform.onActivityDestroy();
        }
    }

    @Override
    public void onResume(Activity activity, IDispatcherCb cb) {
        super.onResume(activity, cb);
        if(mMzGameBarPlatform != null){
            mMzGameBarPlatform.onActivityResume();
        }
    }

    @Override
    public void onPause(Activity activity) {
        super.onPause(activity);
        if(mMzGameBarPlatform != null){
            mMzGameBarPlatform.onActivityPause();
        }
    }

    @Override
    public void showFloatBar(Activity activity, boolean visible) {
        if(mMzGameBarPlatform != null){
            mMzGameBarPlatform.showGameBar();
        }
    }

    @Override
    public void destroyToolBar(Activity activity) {
        if(mMzGameBarPlatform != null) {
            mMzGameBarPlatform.hideGameBar();
        }
    }
}