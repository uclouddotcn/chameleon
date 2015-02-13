package prj.chameleon.uc;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import cn.uc.gamesdk.IUCBindGuest;
import cn.uc.gamesdk.UCBindGuestResult;
import cn.uc.gamesdk.UCCallbackListener;
import cn.uc.gamesdk.UCCallbackListenerNullException;
import cn.uc.gamesdk.UCGameSDK;
import cn.uc.gamesdk.UCGameSDKStatusCode;
import cn.uc.gamesdk.UCLogLevel;
import cn.uc.gamesdk.UCLoginFaceType;
import cn.uc.gamesdk.UCOrientation;
import cn.uc.gamesdk.info.FeatureSwitch;
import cn.uc.gamesdk.info.GameParamInfo;
import cn.uc.gamesdk.info.OrderInfo;
import cn.uc.gamesdk.info.PaymentInfo;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class UcChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class FloatBarInfo {
        public int mDirection = 0;
        public boolean mIsCreated = false;
    }

    private static class PayStatus {
        public boolean mIsSuccess;
        public PayStatus() {
            mIsSuccess = false;
        }
    }

    private class BindGuestListener implements IUCBindGuest {
        @Override
        public UCBindGuestResult bind(String sid) {
            if (!isLoginedAsGuest) {
                UCBindGuestResult bindResult = new UCBindGuestResult();
                bindResult.setSuccess(false);
                return bindResult;
            }
            JSONObject obj = getLoginInfo(sid);
            mAccountActionListener.onGuestBind(obj);
            UCBindGuestResult bindResult = new UCBindGuestResult();
            bindResult.setSuccess(true);
            return bindResult;
        }
    }

    private class LogoutListener implements UCCallbackListener<String> {

        @Override
        public void callback(int i, String s) {
            switch (i) {
                case UCGameSDKStatusCode.NO_INIT:
                    Log.e(Constants.TAG, "must init first");
                    break;
                case UCGameSDKStatusCode.NO_LOGIN:
                    Log.e(Constants.TAG, "must login first");
                    break;
                case UCGameSDKStatusCode.SUCCESS:
                    mAccountActionListener.onAccountLogout();
                    break;
                case UCGameSDKStatusCode.FAIL:
                    Log.e(Constants.TAG, "Fail to logout");
                    break;
            }
        }
    }

    private IAccountActionListener mAccountActionListener;
    private boolean isLoginedAsGuest = false;
    private boolean mIsDebug;
    private UCOrientation mOrientation;
    private long mCpId;
    private long mGameID;
    private String mUid = "";
    private FloatBarInfo mFloatBarInfo = new FloatBarInfo();

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        boolean isLandScape = commCfg.mIsLandscape;
        if (isLandScape) {
            mOrientation = UCOrientation.LANDSCAPE;
        } else {
            mOrientation = UCOrientation.PORTRAIT;
        }
        mCpId = Long.valueOf(cfg.getString("cpId"));
        mGameID = Long.valueOf(cfg.getString("gameId"));
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

        GameParamInfo gpi = new GameParamInfo();
        gpi.setCpId((int) mCpId);
        gpi.setGameId((int) mGameID);
        gpi.setFeatureSwitch(new FeatureSwitch(true, true));
        gpi.setServerId(0);
        UCLogLevel logLevel;
        boolean isDebug = mIsDebug;
        logLevel = UCLogLevel.DEBUG;
        try {
            UCGameSDK.defaultSDK().setBindOperation(new BindGuestListener());
            UCGameSDK.defaultSDK().setOrientation(mOrientation);
            UCGameSDK.defaultSDK().setLogoutNotifyListener(new LogoutListener());
            UCGameSDK.defaultSDK().setLoginUISwitch(UCLoginFaceType.USE_WIDGET);
            UCGameSDK.defaultSDK().initSDK(activity,
                    logLevel, isDebug, gpi, new UCCallbackListener<String>() {
                        @Override
                        public void callback(int code, String msg) {
                            switch (code) {
                                case UCGameSDKStatusCode.SUCCESS:
                                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                                    break;
                                default: //初始化失败,不能进行后续操作 break;
                                    Log.e(Constants.TAG, "Fail to init uc sdk: " + msg);
                                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                    break;
                            }
                        }
                    }
            );
        } catch (Exception e) {
            Log.e(Constants.TAG, "Fail to init", e);
            cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
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
        try {
            UCGameSDK.defaultSDK().login(activity, new UCCallbackListener<String>() {

                @Override
                public void callback(int i, String s) {
                    if (i == UCGameSDKStatusCode.SUCCESS) {
                        String sid = UCGameSDK.defaultSDK().getSid();
                        if (sid.length() == 0) {
                            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        } else {
                            JSONObject loginObj = getLoginInfo(sid);
                            cb.onFinished(Constants.ErrorCode.ERR_OK, loginObj);
                        }
                    } else if (i == UCGameSDKStatusCode.LOGIN_EXIT) {
                        String sid = UCGameSDK.defaultSDK().getSid();
                        if (sid.length() == 0) {
                            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        } else {
                        }

                    } else {
                        Log.e(Constants.TAG, String.format("Fail to invoke uc login %d", i));
                    }
                }
            });
        } catch (UCCallbackListenerNullException e) {
            e.printStackTrace();
        }
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
        PaymentInfo info = new PaymentInfo();
        info.setAllowContinuousPay(false);
        if (!allowUserChange) {
            info.setAmount((float) (realPayMoney) / 100);
        }
        info.setRoleId(uidInGame);
        info.setTransactionNumCP(orderId);
        info.setCustomInfo(getCustomInfo());
        info.setServerId(0);
        final PayStatus status = new PayStatus();
        try {
            UCGameSDK.defaultSDK().pay(activity.getApplicationContext(), info, new UCCallbackListener<OrderInfo>() {
                @Override
                public void callback(int i, OrderInfo orderInfo) {
                    if (i == UCGameSDKStatusCode.SUCCESS) {
                        status.mIsSuccess = true;
                        if (orderInfo != null) {
                            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        } else {
                            Log.e(Constants.TAG, "unexpected null instance");
                            cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
                        }
                    } else if (i == UCGameSDKStatusCode.PAY_USER_EXIT ) {
                        if (!status.mIsSuccess) {
                            cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                        }
                    } else {
                        Log.d(Constants.TAG, "fail to charge " + String.valueOf(i));
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                    }
                }
            });
        } catch (UCCallbackListenerNullException e) {
            Log.e(Constants.TAG, "Fail to charge", e);
            cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
        }
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
        PaymentInfo info = new PaymentInfo();
        info.setAllowContinuousPay(false);
        info.setAmount((float) (realPayMoney) / 100);
        info.setRoleId(uidInGame);
        info.setTransactionNumCP(orderId);
        info.setCustomInfo(getCustomInfo());
        info.setServerId(0);
        final PayStatus status = new PayStatus();
        try {
            UCGameSDK.defaultSDK().pay(activity.getApplicationContext(), info, new UCCallbackListener<OrderInfo>() {
                @Override
                public void callback(int i, OrderInfo orderInfo) {
                    if (i == UCGameSDKStatusCode.SUCCESS) {
                        status.mIsSuccess = true;
                        if (orderInfo != null) {
                            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        } else {
                            Log.e(Constants.TAG, "unexpected null instance");
                            cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
                        }
                    } else if (i == UCGameSDKStatusCode.PAY_USER_EXIT) {
                        if (!status.mIsSuccess) {
                            cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                        }
                    } else {
                        Log.d(Constants.TAG, "fail to charge " + String.valueOf(i));
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                    }
                }
            });
        } catch (UCCallbackListenerNullException e) {
            Log.e(Constants.TAG, "Fail to charge", e);
            cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
        }
    }

    @Override
    public String getId() {
        return "uc";
    }


    /**
     * user logout
     *
     * @param activity the activity to give the real SDK
     */
    @Override
    public void logout(Activity activity) {
        try {
            UCGameSDK.defaultSDK().logout();
        } catch (UCCallbackListenerNullException e) {
            Log.e(Constants.TAG, "Fail to logout");
        }
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
        try {
            UCGameSDK.defaultSDK().createFloatButton(activity, new UCCallbackListener<String>() {
                @Override
                public void callback(int i, String s) {
                    if (i == UCGameSDKStatusCode.SDK_OPEN) {
                        Log.e(Constants.TAG, "toolbar open");
                    } else {
                        Log.e(Constants.TAG, "toolbar close");
                    }
                }
            });
            mFloatBarInfo.mIsCreated = true;
            mFloatBarInfo.mDirection = position;
        } catch (Exception e) {
            Log.e(Constants.TAG, "FAil to create float bar", e);
        }
    }

    /**
     * show or hide the float tool bar (required by 91, UC)
     *
     * @param activity the activity to give the real SDK
     * @param visible  true for show, false for hide
     */
    @Override
    public void showFloatBar(Activity activity, boolean visible) {
        int x = 0;
        int y = 0;
        switch (mFloatBarInfo.mDirection) {
            case Constants.TOOLBAR_BOTTOM_LEFT:
                x = 0;
                y = 100;
                break;
            case Constants.TOOLBAR_BOTTOM_RIGHT:
                x = 100;
                y = 100;
                break;
            case Constants.TOOLBAR_MID_LEFT:
                x = 0;
                y = 50;
                break;
            case Constants.TOOLBAR_MID_RIGHT:
                x = 100;
                y = 50;
                break;
            case Constants.TOOLBAR_TOP_LEFT:
                x = 0;
                y = 0;
                break;
            case Constants.TOOLBAR_TOP_RIGHT:
                x = 100;
                y = 0;
                break;
        }

        try {
            UCGameSDK.defaultSDK().showFloatButton(activity, x, y, visible);
        } catch (UCCallbackListenerNullException e) {
            Log.e(Constants.TAG, "missing toolbar listener", e);
        }
    }

    /**
     * destroy the tool bar
     *
     * @param activity the activity to give the real SDK
     */
    @Override
    public void destroyToolBar(Activity activity) {
        UCGameSDK.defaultSDK().destoryFloatButton(activity);
    }

    @Override
    public boolean onLoginRsp(String loginRsp) {
        JSONObject obj;
        try {
            obj = new JSONObject(loginRsp);
            int code = obj.getInt("code");
            if (code == Constants.ErrorCode.ERR_OK) {
                JSONObject loginInfo = obj.getJSONObject("loginInfo");
                mUid = loginInfo.getString("uid");
                return true;
            } else {
                return false;
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
        return UCGameSDK.defaultSDK().getSid();
    }

    @Override
    public boolean isLogined() {
        return UCGameSDK.defaultSDK().getSid().length() > 0;
    }

    /**
     * destroy the sdk instance
     *
     * @param activity the activity to give the real SDK
     */
    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        UCGameSDK.defaultSDK().exitSDK(activity, new UCCallbackListener<String>() {
            @Override
            public void callback(int i, String s) {
                if (i == UCGameSDKStatusCode.SDK_EXIT) {
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                } else {
                    cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                }
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
        try {
            JSONObject obj = new JSONObject();
            obj.put("roleId", roleId);
            obj.put("roleName", roleName);
            obj.put("roleLevel", roleLevel);
            obj.put("zoneId", zoneId);
            obj.put("zoneName", zoneName);
            UCGameSDK.defaultSDK().submitExtendData("loginGameRole", obj);
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to submit player info", e);
        }
    }

    @Override
    public boolean runProtocol(Activity activity, String protocol, String message, IDispatcherCb cb) {
        return false;
    }

    @Override
    public boolean isSupportProtocol(String protocol) {
        return false;
    }

    private String getCustomInfo() {
        return mChannel;
    }
}
