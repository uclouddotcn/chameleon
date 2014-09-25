package prj.chameleon.oppo;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.util.Log;

import com.nearme.gamecenter.open.api.ApiCallback;
import com.nearme.gamecenter.open.api.FixedPayInfo;
import com.nearme.gamecenter.open.api.GameCenterSDK;
import com.nearme.gamecenter.open.api.GameCenterSettings;
import com.nearme.gamecenter.open.api.RatePayInfo;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class OppoChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class OAuthToken {
        public String mToken;
        public String mSecret;
        public OAuthToken(String token, String secret) {
            mToken = token;
            mSecret = secret;
        }
    }

    private IAccountActionListener mAccountActionListener;
    private boolean mIsDebug = false;
    private String mAppKey;
    private String mAppSecret;
    private String mCallbackUrl;
    private String mGameId;
    private String mUid = "";
    private boolean mAllowSwitchAccount;
    private boolean mIsLandscape;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mIsLandscape = cfg.getBoolean("landscape");
        mGameId = cfg.getString("gameId");
        mAppKey = cfg.getString("appKey");
        mAppSecret = cfg.getString("appSecret");
        mCallbackUrl = cfg.getString("payCallback");
        mAllowSwitchAccount = cfg.getBoolean("allowSwitchAccount");
        mChannel = commCfg.mChannel;
        mIsDebug = commCfg.mIsDebug;
    }

    /**
     * init the SDK
     *
     * @param activity the activity to give the real SDK
     * @param cb       callback function when the request is finished, the JSON object is null
     */
    @Override
    public void init(android.app.Activity activity,
                     final IDispatcherCb cb) {
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }


    @Override
    public void onApplicationEvent(int event, Object... arguments) {
        if (event == Constants.ApplicationEvent.AFTER_ON_CREATE) {
            Application app = (Application)arguments[0];
            GameCenterSettings gameCenterSettings = new GameCenterSettings(
                    mAppKey, mAppSecret) {

                @Override
                public void onForceReLogin() {
                    if (mAccountActionListener != null) {
                        mAccountActionListener.onAccountLogout();
                    }
                }

                @Override
                public void onForceUpgradeCancel() {
                    Log.i(Constants.TAG, "User cancel force update, exit the app");
                    System.exit(0);
                }
            };
            GameCenterSettings.isDebugModel = mIsDebug;// 测试log开关
            GameCenterSettings.isOritationPort = mIsLandscape;// 控制SDK activity的横竖屏 true为竖屏
            GameCenterSettings.proInnerSwitcher = mAllowSwitchAccount;//是否支持游戏内切换账号
            GameCenterSDK.init(gameCenterSettings, app.getApplicationContext());
        }
    }

    /**
     * user login to platform
     *
     * @param activity              the activity to give the real SDK
     * @param cb                    JSON object will have two fields
     *                              token : the access token from the platform
     *                              others: a segment of json string for SDK server
     * @param accountActionListener listener of the user account actions, refer to the interface definition
     */
    @Override
    public void login(android.app.Activity activity,
                      final IDispatcherCb cb,
                      IAccountActionListener accountActionListener) {
        if (accountActionListener == null) {
            throw new RuntimeException("Account Action Listener must no null");
        }
        GameCenterSDK.setmCurrentContext(activity);
        GameCenterSDK.getInstance().doLogin(new ApiCallback() {
            @Override
            public void onSuccess(String content, int code) {
                Log.d(Constants.TAG, String.format("login success %s %d", content, code));
                OAuthToken token = getAuthToken();
                cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(token.mToken,
                        token.mSecret, mChannel));
            }

            @Override
            public void onFailure(String content, int code) {
                Log.d(Constants.TAG, String.format("login fails %s %d", content, code));
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
        }, activity);
        mAccountActionListener = accountActionListener;
    }

    /**
     * user charge the currency in the game
     *
     * @param activity        the activity to give the real SDK
     * @param orderId         the order id from server
     * @param uidInGame       player id in the game
     * @param userNameInGame  player name in the game
     * @param serverId        current server id
     * @param currencyName    the currency name
     * @param rate            the rate of the game currency to RMB, e.g. ￥1.0 can buy 10 game currency, then
     *                        rate = 10
     * @param realPayMoney    the real money to pay
     * @param allowUserChange can user change the amnout he paid
     * @param cb              JSON object will be null
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
        int currencyCount = realPayMoney * rate / 100;
        try {
            if (allowUserChange) {
                doRatePay(activity, orderId, currencyName, currencyCount, rate, cb);
            } else {
                doFixedPay(activity, orderId, null, currencyName, currencyCount, realPayMoney, cb);
            }
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to pay", e);
            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
        }
    }

    private void doFixedPay(Activity activity,
                            String orderId,
                            String productId,
                            String productName,
                            int productCount,
                            int realPayMoney,
                            final IDispatcherCb cb) throws JSONException {
        JSONObject attachInfo = new JSONObject();
        attachInfo.put("u", mUid);
        if (productId != null) {
            attachInfo.put("p", productId);
        }
        FixedPayInfo info = new FixedPayInfo(orderId, attachInfo.toString(), realPayMoney);
        info.setProductName(productName);
        info.setGoodsCount(productCount);
        info.setCallbackUrl(mCallbackUrl);
        GameCenterSDK.getInstance().doFixedKebiPayment(new ApiCallback() {
            @Override
            public void onSuccess(String content, int code) {
                Log.d(Constants.TAG, "pay success");
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

            @Override
            public void onFailure(String content, int code) {
                Log.d(Constants.TAG, "pay fail " + content);
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
        }, info, activity);
    }


    private void doRatePay(Activity activity,
                           String orderId,
                           String productName,
                           int defaultProductCount,
                           int rate,
                           final IDispatcherCb cb) throws JSONException {

        JSONObject attachInfo = new JSONObject();
        attachInfo.put("u", mUid);
        RatePayInfo info = new RatePayInfo(orderId, attachInfo.toString());
        info.setProductName(productName);
        info.setRate(rate);
        info.setDefaultShowCount(defaultProductCount);
        info.setCallbackUrl(mCallbackUrl);
        GameCenterSDK.getInstance().doRateKebiPayment(new ApiCallback() {
            @Override
            public void onSuccess(String content, int code) {
                Log.d(Constants.TAG, "pay success");
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

            @Override
            public void onFailure(String content, int code) {
                Log.d(Constants.TAG, "pay fail " + content);
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
        }, info, activity);
    }
    /**
     * user buy a product
     *
     * @param activity       the activity to give the real SDK
     * @param orderId        the order id from server
     * @param uidInGame      player id in the game
     * @param userNameInGame player name in the game
     * @param serverId       current server id
     * @param productName    the name of the product
     * @param productID      the id of the product
     * @param productCount   the count of product
     * @param realPayMoney   the real money to pay
     * @param cb             JSON object will be null
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
        try {
            doFixedPay(activity, orderId, productID, productName, productCount, realPayMoney, cb);
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to pay", e);
            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
        }
    }


    /**
     * user logout
     *
     * @param activity the activity to give the real SDK
     */
    @Override
    public void logout(Activity activity) {
    }

    @Override
    public boolean isSupportSwitchAccount() {
        return false;
    }

    /**
     * create the float tool bar ( required by 91, UC)
     *
     * @param activity the activity to give the real SDK
     * @param position refer to Constant.Toolbar*
     */
    @Override
    public void createToolBar(Activity activity, int position) {
    }

    private OAuthToken getAuthToken() {
        final String data = GameCenterSDK.getInstance().doGetAccessToken();
        final String oauth_token = data.split("&")[0].split("=")[1];
        final String oauth_token_secret = data.split("&")[1].split("=")[1];
        return new OAuthToken(oauth_token, oauth_token_secret);
    }

    @Override
    public void onResume(Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
        GameCenterSDK.getInstance().doShowSprite(new ApiCallback() {
            @Override
            public void onSuccess(String content, int code) {
                if (mAccountActionListener != null) {
                    mAccountActionListener.preAccountSwitch();
                    OAuthToken token = getAuthToken();
                    mAccountActionListener.afterAccountSwitch(Constants.ErrorCode.ERR_OK,
                            JsonMaker.makeLoginResponse(token.mToken, token.mSecret, mChannel));
                }
            }

            @Override
            public void onFailure(String content, int code) {
                Log.i(Constants.TAG, "user switch account fail");
            }
        }, activity);

        GameCenterSDK.getInstance().doShowGameCenter(new ApiCallback() {
            @Override
            public void onSuccess(String content, int code) {
                if (mAccountActionListener != null) {
                    mAccountActionListener.preAccountSwitch();
                    OAuthToken token = getAuthToken();
                    mAccountActionListener.afterAccountSwitch(Constants.ErrorCode.ERR_OK,
                            JsonMaker.makeLoginResponse(token.mToken, token.mSecret, mChannel));
                }
            }

            @Override
            public void onFailure(String content, int code) {
                Log.i(Constants.TAG, "user switch account fail");
            }
        }, activity);
    }

    @Override
    public void onPause(Activity activity) {
        GameCenterSDK.getInstance().doDismissSprite(activity);
    }

    /**
     * show or hide the float tool bar (required by 91, UC)
     *
     * @param activity the activity to give the real SDK
     * @param visible  true for show, false for hide
     */
    @Override
    public void showFloatBar(Activity activity, boolean visible) {
    }

    /**
     * destroy the tool bar
     *
     * @param activity the activity to give the real SDK
     */
    @Override
    public void destroyToolBar(Activity activity) {
        GameCenterSDK.getInstance().doDismissSprite(activity);
    }

    @Override
    public boolean onLoginRsp(String loginRsp) {
        JSONObject obj = null;
        try {
            obj = new JSONObject(loginRsp);
            int code = obj.getInt("code");
            if (code != Constants.ErrorCode.ERR_OK) {
                JSONObject loginInfo = obj.getJSONObject("loginInfo");
                mUid = loginInfo.getString("uid");
                return false;
            } else {
                return true;
            }
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to parse login rsp", e);
            return false;
        }
    }

    @Override
    public String getUid() {
        return mUid;
    }

    @Override
    public String getToken() {
        return GameCenterSDK.getInstance().doGetAccessToken();
    }

    @Override
    public boolean isLogined() {
        return GameCenterSDK.getInstance().doGetAccessToken().length() < 0;
    }

    /**
     * destroy the sdk instance
     *
     * @param activity the activity to give the real SDK
     */
    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
    }

    /**
     * compose login info from nd91 platform instance
     *
     * @param sid
     * @return login info JSON object
     * @throws JSONException
     */
    private JSONObject getLoginInfo(String sid) {
        String token = sid;
        return JsonMaker.makeLoginResponse(token, null, mChannel);
    }

    @Override
    public void submitPlayerInfo(Activity activity,
                                 String roleId,
                                 String roleName,
                                 String roleLevel,
                                 int zoneId,
                                 String zoneName) {
        String extendInfo = new StringBuilder()
                .append("gameId=").append(mGameId)
                .append("&service=").append(String.valueOf(zoneId))
                .append("&role=").append(roleId)
                .append("&grade=").append(roleLevel).toString();
        GameCenterSDK.getInstance().doSubmitExtendInfo(new ApiCallback() {
            @Override
            public void onSuccess(String content, int code) {

            }

            @Override
            public void onFailure(String content, int code) {

            }
        }, extendInfo, activity);
    }


    @Override
    public boolean runProtocol(Activity activity, String protocol, String message, final IDispatcherCb cb) {
        if (protocol == "oppo_doShowForum") {
            GameCenterSDK.getInstance().doShowForum(activity);
            return true;
        } else if (protocol == "oppo_doGetUserNDou") {
            GameCenterSDK.getInstance().doGetUserNDou(new ApiCallback() {
                @Override
                public void onSuccess(String content, int code) {
                    try {
                        JSONObject obj = new JSONObject(content);
                        JSONObject res = new JSONObject();
                        res.put("integralBalance", res.getString("integralBalance"));
                        cb.onFinished(Constants.ErrorCode.ERR_OK, res);
                    } catch (JSONException e) {
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                    }
                }

                @Override
                public void onFailure(String content, int code) {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }, activity);
        }
        return false;
    }

    @Override
    public boolean isSupportProtocol(String protocol) {
        if (protocol == "oppo_doShowForum") {
            return true;
        } else if (protocol == "oppo_doGetUserNDou") {
            return true;
        }
        return false;
    }
}

