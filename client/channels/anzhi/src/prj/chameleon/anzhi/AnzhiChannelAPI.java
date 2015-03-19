package prj.chameleon.anzhi;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;

import com.anzhi.usercenter.sdk.AnzhiUserCenter;
import com.anzhi.usercenter.sdk.LogoActivity;
import com.anzhi.usercenter.sdk.inter.AnzhiCallback;
import com.anzhi.usercenter.sdk.inter.InitSDKCallback;
import com.anzhi.usercenter.sdk.inter.KeybackCall;
import com.anzhi.usercenter.sdk.item.CPInfo;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class AnzhiChannelAPI extends SingleSDKChannelAPI.SingleSDK {
    private static class UserInfo {
        String mUid;
        String mSid;
        boolean mIsLogined = false;
    }
    private IAccountActionListener mAccountActionListener;
    private boolean mCfgLandScape;
    private boolean mIsDebug;
    private final UserInfo mUserInfo = new UserInfo();
    private final CPInfo mCpInfo = new CPInfo();
    private IDispatcherCb mLoginCb;
    private IDispatcherCb mPayCb;
    private final KeybackCall mKeybackCb = new KeybackCall() {
        @Override
        public void KeybackCall(String s) {
            if (s == null){
                return;
            }

            if (s.equals("gamePay")) {
                if (mPayCb != null) {
                    mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                    mPayCb = null;
                }
            }
        }
    };
    private final AnzhiCallback mEventCb = new AnzhiCallback() {
        @Override
        public void onCallback(CPInfo cpInfo, String s) {
            Log.d(Constants.TAG, s);
            try {
                JSONObject json = new JSONObject(s);
                String key = json.optString("callback_key");

                if (key.equals("key_pay")) {
                    onPay(json);
                } else if (key.equals("key_login")) {
                    onLogin(json);
                } else if (key.equals("key_logout")) {
                    onLogout(json);
                } else {
                    Log.e(Constants.TAG, "unknown callback key " + key);
                }
            } catch (JSONException e) {
                Log.e(Constants.TAG, "Fail to handle anzhi callback", e);
            }
        }

        private void onLogin(JSONObject obj) {
            if (mLoginCb == null) {
                return;
            }
            int code = obj.optInt("code");
            mUserInfo.mUid = obj.optString("uid");
            mUserInfo.mSid = obj.optString("sid");
            if (code == 200) {
                JSONObject ret = JsonMaker.makeLoginResponse(mUserInfo.mSid, mUserInfo.mUid, mChannel);
                mLoginCb.onFinished(Constants.ErrorCode.ERR_OK, ret);
            } else {
                mLoginCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
            mLoginCb = null;
        }

        private void onPay(JSONObject obj) {
            Log.d(Constants.TAG, "receive on pay " + obj.toString());
            if (mPayCb == null) {
                return;
            }
            int code = obj.optInt("code");
            if (code == 200 || code == 201) {
                mPayCb.onFinished(Constants.ErrorCode.ERR_OK, null);
            } else {
                mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
            }
        }

        private void onLogout(JSONObject obj) {
            if (mAccountActionListener != null) {
                mAccountActionListener.onAccountLogout();
            }
        }
    };

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfgLandScape = commCfg.mIsLandscape;
        mChannel = commCfg.mChannel;
        mIsDebug = commCfg.mIsDebug;
        mCpInfo.setAppKey(cfg.getString("appKey"));
        mCpInfo.setSecret(cfg.getString("appSecret"));
        mCpInfo.setChannel("Anzhi");
        mCpInfo.setGameName(commCfg.mAppName);
    }



    /**
     * init the SDK
     * @param activity the activity to give the real SDK
     * @param cb callback function when the request is finished, the JSON object is null
     */
    @Override
    public void init(final android.app.Activity activity,
                     final IDispatcherCb cb) {
        if (mIsDebug) {
            AnzhiUserCenter.getInstance().setOpendTestLog(mIsDebug);
            AnzhiUserCenter.isOpendTestLog = true;
        }
        AnzhiUserCenter.getInstance().setCPInfo(mCpInfo);
        AnzhiUserCenter.getInstance().setCallback(mEventCb);
        AnzhiUserCenter.getInstance().setKeybackCall(mKeybackCb);
        InitSDKCallback iniCb = new InitSDKCallback(){
            public void ininSdkCallcack(){
                AnzhiUserCenter.getInstance().login(activity, true);
            }
        };
        AnzhiUserCenter.getInstance().azinitSDK(activity,mCpInfo, iniCb);
        if (mCfgLandScape) {
            AnzhiUserCenter.getInstance().setActivityOrientation(0);
        } else {
            AnzhiUserCenter.getInstance().setActivityOrientation(1);
        }
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }
    /**
     * user login to platform
     * @param activity the activity to give the real SDK
     * @param cb JSON object will have two fields
     *           token : the access token from the platform
     *           others: a segment of json string for SDK server
     * @param accountActionListener listener of the user account actions, refer to the interface definition
     */
    @Override
    public void login(android.app.Activity activity,
                      final IDispatcherCb cb,
                      IAccountActionListener accountActionListener) {
        if (mLoginCb != null) {
            cb.onFinished(Constants.ErrorCode.ERR_LOGIN_IN_PROGRESS, null);
            return;
        }
        AnzhiUserCenter.getInstance().login(activity, true);
        mLoginCb = cb;
        mAccountActionListener = accountActionListener;
    }

    /**
     * user charge the currency in the game
     * @param activity the activity to give the real SDK
     * @param orderId the order id from server
     * @param uidInGame player id in the game
     * @param userNameInGame  player name in the game
     * @param serverId  current server id
     * @param currencyName the currency name
     * @param rate the rate of the game currency to RMB, e.g. ￥1.0 can buy 10 game currency, then
     *             rate = 10
     * @param realPayMoney the real money to pay
     * @param allowUserChange can user change the amnout he paid
     * @param cb JSON object will be null
     */
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
                       final IDispatcherCb cb) {
        if (!mUserInfo.mIsLogined) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_SESSION_INVALID, null);
            return;
        }
        if (mPayCb != null) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
            return;
        }
        float money = ((float)realPayMoney)/100.0f;
        if (allowUserChange) {
            money = 0.0f;
        }
        try {
            AnzhiUserCenter.getInstance().pay(activity, 0, money, currencyName, makePayCb(orderId));
            mPayCb = cb;
        } catch (Exception e) {
            Log.e(Constants.TAG, "Fail to compose pay request", e);
            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
        }
    }

    /**
     *  user buy a product
     * @param activity the activity to give the real SDK
     * @param orderId the order id from server
     * @param uidInGame player id in the game
     * @param userNameInGame player name in the game
     * @param serverId  current server id
     * @param productName the name of the product
     * @param productID the id of the product
     * @param productCount the count of product
     * @param realPayMoney the real money to pay
     * @param cb JSON object will be null
     */
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
                    final IDispatcherCb cb) {
        if (!mUserInfo.mIsLogined) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_SESSION_INVALID, null);
            return;
        }
        if (mPayCb != null) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
            return;
        }
        float money = ((float) realPayMoney) / 100.0f;
        try {
            AnzhiUserCenter.getInstance().pay(activity, 0, money, productName, makePayCb(orderId));
            mPayCb = cb;
        } catch (Exception e) {
            Log.e(Constants.TAG, "Fail to compose pay request", e);
            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
        }
    }

    private String makePayCb(String orderId) throws JSONException {
        return orderId;
    }

    @Override
    public String getId() {
        return "anzhi";
    }


    /**
     * user logout
     * @param activity the activity to give the real SDK
     */
    @Override
    public void logout(Activity activity) {
        AnzhiUserCenter.getInstance().logout(activity);
    }


    @Override
    public String getUid() {
        return mUserInfo.mUid;
    }

    @Override
    public String getToken() {
        return mUserInfo.mSid;
    }

    @Override
    public boolean isLogined() {
        return mUserInfo.mIsLogined;
    }

    /**
     * destroy the sdk instance
     * @param activity the activity to give the real SDK
     */
    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        cb.onFinished(Constants.ErrorCode.ERR_LOGIN_GAME_EXIT_NOCARE, null);
    }

    @Override
    public boolean onLoginRsp(String loginRsp) {
        JSONObject obj;
        try {
            obj = new JSONObject(loginRsp);
            int code = obj.getInt("code");
            if (code != Constants.ErrorCode.ERR_OK) {
                return false;
            } else {
                mUserInfo.mIsLogined = true;
                return true;
            }
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to parse login rsp", e);
            return false;
        }
    }

    @Override
    public void showFloatBar(Activity activity, boolean visible) {
        if (visible) {
            AnzhiUserCenter.getInstance().showFloaticon();
        } else {
            AnzhiUserCenter.getInstance().dismissFloaticon();
        }
    }

    @Override
    public void destroyToolBar(Activity activity) {
        AnzhiUserCenter.getInstance().gameOver(activity);
    }

    @Override
    public void onDestroy(Activity activity) {
        AnzhiUserCenter.getInstance().gameOver(activity);
        mLoginCb = null;
        mPayCb = null;
    }

    @Override
    public void onResume(Activity activity, final IDispatcherCb cb) {
        if (mPayCb != null) {
            mPayCb = null;
        }
        super.onResume(activity, cb);
    }

}

