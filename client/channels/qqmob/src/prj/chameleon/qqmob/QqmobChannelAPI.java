package prj.chameleon.qqmob;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;

import com.tencent.tauth.IUiListener;
import com.tencent.tauth.Tencent;
import com.tencent.tauth.UiError;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IChannelPayAPI;
import prj.chameleon.channelapi.IChannelUserAPI;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public class QqmobChannelAPI extends SingleSDKChannelAPI.SingleSDK {
    private Tencent mTencent;
    private String mPrivilege;
    private SharedPreferences mPreference;

    private String mPayToken;
    private String mOpenID;
    private String mPf;
    private String mPfKey;
    private long mExpireTime;
    private String mAccessToken;
    private boolean mIsInit = false;
    private boolean mIsDebug = false;
    private String mAppId;

    private JSONObject makeLoginObj() {
        String session = mTencent.getAccessToken();
        JSONObject other = new JSONObject();
        try {
            other.put("pf", mPf);
            other.put("debug", mIsDebug);
            other.put("openid", mOpenID);
            other.put("expirein", mExpireTime);
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to set json", e);
            return null;
        }
        String otherStr = other.toString();
        return JsonMaker.makeLoginResponse(session, otherStr, mChannel);
    }

    private int mapError(int errorCode) {
        switch (errorCode) {
            case 0:
                return Constants.ErrorCode.ERR_OK;
            case 1000:
                return Constants.ErrorCode.ERR_FAIL;
            case 1005:
                return Constants.ErrorCode.ERR_ILL_PARAMS;
            case 1001:
                return Constants.ErrorCode.ERR_SERVER_BUSY;
            case 1002:
                return Constants.ErrorCode.ERR_NO_LOGIN;
            default:
                return Constants.ErrorCode.ERR_UNKNOWN;
        }
    }

    private int handleLoginRet(JSONObject obj) {
        try {
            int ret = obj.getInt("ret");
            if (ret != 0) {
                return mapError(ret);
            }
            // use last login, if there is no detail info, must be failed or
            // the old session is granted
            if (mIsInit && !obj.has("openid")) {
                return mapError(ret);
            }
            mPayToken = obj.getString("pay_token");
            mPf = obj.getString("pf");
            mOpenID = obj.getString("openid");
            mPfKey = obj.getString("pfkey");
            mAccessToken = obj.getString("access_token");
            mExpireTime = obj.getLong("expires_in")*1000 + System.currentTimeMillis();
            SharedPreferences.Editor editor = mPreference.edit();
            editor.putString("openid", mOpenID);
            editor.putString("token", mAccessToken);
            editor.putString("pf", mPf);
            editor.putString("pfkey", mPfKey);
            editor.putString("payToken", mPayToken);
            editor.putLong("expireTime", mExpireTime);
            editor.commit();
            return Constants.ErrorCode.ERR_OK;
        } catch (Exception e) {
            Log.e(Constants.TAG, "Fail to handle login ret", e);
            return Constants.ErrorCode.ERR_UNKNOWN;
        }
    }

    private boolean maybeInitFromLastLogin() {
        mOpenID = mPreference.getString("openid", null);
        mAccessToken = mPreference.getString("token", null);
        mPf = mPreference.getString("pf", null);
        mPfKey = mPreference.getString("pfkey", null);
        mPayToken = mPreference.getString("payToken", null);
        mExpireTime = mPreference.getLong("expireTime", 0);
        if (mOpenID == null || mAccessToken == null) {
            return false;
        } else {
            long leftTime = (mExpireTime - System.currentTimeMillis())/1000;
            if (leftTime > 0) {
                Log.e(Constants.TAG, "get token");
                mTencent.setOpenId(mOpenID);
                mTencent.setAccessToken(mAccessToken, String.valueOf(leftTime));
                return true;
            } else {
                return false;
            }
        }

    }

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mAppId = cfg.getString("appId");
        mPrivilege = cfg.getString("privilege");
    }

    @Override
    public void init(Activity activity, final IDispatcherCb cb) {

        boolean isDebug = true;
        // init kv store
        mTencent = Tencent.createInstance(mAppId, activity.getApplicationContext());
        String prefId = activity.getPackageName() + ".chameleon.qq.pref";
        mPreference = activity.getSharedPreferences(prefId, Context.MODE_PRIVATE);
        mIsInit = maybeInitFromLastLogin();
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
        mIsDebug = isDebug;
    }

    @Override
    public void charge(Activity activity,
                       String orderId,
                       String uidInGame,
                       String userNameInGame,
                       String serverId,
                       String currencyName,
                       String payInfo,
                       int rate,
                       int realPayMoney,
                       boolean allowUserChange,
                       IDispatcherCb cb) {
        throw new RuntimeException("qqmob no support charge");
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
                    int productCount,
                    int realPayMoney,
                    IDispatcherCb cb) {

    }

    @Override
    public String getId() {
        return "qqmob";
    }

    @Override
    public void login(Activity activity, final IDispatcherCb loginCallback, IAccountActionListener accountActionListener) {
        IUiListener listener = new IUiListener() {

            @Override
            public void onComplete(Object o) {
                JSONObject obj = (JSONObject)o;
                Log.e(Constants.TAG, "get message " + o.toString());
                int ret = handleLoginRet(obj);
                if (ret == Constants.ErrorCode.ERR_OK) {
                    JSONObject retObj =  makeLoginObj();
                    loginCallback.onFinished(ret, retObj);
                } else {
                    loginCallback.onFinished(ret, null);
                }
            }

            @Override
            public void onError(UiError uiError) {
                Log.e(Constants.TAG, String.format("login got %d", uiError.errorCode));
                loginCallback.onFinished(mapError(uiError.errorCode), null);
            }

            @Override
            public void onCancel() {
                loginCallback.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
            }
        };
        mTencent.login(activity, mPrivilege, listener);
    }

    @Override
    public void logout(Activity activity) {
        mTencent.logout(activity);
    }


    @Override
    public String getUid() {
        return mOpenID;
    }

    @Override
    public String getToken() {
        return mAccessToken;
    }

    @Override
    public boolean isLogined() {
        return mTencent.isSessionValid();
    }


    @Override
    public JSONObject getPayInfo() {
        try {
            JSONObject obj = new JSONObject();
            obj.put("p", mPf);
            obj.put("pk", mPfKey);
            obj.put("t", mAccessToken);
            obj.put("pt",mPayToken);
            if (mIsDebug) {
                obj.put("d", 1);
            }
            return obj;
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to compose json", e);
            return null;
        }
    }

    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        mTencent = null;
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
    }
}
