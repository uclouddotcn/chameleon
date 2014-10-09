package prj.chameleon.chinamob;

import android.app.Activity;
import android.util.Log;
import android.os.Bundle;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;

import cn.cmgame.billing.api.BillingResult;
import cn.cmgame.billing.api.GameInterface;
import cn.cmgame.billing.api.GameInterface.GameExitCallback;
import cn.cmgame.billing.api.LoginResult;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


import org.json.JSONException;
import org.json.JSONObject;

import java.util.TreeMap;

public final class ChinamobChannelAPI extends SingleSDKChannelAPI.SingleSDK {
    private static class UserInfo {
        public String mUid;
        public String mSession;
    }

    private IDispatcherCb mLoginCb;
    private UserInfo mUserInfo;
    private TreeMap<String, String> mProductMap;
    private IAccountActionListener mAccountActionListener;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mProductMap = (TreeMap<String, String>) cfg.getSerializable("productMap");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(final Activity context, final IDispatcherCb cb) {

        mUserInfo = new UserInfo();

        // 监听登录结果，游戏根据自身业务逻辑，使用移动游戏SDK提供的登录结果
        GameInterface.setLoginListener(context, new GameInterface.ILoginCallback(){
            @Override
            public void onResult(int i, String s, Object o) {
                Log.e(Constants.TAG, "Login.Result=" + s);
                if (mLoginCb == null) {
                    Log.e(Constants.TAG, "login must have prepared a callback");
                    return;
                }
                if(i == LoginResult.SUCCESS_EXPLICIT || i==LoginResult.SUCCESS_IMPLICIT){
                    mUserInfo.mUid = s;
                    JSONObject obj = JsonMaker.makeLoginResponse(s, "", mChannel);
                    mLoginCb.onFinished(Constants.ErrorCode.ERR_OK, obj);
                }
                if(i == LoginResult.FAILED_EXPLICIT || i==LoginResult.FAILED_IMPLICIT){
                    mLoginCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
                if(i == LoginResult.UNKOWN){
                    mLoginCb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                }
                mLoginCb = null;
            }
        });
    }

    @Override
    public void loginGuest(Activity activity, IDispatcherCb loginCallback, IAccountActionListener accountActionListener) {
        login(activity, loginCallback, accountActionListener);
    }

    @Override
    public boolean registGuest(Activity activity, String tips, IDispatcherCb cb) {
        return false;
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        if (mLoginCb != null) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    cb.onFinished(Constants.ErrorCode.ERR_LOGIN_IN_PROGRESS, null);
                }
            });
        }
        mLoginCb = cb;
        GameInterface.initializeApp(activity);
        mAccountActionListener = accountActionListener;
    }

    @Override
    public boolean onLoginRsp(String loginRsp) {
        JSONObject obj;
        try {
            obj = new JSONObject(loginRsp);
            mUserInfo.mSession = obj.getString("key");
            return true;
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to parse json", e);
            return false;
        }
    }

    @Override
    public void charge(Activity activity,
                       String orderId,
                       String appUid,
                       String appUserName,
                       String serverId,
                       String currencyName,
                       String payInfo,
                       int rate,
                       int realPayMoney,
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
        throw new RuntimeException("china mob not support charge");
    }

    @Override
    public void buy(Activity activity,
                    String orderId,
                    String appUid,
                    String appUserName,
                    String serverId,
                    String productName,
                    String productID,
                    String payInfo,
                    int productCount,
                    int realPayMoney,
                    final IDispatcherCb cb) {
        String billingIndex = mProductMap.get(productID);
        if (billingIndex == null) {
            billingIndex = productID;
        }
        String cpparam = getCpParam(orderId);
        if (cpparam.length() == 0) {
            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
            return;
        }
        GameInterface.doBilling(activity, true, false, billingIndex, cpparam, new GameInterface.IPayCallback() {
            @Override
            public void onResult(int resultCode, String billingIndex, Object obj) {
                switch (resultCode) {
                    case BillingResult.SUCCESS:
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        break;
                    case BillingResult.FAILED:
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                        break;
                    default:
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                        break;
                }
            }
        });
    }

    @Override
    public String getId() {
        return "chinamob";
    }

    @Override
    public void logout(Activity activity) {

    }


    @Override
    public String getUid() {
        if (!isLogined()) {
            return "";
        }
        return mUserInfo.mUid;
    }

    @Override
    public String getToken() {
        if (!isLogined()) {
            return "";
        }
        return mUserInfo.mSession;
    }

    @Override
    public boolean isLogined() {
        return mUserInfo != null;
    }

    @Override
    public void onApplicationEvent(int event, Object... arguments) {
        if (event == Constants.ApplicationEvent.BEFORE_ON_CREATE) {
            System.loadLibrary("megjb");
        }
    }

    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        GameInterface.exit(activity, new GameExitCallback() {
            @Override
            public void onConfirmExit() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

            @Override
            public void onCancelExit() {
                cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
            }
        });
    }

    private String getCpParam(String orderId) {
        JSONObject obj = new JSONObject();
        try {
            obj.put("o", orderId);
            obj.put("ch", mChannel);
            return obj.toString();
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to compose param", e);
            return "";
        }
    }
}
