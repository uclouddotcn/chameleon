package prj.chameleon.nd91;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.nd.commplatform.NdPageCallbackListener;
import com.nd.commplatform.entry.NdAppInfo;
import com.nd.commplatform.entry.NdBuyInfo;
import com.nd.commplatform.gc.widget.NdToolBar;
import com.nd.commplatform.gc.widget.NdToolBarPlace;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IChannelPayAPI;
import prj.chameleon.channelapi.IChannelUserAPI;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

import com.nd.commplatform.NdCommplatform;
import com.nd.commplatform.NdErrorCode;
import com.nd.commplatform.NdMiscCallbackListener;
import com.nd.commplatform.NdPageCallbackListener.OnExitCompleteListener;
import com.nd.commplatform.OnInitCompleteListener;
import com.nd.commplatform.entry.NdLoginStatus;

import org.json.JSONException;
import org.json.JSONObject;


public final class Nd91ChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class PlatformBackgroundListener implements  NdMiscCallbackListener.OnPlatformBackground {
        private Runnable mCb;

        void setNextCallback(Runnable cb) {
            mCb = cb;
        }

        @Override
        public void onPlatformBackground() {
            if (mCb != null) {
                mCb.run();
                mCb = null;
            }
        }
    }
    private IAccountActionListener mAccountActionListener;
    private NdToolBar mToolbar;
    private PlatformBackgroundListener mBackgroundListener = new PlatformBackgroundListener();
    private boolean mCfgLandScape;
    private long mCfgAppID;
    private boolean mIsForceUpdate;
    private String mCfgAppKey;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfgLandScape = commCfg.mIsLandscape;
        mIsForceUpdate  = cfg.getBoolean("forceUpdate");
        mCfgAppID = cfg.getLong("appId");
        mCfgAppKey = cfg.getString("appKey");
    }

   /**
     * init the SDK
     * @param activity the activity to give the real SDK
     * @param cb callback function when the request is finished, the JSON object is null
     */
    @Override
    public void init(android.app.Activity activity,
		             final IDispatcherCb cb) {
        String pkgName =  activity.getPackageName();
        int rsid = activity.getResources().getIdentifier("nd3_frame", "layout", pkgName);
        Log.d(Constants.TAG, String.format("get pkg name %s and %d", pkgName, rsid));
        /*
        // set debug mode
        if (isDebug) {
            NdCommplatform.getInstance().ndSetDebugMode(0);
        }
        */
        OnInitCompleteListener listener = new OnInitCompleteListener(){
            @Override
            protected void onComplete(int ndFlag) {
                switch (ndFlag) {
                case OnInitCompleteListener.FLAG_NORMAL:
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    break;
                case OnInitCompleteListener.FLAG_FORCE_CLOSE:
                default:
                    Log.e(Constants.TAG, "91 platform force the app to close");
                    break;
                }
                // for generic, do not restart when switch account
                NdCommplatform.getInstance().setRestartWhenSwitchAccount(false);
                // set screen orientation
                if (mCfgLandScape) {
                    NdCommplatform.getInstance().ndSetScreenOrientation(NdCommplatform.SCREEN_ORIENTATION_LANDSCAPE);
                } else {
                    NdCommplatform.getInstance().ndSetScreenOrientation(NdCommplatform.SCREEN_ORIENTATION_PORTRAIT);
                }
                // set background listener
                NdCommplatform.getInstance().setOnPlatformBackground(mBackgroundListener);
            }
        };

        NdAppInfo appInfo = new NdAppInfo();
        appInfo.setAppId((int) mCfgAppID);
        //应用ID
        appInfo.setAppKey(mCfgAppKey);
        if (mIsForceUpdate) {
            appInfo.setNdVersionCheckStatus(NdAppInfo.ND_VERSION_CHECK_LEVEL_STRICT);
        } else {
            appInfo.setNdVersionCheckStatus(NdAppInfo.ND_VERSION_CHECK_LEVEL_NORMAL);
        }
        appInfo.setCtx(activity);
        int d = NdCommplatform.getInstance().ndInit(activity, appInfo,
                listener);
        Log.d(Constants.TAG, "nd91 init get " + String.valueOf(d));
        if (d != NdErrorCode.ND_COM_PLATFORM_SUCCESS) {
            cb.onFinished(Constants.ErrorCode.ERR_ILL_PARAMS, null);
        }
    }

    /**
     * login as a guest
     * @param activity the activity to give the real SDK
     * @param loginCallback callback when login guest if finished ,JSON object will have one or three fields
     *                      guest : if this is non-zero, then the user login as a guest, following two
     *                              fields will not exists
     *                      token : the access token from the platform
     *                      others: a segment of json string for SDK server
     * @param accountActionListener callback when the real uin is bind latter, the params is as the json
     *                              object in login request
     */
    @Override
    public void loginGuest(android.app.Activity activity,
                           final IDispatcherCb loginCallback,
                           IAccountActionListener accountActionListener){
        NdCommplatform.getInstance().ndLoginEx(activity, new NdMiscCallbackListener.OnLoginProcessListener() {

            @Override
            public void finishLoginProcess(int code) {
                Log.d(Constants.TAG, "login as guest function receives code " + Integer.valueOf(code));
                if (code == NdErrorCode.ND_COM_PLATFORM_SUCCESS) {
                    if (NdCommplatform.getInstance().ndGetLoginStatus() == NdLoginStatus.GuestLogin) {
                        loginCallback.onFinished(Constants.ErrorCode.ERR_OK,
                                                 JsonMaker.makeLoginGuestResponse(true, null));
                    } else {
                        try{
                            loginCallback.onFinished(Constants.ErrorCode.ERR_OK,
                                    JsonMaker.makeLoginGuestResponse(false, getLoginInfo()));
                        } catch (JSONException e) {
                            loginCallback.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                        }

                    }
                } else {
                    loginCallback.onFinished(mapError(code), null);
                }
            }
        });
        setAccountActionListener(accountActionListener);
    }


    @Override
    public boolean registGuest(Activity activity, String tips, final IDispatcherCb cb) {
        if (NdCommplatform.getInstance().ndGetLoginStatus() != NdLoginStatus.GuestLogin) {
            return false;
        }
        NdCommplatform.getInstance().ndGuestRegist(activity, tips, new NdMiscCallbackListener.OnLoginProcessListener() {

            @Override
            public void finishLoginProcess(int code) {
                try {
                    switch (code) {
                        case NdErrorCode.ND_COM_GUEST_OFFICIAL_SUCCESS:
                        case NdErrorCode.ND_COM_PLATFORM_SUCCESS:
                            cb.onFinished(Constants.ErrorCode.ERR_OK, getLoginInfo());
                            break;
                        case NdErrorCode.ND_COM_PLATFORM_ERROR_CANCEL:
                            cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                            break;
                        default:
                            cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
                    }
                } catch (JSONException e) {
                    Log.e(Constants.TAG, "fail to callback when register guest", e);
                }
            }
        });
        return true;
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
        NdCommplatform.getInstance().ndLogin(activity, new NdMiscCallbackListener.OnLoginProcessListener() {

            @Override
            public void finishLoginProcess(int code) {
                Log.d(Constants.TAG, "login function receives code " + Integer.valueOf(code));
                if (code == NdErrorCode.ND_COM_PLATFORM_SUCCESS) {
                    try {
                        cb.onFinished(Constants.ErrorCode.ERR_OK,
                                getLoginInfo());
                    } catch (JSONException e) {
                        cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                    }
                } else if (code == NdErrorCode.ND_COM_PLATFORM_ERROR_CANCEL) {
                    cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                } else {
                    cb.onFinished(mapError(code), null);
                }
            }
        });
        setAccountActionListener(accountActionListener);
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
        int needPay = realPayMoney * rate / 100;
        if (allowUserChange) {
            needPay = 0;
        }

        NdCommplatform.getInstance().ndUniPayForCoin(orderId, needPay, getNote(), activity);
        mBackgroundListener.setNextCallback(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
            }
        });
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
        NdBuyInfo buyInfo = new NdBuyInfo();
        buyInfo.setSerial(orderId);
        buyInfo.setProductName(productName);
        buyInfo.setProductId(productID);
        buyInfo.setCount(productCount);
        buyInfo.setProductOrginalPrice(((float)realPayMoney)/100);
        buyInfo.setProductPrice(((float)realPayMoney)/100);
        Log.d(Constants.TAG, String.format("buy pay money %f", ((float)realPayMoney)/100));
        buyInfo.setPayDescription(getNote());
        int error = NdCommplatform.getInstance().ndUniPay(buyInfo, activity,
                new NdMiscCallbackListener.OnPayProcessListener() {

                    @Override
                    public void finishPayProcess(int code) {
                        switch (code) {
                            case NdErrorCode.ND_COM_PLATFORM_SUCCESS:
                                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                                break;
                            case NdErrorCode.ND_COM_PLATFORM_ERROR_CANCEL:
                                cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                                break;
                            case NdErrorCode.ND_COM_PLATFORM_ERROR_PAY_FAILURE:
                                cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                                break;
                            default:
                                Log.w(Constants.TAG, String.format("fail to pay, code is %d", code));
                                cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);

                        }
                    }
                });
        if (error != 0) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    cb.onFinished(Constants.ErrorCode.ERR_ILL_PARAMS, null);
                }
            });
        }
    }

    @Override
    public String getId() {
        return "nd91";
    }


    /**
     * user logout
     * @param activity the activity to give the real SDK
     */
    @Override
    public void logout(Activity activity) {
        NdCommplatform.getInstance().ndLogout(NdCommplatform.LOGOUT_TO_RESET_AUTO_LOGIN_CONFIG, activity);
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
    public boolean isSupportSwitchAccount() {
        return true;
    }

    /**
     * for user to switch the account, to many platform it performs logout then login
     * @param activity the activity to give the real SDK
     * @param cb callback when switch done, the ret value is the same as login
     * @return boolean, wether the switch account starts
     */
    @Override
    public boolean switchAccount(Activity activity, final IDispatcherCb cb) {
        int error = NdCommplatform.getInstance().ndEnterAccountManage(activity, new NdMiscCallbackListener.OnLoginProcessListener() {

            @Override
            public void finishLoginProcess(int code) {
                try {
                    if (code == NdErrorCode.ND_COM_PLATFORM_SUCCESS) {
                        cb.onFinished(Constants.ErrorCode.ERR_OK, getLoginInfo());
                    } else if (code == NdErrorCode.ND_COM_PLATFORM_ERROR_CANCEL) {
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                    } else  {
                        Log.e(Constants.TAG, "unknown error code " + Integer.valueOf(code));
                        cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
                    }
                } catch (JSONException e) {
                    Log.e(Constants.TAG, "fail to get login info", e);
                }
            }
        });

        return error != NdErrorCode.ND_COM_PLATFORM_ERROR_HAS_NOT_LOGIN;
    }

    /**
     * create the float tool bar ( required by 91, UC)
     * @param activity the activity to give the real SDK
     * @param position refer to Constant.Toolbar*
     */
    @Override
    public void createToolBar(Activity activity, int position) {
        int realPostion = NdToolBarPlace.NdToolBarBottomLeft;
        switch (position) {
            case Constants.TOOLBAR_BOTTOM_LEFT:
                realPostion = NdToolBarPlace.NdToolBarBottomLeft;
                break;
            case Constants.TOOLBAR_BOTTOM_RIGHT:
                realPostion = NdToolBarPlace.NdToolBarBottomRight;
                break;
            case Constants.TOOLBAR_MID_LEFT:
                realPostion = NdToolBarPlace.NdToolBarLeftMid;
                break;
            case Constants.TOOLBAR_MID_RIGHT:
                realPostion = NdToolBarPlace.NdToolBarRightMid;
                break;
            case Constants.TOOLBAR_TOP_LEFT:
                realPostion = NdToolBarPlace.NdToolBarBottomLeft;
                break;
            case Constants.TOOLBAR_TOP_RIGHT:
                realPostion = NdToolBarPlace.NdToolBarBottomLeft;
                break;
        }
        mToolbar = NdToolBar.create(activity, realPostion);
        mToolbar.hide();
    }

    /**
     *  show or hide the float tool bar (required by 91, UC)
     * @param activity the activity to give the real SDK
     * @param visible true for show, false for hide
     */
    @Override
    public void showFloatBar(Activity activity, boolean visible) {
        if (mToolbar.isShown()) {
            if (!visible) {
                mToolbar.hide();
            }
        } else {
            if (visible) {
                mToolbar.show();
            }
        }
    }

    /**
     *  destroy the tool bar
     * @param activity the activity to give the real SDK
     */
    @Override
    public void destroyToolBar(Activity activity) {
        mBackgroundListener.setNextCallback(null);
        mToolbar.recycle();
    }

    /**
     *  when the app is activate from the background( refer to 91 doc, only required by 91)
     * @param activity the activity to give the real SDK
     * @param cb JSON object will be null
     */
    @Override
    public void onResume(Activity activity, final IDispatcherCb cb) {
        NdCommplatform.getInstance().ndPause(new NdPageCallbackListener.OnPauseCompleteListener(activity) {
            @Override
            public void onComplete() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
    }

    @Override
    public String getUid() {
        return NdCommplatform.getInstance().getLoginUin();
    }

    @Override
    public String getToken() {
        return NdCommplatform.getInstance().getSessionId();
    }

    @Override
    public boolean isLogined() {
        return NdCommplatform.getInstance().isLogined();
    }

    /**
     * destroy the sdk instance
     * @param activity the activity to give the real SDK
     */
    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        NdToolBar.clear();
        NdCommplatform.getInstance().ndExit(new OnExitCompleteListener(activity) {

            @Override
            public void onComplete() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
    }

    /**
     * map nd91 code to sdk erros
     * @param code nd91 error code
     * @return the error code
     */
    private int mapError(int code) {
        return Constants.ErrorCode.ERR_UNKNOWN;
    }

    /**
     * compose login info from nd91 platform instance
     * @return login info JSON object
     * @throws JSONException
     */
    private JSONObject getLoginInfo() throws JSONException {
        try {
            String uin = NdCommplatform.getInstance().getLoginUin();
            String token = NdCommplatform.getInstance().getSessionId();
            String nick = NdCommplatform.getInstance().getLoginNickName();
            JSONObject others = new JSONObject();
            others.put("uin", uin);
            others.put("nick", nick);
            return JsonMaker.makeLoginResponse(token, others.toString(), mChannel);
        } catch (JSONException e) {
            Log.e(Constants.TAG, "fail to generate login info", e);
            throw e;
        }
    }

    /**
     * set account action listener, add global nd91 listener
     * @param accountActionListener account action
     */
    private void setAccountActionListener(final IAccountActionListener accountActionListener) {
        this.mAccountActionListener = accountActionListener;
        NdCommplatform.getInstance().setOnSwitchAccountListener(
                new NdMiscCallbackListener.OnSwitchAccountListener() {

                    @Override
                    public void onSwitchAccount(int code) {

                        switch (code) {
                            // user about to switch the account
                            case NdErrorCode.ND_COM_PLATFORM_ERROR_USER_SWITCH_ACCOUNT:
                                Log.d(Constants.TAG, String.format(
                                        "user about to switch account. login status is %s, uin is %s, token is %s",
                                        NdCommplatform.getInstance().ndGetLoginStatus(),
                                        NdCommplatform.getInstance().getLoginUin(),
                                        NdCommplatform.getInstance().getSessionId()));
                                accountActionListener.preAccountSwitch();
                                break;
                            // user succeed to switch the account
                            case NdErrorCode.ND_COM_PLATFORM_SUCCESS:
                                try {
                                    Log.d(Constants.TAG, "user succeed to switch account");
                                    accountActionListener.afterAccountSwitch(Constants.ErrorCode.ERR_OK, getLoginInfo());
                                } catch (JSONException e) {
                                    Log.e(Constants.TAG, "fail to make account", e);
                                }
                                break;
                            // /user cancel the switching
                            case NdErrorCode.ND_COM_PLATFORM_ERROR_CANCEL:
                                Log.d(Constants.TAG, String.format(
                                        "user cancel switch. login status is %s, uin is %s, token is %s",
                                        NdCommplatform.getInstance().ndGetLoginStatus(),
                                        NdCommplatform.getInstance().getLoginUin(),
                                        NdCommplatform.getInstance().getSessionId()));
                                accountActionListener.afterAccountSwitch(Constants.ErrorCode.ERR_CANCEL, null);
                                break;
                            default:
                                Log.w(Constants.TAG, "unknown code " + Integer.valueOf(code));
                                accountActionListener.afterAccountSwitch(Constants.ErrorCode.ERR_UNKNOWN, null);
                        }
                    }
                });
    }

    public void enterPlatform(Activity activity, String message, IDispatcherCb cb) {
        NdCommplatform.getInstance().ndEnterPlatform(0, activity);
    }

    private String getNote() {
        return mChannel;
    }

}

