package prj.chameleon.qqmsdk;

import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.RemoteException;
import android.util.Log;
import android.widget.Toast;

import com.tencent.msdk.WeGame;
import com.tencent.msdk.api.LoginRet;
import com.tencent.msdk.api.MsdkBaseInfo;
import com.tencent.msdk.api.ShareRet;
import com.tencent.msdk.api.TokenRet;
import com.tencent.msdk.api.WGPlatform;
import com.tencent.msdk.api.WGPlatformObserver;
import com.tencent.msdk.api.WGQZonePermissions;
import com.tencent.msdk.api.WakeupRet;
import com.tencent.msdk.consts.CallbackFlag;
import com.tencent.msdk.consts.EPlatform;
import com.tencent.msdk.consts.TokenType;
import com.tencent.msdk.remote.api.RelationRet;
import com.tencent.unipay.plugsdk.IUnipayServiceCallBack;
import com.tencent.unipay.plugsdk.UnipayPlugAPI;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.lang.ref.WeakReference;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class QqmsdkChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class Config {
        public String mQQAppId;
        public String mQQAppKey;

        public String mWXAppId;
        public String mWXAppKey;

        public String mOfferId;

        public String mMoneyIconFile;
    }

    private static class PaymentEnv {
        public PaymentEnv (Activity activity, IDispatcherCb cb) {
            mActivity = new WeakReference<Activity>(activity);
            mCb = cb;
        }
        public WeakReference<Activity> mActivity;
        public IDispatcherCb mCb;
    }

    private static class UserInfo {
        public boolean mIsLogined;
        public String mAccessToken;
        public String mPayToken;
        public String mRefreshToken;
        public String mOpenId;
        public String mDesc;
        public String mPf;
        public String mPfKey;
        public EPlatform mPlatform;
        public long mAccessTokenExpire;
        public long mRefrehTokenExpire;

        public UserInfo() {
            mIsLogined = false;
        }

        public void setLogout() {
            mIsLogined = false;
            mAccessToken = "";
            mPayToken = "";
            mRefreshToken = "";
            mOpenId = "";
            mDesc = "";
            mPf = "";
            mPfKey = "";
            mAccessTokenExpire = 0;
            mRefrehTokenExpire = 0;
            mPlatform = EPlatform.ePlatform_None;
        }
    }

    private static final String WX_PLATFORM = "w";
    private static final String QQ_PLATFORM = "q";
    private IAccountActionListener mAccountActionListener;
    private final Config mCfg = new Config();
    private boolean mCfgLandScape;
    private boolean mIsDebug;
    private int mPlatform = WeGame.QQPLATID;
    private final UserInfo mUserInfo = new UserInfo();
    private UnipayPlugAPI mUniPay = null;
    private IDispatcherCb mLoginCb = null;
    private PaymentEnv mPayEnv = null;
    private byte[] mMoneyIcon = null;
    private final WGPlatformObserver mObserver = new WGPlatformObserver() {
        @Override
        public void OnLoginNotify(LoginRet loginRet) {
            if (mLoginCb == null) {
                return;
            }
            switch (loginRet.flag) {
                case CallbackFlag.eFlag_Succ:
                    FillUserInfo(loginRet);
                    String platform = null;
                    if (loginRet.flag == WeGame.QQPLATID) {
                        platform = QQ_PLATFORM;
                    } else if (loginRet.flag == WeGame.WXPLATID) {
                        platform = WX_PLATFORM;
                    }
                    try {
                        mLoginCb.onFinished(Constants.ErrorCode.ERR_OK,
                                makeLoginInfo(mUserInfo.mOpenId, mUserInfo.mAccessToken, platform));
                    } catch (JSONException e) {
                        mLoginCb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                    }
                    break;
                case CallbackFlag.eFlag_WX_UserCancel:
                case CallbackFlag.eFlag_QQ_UserCancel:
                    mLoginCb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                    break;
                case CallbackFlag.eFlag_QQ_NotInstall:
                    mLoginCb.onFinished(Constants.ErrorCode.ERR_LOGIN_IN_QQ_NON_INSTALLED, null);
                    break;
                case CallbackFlag.eFlag_WX_NotInstall:
                    mLoginCb.onFinished(Constants.ErrorCode.ERR_LOGIN_IN_WX_NON_INSTALLED, null);
                    break;
                case CallbackFlag.eFlag_WX_NotSupportApi:
                case CallbackFlag.eFlag_WX_LoginFail:
                case CallbackFlag.eFlag_QQ_NotSupportApi:
                case CallbackFlag.eFlag_QQ_LoginFail:
                case CallbackFlag.eFlag_Local_Invalid:
                    mLoginCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                    break;
                default:
                    mLoginCb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
                    break;
            }
            if (loginRet.flag != CallbackFlag.eFlag_Succ) {
                Log.e(Constants.TAG, "Fail to login " + loginRet.flag + loginRet.desc);
            }
            mLoginCb = null;
        }

        @Override
        public void OnShareNotify(ShareRet shareRet) {

        }

        @Override
        public void OnWakeupNotify(WakeupRet wakeupRet) {

        }

        @Override
        public void OnRelationNotify(RelationRet relationRet) {

        }

        @Override
        public void OnLocationNotify(RelationRet relationRet) {

        }

        @Override
        public void OnFeedbackNotify(int i, String s) {

        }

        @Override
        public String OnCrashExtMessageNotify() {
            return null;
        }
    };

    //回调接口
    IUnipayServiceCallBack.Stub mUnipayStubCallBack = new IUnipayServiceCallBack.Stub() {
        @Override
        public void UnipayNeedLogin() throws RemoteException {
            if (mPayEnv == null) {
                Log.e(Constants.TAG, "pay callback is null");
                return;
            }
            Activity activity = mPayEnv.mActivity.get();
            if (activity == null) {
                Log.e(Constants.TAG, "callback activity is gone");
                mPayEnv = null;
                return;
            }
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    mPayEnv.mCb.onFinished(Constants.ErrorCode.ERR_PAY_SESSION_INVALID, null);
                    mPayEnv = null;
                }
            });
        }

        @Override
        public void UnipayCallBack(final int code, int payChannel, final int payState,
                                   int providerState, int saveNum,
                                   String resultMsg, String extendInfo) throws RemoteException {
            if (mPayEnv == null) {
                Log.e(Constants.TAG, "pay callback is null");
                return;
            }
            Log.d(Constants.TAG, "receive code: " + code + " msg: " + resultMsg);
            Activity activity = mPayEnv.mActivity.get();
            if (activity == null) {
                Log.e(Constants.TAG, "callback activity is gone");
                mPayEnv = null;
                return;
            }
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    switch (code) {
                        case 0:
                            if (payState == 0) {
                                mPayEnv.mCb.onFinished(Constants.ErrorCode.ERR_PAY_RETRY, null);
                            } else if (payState == 1) {
                                mPayEnv.mCb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                            } else if (payState == 2) {
                                mPayEnv.mCb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                            } else {
                                mPayEnv.mCb.onFinished(Constants.ErrorCode.ERR_PAY_UNKNOWN, null);
                            }
                            break;
                        case -2:
                            Log.e(Constants.TAG, "binding error");
                            mPayEnv.mCb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                            break;
                        case 2:
                            mPayEnv.mCb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                            break;
                        default:
                            mPayEnv.mCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);

                    }
                    mPayEnv = null;
                }
            });
        }
    };



    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfgLandScape = commCfg.mIsLandscape;
        mChannel = commCfg.mChannel;
        mIsDebug = commCfg.mIsDebug;
        mCfg.mQQAppId = cfg.getString("qqAppId");
        mCfg.mQQAppKey = cfg.getString("qqAppKey");
        mCfg.mWXAppId = cfg.getString("wxAppId");
        mCfg.mWXAppKey = cfg.getString("wxAppKey");
        mCfg.mOfferId = cfg.getString("qqAppId");
        mCfg.mMoneyIconFile = cfg.getString("moneyIcon");
    }

   /**
     * init the SDK
     * @param activity the activity to give the real SDK
     * @param cb callback function when the request is finished, the JSON object is null
     */
    @Override
    public void init(android.app.Activity activity,
		             final IDispatcherCb cb) {
        MsdkBaseInfo baseInfo = new MsdkBaseInfo();
        if (mCfg.mQQAppId != null) {
            baseInfo.qqAppId = mCfg.mQQAppId;
            baseInfo.qqAppKey = mCfg.mQQAppKey;
        }
        if (mCfg.mWXAppId != null) {
            baseInfo.wxAppId = mCfg.mWXAppId;
            baseInfo.wxAppKey = mCfg.mWXAppKey;
        }
        baseInfo.offerId = mCfg.mOfferId;
        WGPlatform.Initialized(activity, baseInfo);
        WGPlatform.WGSetPermission(WGQZonePermissions.eOPEN_ALL); // 设置拉起QQ时候需要用户授权的项
        WGPlatform.WGSetObserver(mObserver);
        WGPlatform.handleCallback(activity.getIntent()); // 接收平台回调

        try {
            InputStream is = activity.getAssets().open(mCfg.mMoneyIconFile);
            mMoneyIcon = new byte[is.available()];
            is.read(mMoneyIcon);
            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
        } catch (IOException e) {
            Log.e(Constants.TAG, "Fail to open money cfg");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
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
        setAccountActionListener(accountActionListener);
        mUserInfo.setLogout();
        LoginRet lr = new LoginRet();
        int platform = WGPlatform.WGGetLoginRecord(lr);
        if (platform != 0 && lr.flag == CallbackFlag.eFlag_Succ) {
            mPlatform = platform;
            try {
                if (platform == WeGame.QQPLATID) {
                    JSONObject loginInfo = onLocalQQLoginRecord(lr);
                    cb.onFinished(Constants.ErrorCode.ERR_OK, loginInfo);
                    return;
                } else if (platform == WeGame.WXPLATID) {
                    JSONObject loginInfo = onLocalWXLoginRecord(lr);
                    cb.onFinished(Constants.ErrorCode.ERR_OK, loginInfo);
                    return;
                }
            } catch (Exception e) {
                cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                return;
            }
        }
        if (mPlatform == WeGame.QQPLATID) {
            WGPlatform.WGLogin(EPlatform.ePlatform_QQ);
            mLoginCb = cb;
        } else if (mPlatform == WeGame.WXPLATID) {
            WGPlatform.WGLogin(EPlatform.ePlatform_Weixin);
            mLoginCb = cb;
        } else {
            throw new RuntimeException("unknown platform type " + mPlatform);
        }
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
        if (mPayEnv != null) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
            return;
        }
        if (!mUserInfo.mIsLogined) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_SESSION_INVALID, null);
            return;
        }
        try  {
            JSONObject payInfoObj = new JSONObject(payInfo);
            int rest = payInfoObj.getInt("rest");
            if (rest < 0) {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            } else {
                CharSequence text = "游戏币余额不足，请先充值游戏币";
                Toast toast = Toast.makeText(activity.getApplicationContext(), text, Toast.LENGTH_SHORT);
                toast.show();
                mUniPay.SaveGameCoinsWithNum(mUserInfo.mOpenId, mUserInfo.mPayToken,
                        "openid", "kp_actoken", serverId, mUserInfo.mPf,
                        mUserInfo.mPfKey, UnipayPlugAPI.ACCOUNT_TYPE_COMMON,
                        String.valueOf(rest), allowUserChange,
                        mMoneyIcon);
                mPayEnv = new PaymentEnv(activity, cb);
            }
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to parse pay info from server", e);
            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
        } catch (RemoteException e) {
            Log.e(Constants.TAG, "remote error", e);
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
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
        if (mPayEnv != null) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
            return;
        }
        if (!mUserInfo.mIsLogined) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_SESSION_INVALID, null);
            return;
        }
        try  {
            JSONObject payInfoObj = new JSONObject(payInfo);
            int rest = payInfoObj.getInt("rest");
            if (rest < 0) {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            } else {
                CharSequence text = "游戏币余额不足，请先充值游戏币";
                Toast toast = Toast.makeText(activity.getApplicationContext(), text, Toast.LENGTH_SHORT);
                toast.show();
                mUniPay.SaveGameCoinsWithNum(mUserInfo.mOpenId, mUserInfo.mPayToken,
                        "openid", "kp_actoken", serverId, mUserInfo.mPf,
                        mUserInfo.mPfKey, UnipayPlugAPI.ACCOUNT_TYPE_COMMON,
                        String.valueOf(rest), true,
                        mMoneyIcon);
                mPayEnv = new PaymentEnv(activity, cb);
            }
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to parse pay info from server", e);
            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
        } catch (RemoteException e) {
            Log.e(Constants.TAG, "remote error", e);
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
    }

    @Override
    public JSONObject getPayInfo() {
        if (!mUserInfo.mIsLogined) {
            return null;
        }
        try {
            JSONObject ret = new JSONObject();
            ret.put("p", mUserInfo.mPf);
            ret.put("pk", mUserInfo.mPfKey);
            ret.put("t", mUserInfo.mAccessToken);
            ret.put("pt", mUserInfo.mPayToken);
            return ret;
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to get pay info from msdk", e);
            return null;
        }
    }

    @Override
    public String getId() {
        return "qqmsdk";
    }


    /**
     * user logout
     * @param activity the activity to give the real SDK
     */
    @Override
    public void logout(Activity activity) {
        WGPlatform.WGLogout();
        mUserInfo.setLogout();
        if (mAccountActionListener != null) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    mAccountActionListener.onAccountLogout();
                }
            });
        }
    }


    @Override
    public String getUid() {
        return mUserInfo.mOpenId;
    }

    @Override
    public String getToken() {
        return mUserInfo.mAccessToken;
    }

    @Override
    public boolean isLogined() {
        return mUserInfo.mIsLogined;
    }

    @Override
    public void onNewIntent(Activity activity, Intent intent) {
        WGPlatform.handleCallback(intent);
    }

    @Override
    public void onDestroy(Activity activity) {
        WGPlatform.onDestory(activity);
        mMoneyIcon = null;
        mLoginCb = null;
        mPayEnv = null;
    }

    /**
     * destroy the sdk instance
     * @param activity the activity to give the real SDK
     */
    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    /**
     * map qq code to sdk erros
     * @param code nd91 error code
     * @return the error code
     */
    private int mapError(int code) {
        return Constants.ErrorCode.ERR_UNKNOWN;
    }

    /**
     * set account action listener, add global nd91 listener
     * @param accountActionListener account action
     */
    private void setAccountActionListener(final IAccountActionListener accountActionListener) {
        this.mAccountActionListener = accountActionListener;
    }

    private JSONObject onLocalQQLoginRecord(LoginRet ret) throws JSONException {
        FillUserInfo(ret);
        mUserInfo.mAccessToken = WeGame.getInstance().getLocalTokenByType(TokenType.eToken_QQ_Access);
        mUserInfo.mPayToken = WeGame.getInstance().getLocalTokenByType(TokenType.eToken_QQ_Pay);
        return makeLoginInfo(mUserInfo.mOpenId, mUserInfo.mAccessToken, QQ_PLATFORM);
    }

    private JSONObject onLocalWXLoginRecord(LoginRet ret) throws JSONException {
        FillUserInfo(ret);
        mUserInfo.mAccessToken = WeGame.getInstance().getLocalTokenByType(TokenType.eToken_WX_Access);
        mUserInfo.mRefreshToken = WeGame.getInstance().getLocalTokenByType(TokenType.eToken_WX_Refresh);
        mUserInfo.mPayToken = "";
        return makeLoginInfo(mUserInfo.mOpenId, mUserInfo.mAccessToken, WX_PLATFORM);
    }

    private JSONObject makeLoginInfo(String openId, String openKey, String platform) throws JSONException {
        JSONObject obj = new JSONObject();
        obj.put("uid", openId);
        obj.put("pl", platform);
        return JsonMaker.makeLoginResponse(openKey, obj.toString(), mChannel);
    }

    private void FillUserInfo(LoginRet ret) {
        mUserInfo.mOpenId = ret.open_id;
        mUserInfo.mDesc = ret.desc;
        mUserInfo.mPf = ret.pf;
        mUserInfo.mPfKey = ret.pf_key;
        if (ret.platform == WeGame.QQPLATID) {
            mUserInfo.mPlatform = EPlatform.ePlatform_QQ;
            for (TokenRet tr: ret.token) {
                switch (tr.type) {
                    case TokenType.eToken_QQ_Access:
                        mUserInfo.mAccessToken = tr.value;
                        mUserInfo.mAccessTokenExpire = tr.expiration;
                        break;
                    case TokenType.eToken_QQ_Pay:
                        mUserInfo.mPayToken = tr.value;
                        mUserInfo.mRefrehTokenExpire = tr.expiration;
                        break;
                }
            }
        } else if (ret.platform == WeGame.WXPLATID) {
            mUserInfo.mPlatform = EPlatform.ePlatform_Weixin;
            for (TokenRet tr: ret.token) {
                switch (tr.type) {
                    case TokenType.eToken_WX_Access:
                        mUserInfo.mAccessToken = tr.value;
                        mUserInfo.mAccessTokenExpire = tr.expiration;
                        break;
                    case TokenType.eToken_WX_Refresh:
                        mUserInfo.mRefreshToken = tr.value;
                        mUserInfo.mRefrehTokenExpire = tr.expiration;
                        break;
                }
            }
        } else {
            throw new RuntimeException("unknown platform " + ret.platform);
        }
    }


    @Override
    public boolean onLoginRsp(String loginRsp) {
        JSONObject obj = null;
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
    public void onResume(Activity activity, final IDispatcherCb cb) {
        WGPlatform.onResume();
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void onPause(Activity activity) {
        WGPlatform.onPause();
    }


    @Override
    public void onStart(Activity activity) {
        mUniPay = new UnipayPlugAPI(activity);
        mUniPay.setCallBack(mUnipayStubCallBack);
        mUniPay.bindUnipayService();
        mUniPay.setOfferId(mCfg.mQQAppId);
        if (mIsDebug) {
            mUniPay.setEnv("test");
        } else {
            mUniPay.setEnv("release");
        }
    }

    @Override
    public void onStop(Activity activity) {
        mUniPay.unbindUnipayService();
        mUniPay = null;
    }

}

