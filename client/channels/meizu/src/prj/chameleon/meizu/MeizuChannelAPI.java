package prj.chameleon.meizu;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import com.meizu.gamecenter.sdk.LoginResultCode;
import com.meizu.gamecenter.sdk.MzAccountInfo;
import com.meizu.gamecenter.sdk.MzBuyInfo;
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
        public String mAppSecret;
    }

    private Config mCfg;
    private UserInfo mUserInfo;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppID = cfg.getString("appId");
        mCfg.mAppKey = cfg.getString("appKey");
        mCfg.mAppSecret = cfg.getString("appSecret");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        MzGameCenterPlatform.init(activity, mCfg.mAppID, mCfg.mAppKey);
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        MzGameCenterPlatform.login(activity, new MzLoginListener() {
            @Override
            public void onLoginResult(int code, MzAccountInfo mzAccountInfo, String errorMsg) {
                UserInfo userInfo = new UserInfo();
                switch(code){
                    case LoginResultCode.LOGIN_SUCCESS:
                        userInfo.mUserId = mzAccountInfo.getUid();
                        userInfo.mUserSession = mzAccountInfo.getSession();
                        userInfo.mUserName = mzAccountInfo.getName();
                        mUserInfo = userInfo;
                        cb.onFinished(Constants.ErrorCode.ERR_OK,
                                JsonMaker.makeLoginResponse(userInfo.mUserSession, userInfo.mUserId,
                                        mChannel));
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
        MzGameCenterPlatform.logout(activity);
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
        if (realPayMoney > 99999) {
            Log.e(Constants.TAG, "meizu: excceeds money limit");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            return;
        }

        MzBuyInfo mzBuyInfo = new MzBuyInfo().setOrderId(orderId).setUserUid(uidInGame).setProductId(serverId).setAppid(mCfg.mAppID)
                .setPerPrice(String.valueOf(rate)).setBuyCount(realPayMoney / rate);
        if (allowUserChange){
            mzBuyInfo.setOrderAmount(String.valueOf(realPayMoney / 100));
        }else {
            mzBuyInfo.setOrderAmount("0");
        }

        try {
            JSONObject mPayInfo = new JSONObject(payInfo);
            if (mPayInfo != null){
                mzBuyInfo.setPayType(mPayInfo.getInt("payType")).setCreateTime(mPayInfo.getLong("createTime"))
                        .setCpUserInfo(mPayInfo.getString("cpUserInfo")).setSignType(mPayInfo.getString("signType"))
                        .setProductSubject(mPayInfo.getString("productSubject")).setProductBody(mPayInfo.getString("productBody"))
                        .setProductUnit(mPayInfo.getString("productUnit")).setSign(mPayInfo.getString("sign"));
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

        MzGameCenterPlatform.payOnline(activity, mzBuyInfo, new MzPayListener(){
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

        if (realPayMoney > 99999) {
            Log.e(Constants.TAG, "meizu: excceeds money limit");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            return;
        }

        MzBuyInfo mzBuyInfo = new MzBuyInfo().setOrderId(orderId).setUserUid(uidInGame).setProductId(serverId).setAppid(mCfg.mAppID)
                .setOrderAmount(String.valueOf(realPayMoney)).setPerPrice(String.valueOf(realPayMoney / productCount)).setBuyCount(productCount);
        try {
            JSONObject mPayInfo = new JSONObject(payInfo);
            if (mPayInfo != null){
                mzBuyInfo.setPayType(mPayInfo.getInt("payType")).setCreateTime(mPayInfo.getLong("createTime"))
                        .setCpUserInfo(mPayInfo.getString("cpUserInfo")).setSignType(mPayInfo.getString("signType"))
                        .setProductSubject(mPayInfo.getString("productSubject")).setProductBody(mPayInfo.getString("productBody"))
                        .setProductUnit(mPayInfo.getString("productUnit")).setSign(mPayInfo.getString("sign"));
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

        MzGameCenterPlatform.payOnline(activity, mzBuyInfo, new MzPayListener(){
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
        return mUserInfo == null;
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
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
    }
}