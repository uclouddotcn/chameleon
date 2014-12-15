package prj.chameleon.dangle;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import com.downjoy.CallbackListener;
import com.downjoy.Downjoy;
import com.downjoy.DownjoyError;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class DangleChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class UserInfo {
        public String mUid;
        public String mName;
        public String mNick;
        public String mToken;
    }

    private IAccountActionListener mAccountActionListener;
    private String mMerchantId;
    private String mAppId;
    private String mServerSeqNum;
    private String mAppKey;
    private Downjoy mDownJoy;
    private UserInfo mUserInfo;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mMerchantId = cfg.getString("merchantId");
        mAppId = cfg.getString("appId");
        mServerSeqNum = cfg.getString("serverSeqNum");
        mAppKey = cfg.getString("appKey");
        mChannel = commCfg.mChannel;
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
        mDownJoy = Downjoy.getInstance(activity, mMerchantId, mAppId, mServerSeqNum, mAppKey);
        if (mDownJoy != null) {
            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
        } else {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
    }

    @Override
    public void onResume(Activity activity, final IDispatcherCb cb) {
        if (mDownJoy != null) {
            mDownJoy.resume(activity);
        }
    }

    @Override
    public void onPause(Activity activity) {
        if (mDownJoy != null) {
            mDownJoy.pause();
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
    public void login(final android.app.Activity activity,
                      final IDispatcherCb cb,
                      IAccountActionListener accountActionListener) {
        doLogin(activity, cb);
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
        float money = ((float)realPayMoney) / 100;
        try {
            JSONObject obj = new JSONObject();
            obj.put("o", orderId);
            obj.put("ch", mChannel);
            mDownJoy.openPaymentDialog(activity, money, currencyName, obj.toString(), new CallbackListener() {

                @Override
                public void onPaymentSuccess(java.lang.String orderNo) {
                    Log.d(Constants.TAG, "Finish payment " + orderNo);
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                }

                @Override
                public void onPaymentError(com.downjoy.DownjoyError downjoyError, java.lang.String s) {
                    Log.d(Constants.TAG, "fail to pay " + downjoyError.getMErrorMessage());
                    cb.onFinished(mapErrorCode(downjoyError.getMErrorCode()), null);
                }


                @Override
                public void onError(Error error) {
                    Log.d(Constants.TAG, "error to pay " + error.getMessage());
                    cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
                }
            });
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to pay", e);
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                }
            });
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
        float money = ((float)realPayMoney) / 100;
        try {
            JSONObject obj = new JSONObject();
            obj.put("o", orderId);
            obj.put("p", productID);
            obj.put("ch", mChannel);
            mDownJoy.openPaymentDialog(activity, money, productName, obj.toString(), new CallbackListener() {

                @Override
                public void onPaymentSuccess(java.lang.String orderNo) {
                    Log.d(Constants.TAG, "Finish payment " + orderNo);
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                }

                @Override
                public void onPaymentError(com.downjoy.DownjoyError downjoyError, java.lang.String s) {
                    Log.d(Constants.TAG, "fail to pay " + downjoyError.getMErrorMessage());
                    cb.onFinished(mapErrorCode(downjoyError.getMErrorCode()), null);
                }


                @Override
                public void onError(Error error) {
                    Log.d(Constants.TAG, "error to pay " + error.getMessage());
                    cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
                }
            });
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to pay", e);
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                }
            });
        }
    }

    @Override
    public String getId() {
        return "dangle";
    }


    /**
     * user logout
     *
     * @param activity the activity to give the real SDK
     */
    @Override
    public void logout(Activity activity) {
        mDownJoy.logout(activity, new CallbackListener() {
        });
        mUserInfo = null;
    }

    @Override
    public boolean switchAccount(final Activity activity, final IDispatcherCb cb) {
        mDownJoy.openMemberCenterDialog(activity, new CallbackListener() {
            @Override
            public void onError(Error error) {
                cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
            }

            @Override
            public void onSwitchAccountAndRestart() {
                doLogin(activity, cb);
            }
        });
        return true;
    }

    @Override
    public boolean isSupportSwitchAccount() {
        return true;
    }

    /**
     * create the float tool bar ( required by 91, UC)
     *
     * @param activity the activity to give the real SDK
     * @param position refer to Constant.Toolbar*
     */
    @Override
    public void createToolBar(Activity activity, int position) {
        int realPos;
        switch (position) {
            case Constants.TOOLBAR_TOP_RIGHT:
                realPos = Downjoy.LOCATION_RIGHT_TOP;
                break;
            case Constants.TOOLBAR_TOP_LEFT:
                realPos = Downjoy.LOCATION_LEFT_TOP;
                break;
            case Constants.TOOLBAR_MID_LEFT:
                realPos = Downjoy.LOCATION_LEFT_CENTER_VERTICAL;
                break;
            case Constants.TOOLBAR_MID_RIGHT:
                realPos = Downjoy.LOCATION_RIGHT_CENTER_VERTICAL;
                break;
            case Constants.TOOLBAR_BOTTOM_RIGHT:
                realPos = Downjoy.LOCATION_RIGHT_BOTTOM;
                break;
            case Constants.TOOLBAR_BOTTOM_LEFT:
                realPos = Downjoy.LOCATION_LEFT_BOTTOM;
                break;
            default:
                realPos = Downjoy.LOCATION_RIGHT_BOTTOM;
        }
        mDownJoy.setInitLocation(realPos);
    }

    /**
     * show or hide the float tool bar (required by 91, UC)
     *
     * @param activity the activity to give the real SDK
     * @param visible  true for show, false for hide
     */
    @Override
    public void showFloatBar(Activity activity, boolean visible) {
        mDownJoy.showDownjoyIconAfterLogined(visible);
    }

    /**
     * destroy the tool bar
     *
     * @param activity the activity to give the real SDK
     */
    @Override
    public void destroyToolBar(Activity activity) {
        mDownJoy.showDownjoyIconAfterLogined(false);
    }

    @Override
    public String getUid() {
        return mUserInfo.mUid;
    }

    @Override
    public String getToken() {
        return mUserInfo.mToken;
    }

    @Override
    public boolean isLogined() {
        return mUserInfo != null;
    }

    @Override
    public void onDestroy(Activity activity) {
        if (mDownJoy != null) {
            mDownJoy.destroy();
            mDownJoy = null;
        }
    }
    /**
     * destroy the sdk instance
     *
     * @param activity the activity to give the real SDK
     */
    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        mUserInfo = null;
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_LOGIN_GAME_EXIT_NOCARE, null);
            }
        });
    }

    @Override
    public boolean runProtocol(Activity activity, String protocol, String message, final IDispatcherCb cb) {
        if (protocol.equals("dangle_getInfo")) {
            mDownJoy.getInfo(activity, new CallbackListener() {
                @Override
                public void onInfoSuccess(Bundle bundle) {
                    Long memberId = bundle.getLong(Downjoy.DJ_PREFIX_STR + "mid");
                    String userName = bundle.getString(Downjoy.DJ_PREFIX_STR + "username");
                    String nickName = bundle.getString(Downjoy.DJ_PREFIX_STR + "nickname");
                    String gender = bundle.getString(Downjoy.DJ_PREFIX_STR + "gender");
                    int level = bundle.getInt(Downjoy.DJ_PREFIX_STR + "level");
                    String avatarUrl = bundle.getString(Downjoy.DJ_PREFIX_STR + "avatarUrl");
                    long createDate = bundle.getLong(Downjoy.DJ_PREFIX_STR + "createDate");
                    JSONObject obj = new JSONObject();
                    try {
                        obj.put("memberId", memberId);
                        obj.put("username", userName);
                        obj.put("nickName", nickName);
                        obj.put("gender", gender);
                        obj.put("level", level);
                        obj.put("avatarUrl", avatarUrl);
                        obj.put("createDate", createDate);
                        cb.onFinished(Constants.ErrorCode.ERR_OK, obj);
                    } catch (Exception e) {
                        Log.e(Constants.TAG, "Fail to run dangle_getInfo", e);
                        cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                    }
                }

                @Override
                public void onInfoError(DownjoyError downjoyError) {
                    Log.e(Constants.TAG, "Fail to run dangle_getInfo " + downjoyError.getMErrorMessage());
                    cb.onFinished(mapErrorCode(downjoyError.getMErrorCode()), null);
                }

                @Override
                public void onError(Error error) {
                    Log.e(Constants.TAG, "Fail to run dangle_getInfo " + error.getMessage());
                    cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
                }
            });
            return true;
        } else if (protocol.equals("dangle_openMemberCenterDialog")) {
            mDownJoy.openMemberCenterDialog(activity, new CallbackListener() {
                @Override
                public void onMemberCenterBack() {
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                }

                @Override
                public void onMemberCenterError(DownjoyError downjoyError) {
                    cb.onFinished(mapErrorCode(downjoyError.getMErrorCode()), null);
                }

                @Override
                public void onError(Error error) {
                    cb.onFinished(Constants.ErrorCode.ERR_UNKNOWN, null);
                }
            });
            return true;
        }
        return false;
    }

    @Override
    public boolean isSupportProtocol(String protocol) {
        if (protocol.equals("dangle_getInfo")) {
            return true;
        } else if (protocol.equals("dangle_openMemberCenterDialog")) {
            return true;
        }
        return false;
    }

    private int mapErrorCode(int code) {
        switch (code) {
            case 100:
                return Constants.ErrorCode.ERR_CANCEL;
            case 103:
                return Constants.ErrorCode.ERR_PAY_CANCEL;
            case 104:
                return Constants.ErrorCode.ERR_PAY_FAIL;
            case 201:
                Log.e(Constants.TAG, "APP Id error");
                return Constants.ErrorCode.ERR_INTERNAL;
            case 210:
                Log.e(Constants.TAG, "sig is empty");
                return Constants.ErrorCode.ERR_INTERNAL;
            case 220:
                Log.e(Constants.TAG, "token is empty");
                return Constants.ErrorCode.ERR_INTERNAL;
            case 221:
                Log.e(Constants.TAG, "token is error");
                return Constants.ErrorCode.ERR_INTERNAL;
            case 222:
                Log.e(Constants.TAG, "token is error");
                return Constants.ErrorCode.ERR_NO_LOGIN;
            case 223:
                Log.e(Constants.TAG, "mid is invalid");
                return Constants.ErrorCode.ERR_UNKNOWN;
            case 230:
                Log.e(Constants.TAG, "money is invalid");
                return Constants.ErrorCode.ERR_PAY_CANCEL;
            case 231:
                Log.e(Constants.TAG, "money is invalid");
                return Constants.ErrorCode.ERR_PAY_CANCEL;
            case 300:
                Log.e(Constants.TAG, "no authroized, please contact DangLe");
                return Constants.ErrorCode.ERR_INTERNAL;
            default:
                return Constants.ErrorCode.ERR_UNKNOWN;
        }
    }

    private void doLogin(final android.app.Activity activity,
                        final IDispatcherCb cb) {
        mDownJoy.openLoginDialog(activity, new CallbackListener() {
            @Override
            public void onLoginSuccess(android.os.Bundle bundle) {
                mUserInfo = new UserInfo();
                mUserInfo.mUid = bundle.getString(Downjoy.DJ_PREFIX_STR+ "mid");
                mUserInfo.mName = bundle.getString(Downjoy.DJ_PREFIX_STR+ "username");
                mUserInfo.mNick = bundle.getString(Downjoy.DJ_PREFIX_STR+ "nickname");
                mUserInfo.mToken = bundle.getString(Downjoy.DJ_PREFIX_STR+ "token");
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        JSONObject obj = JsonMaker.makeLoginResponse(mUserInfo.mToken,
                                null, mChannel);
                        if (obj != null) {
                            cb.onFinished(Constants.ErrorCode.ERR_OK, obj);
                        } else {
                            Log.e(Constants.TAG, "Fail to create login json");
                            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        }
                    }
                });
            }

            @Override
            public void onLoginError(com.downjoy.DownjoyError downjoyError) {
                int errorCode = mapErrorCode(downjoyError.getMErrorCode());
                Log.e(Constants.TAG, "Fail to login: " + downjoyError.getMErrorMessage());
                cb.onFinished(errorCode, null);
            }

            @Override
            public void onError(Error error) {
                Log.e(Constants.TAG, "Fail to login: " + error.getMessage());
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
        });
    }

}
