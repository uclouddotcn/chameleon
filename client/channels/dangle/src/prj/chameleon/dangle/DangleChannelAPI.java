package prj.chameleon.dangle;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import com.downjoy.CallbackListener;
import com.downjoy.CallbackStatus;
import com.downjoy.Downjoy;
import com.downjoy.InitListener;
import com.downjoy.LoginInfo;
import com.downjoy.UserInfo;

import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class DangleChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class SDKUserInfo {
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
    private SDKUserInfo mSDKUserInfo;

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
    public void init(final android.app.Activity activity,
                     final IDispatcherCb cb) {

        InitListener initListener = new InitListener() {

            @Override
            public void onInitComplete() {
                if(mDownJoy != null){
                    mDownJoy.openLoginDialog(activity, new CallbackListener<LoginInfo>() {
                        @Override
                        public void callback(int status, LoginInfo data) {
                            if (status == CallbackStatus.SUCCESS && data != null) {
                                String memberId = data.getUmid();
                                String username = data.getUserName();
                                String nickname = data.getNickName();
                                String token = data.getToken();
                                Log.i(Constants.TAG, "mid:" + memberId + "\nusername:" + username + "\nnickname:" + nickname
                                        + "\ntoken:" + token);
                                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                            } else if (status == CallbackStatus.FAIL && data != null) {
                                Log.i(Constants.TAG, "onError:" + data.getMsg());
                                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                            } else if (status == CallbackStatus.CANCEL && data != null) {
                                Log.i(Constants.TAG, data.getMsg());
                                cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                            }
                        }
                    });
                }
            }
        };

        // 获取当乐游戏中心的实例
        mDownJoy = Downjoy.getInstance(activity, mMerchantId, mAppId, mServerSeqNum, mAppKey, initListener);

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
                      final IAccountActionListener accountActionListener) {
        mDownJoy.openLoginDialog(activity, new CallbackListener<LoginInfo>() {
            @Override
            public void callback(int status, LoginInfo data) {
                if (status == CallbackStatus.SUCCESS && data != null) {
                    SDKUserInfo sdkUserInfo = new SDKUserInfo();
                    sdkUserInfo.mUid = data.getUmid();
                    sdkUserInfo.mName = data.getUserName();
                    sdkUserInfo.mNick = data.getNickName();
                    sdkUserInfo.mToken = data.getToken();

                    mSDKUserInfo = sdkUserInfo;
                    mAccountActionListener = accountActionListener;

                    JSONObject obj = JsonMaker.makeLoginResponse(mSDKUserInfo.mToken,
                            mSDKUserInfo.mUid, mChannel);
                    cb.onFinished(Constants.ErrorCode.ERR_OK, obj);
                } else if (status == CallbackStatus.FAIL && data != null) {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                } else if (status == CallbackStatus.CANCEL && data != null) {
                    cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                } else {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }
        });

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
        mDownJoy.openPaymentDialog(activity, money, currencyName, payInfo, orderId, new CallbackListener<String>() {
            @Override
            public void callback(int status, String data) {
                if (status == CallbackStatus.SUCCESS) {
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                } else if (status == CallbackStatus.FAIL) {
                    cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                }
            }
        });
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
        mDownJoy.openPaymentDialog(activity, money, productName, payInfo, orderId, new CallbackListener<String>() {
            @Override
            public void callback(int status, String data) {
                if (status == CallbackStatus.SUCCESS) {
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                } else if (status == CallbackStatus.FAIL) {
                    cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                }
            }
        });
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
        mDownJoy.logout(activity);
        if(mAccountActionListener != null){
            mAccountActionListener.onAccountLogout();
            mAccountActionListener = null;
        }
        mSDKUserInfo = null;
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
        return mSDKUserInfo.mUid;
    }

    @Override
    public String getToken() {
        return mSDKUserInfo.mToken;
    }

    @Override
    public boolean isLogined() {
        return mSDKUserInfo != null;
    }

    @Override
    public boolean runProtocol(Activity activity, String protocol, String message, final IDispatcherCb cb) {
        if (protocol.equals("dangle_getInfo")) {
            mDownJoy.getInfo(activity, new CallbackListener<UserInfo>() {
                @Override
                public void callback(int status, UserInfo data) {
                    if (status == CallbackStatus.SUCCESS) {
                        String memberId = data.getUmid();
                        String userName = data.getUserName();
                        String phone = data.getPhone();
                        String gender = data.getGender();
                        String vip = data.getVip();
                        String avatarUrl = data.getAvatarUrl();
                        String security_num = data.getSecurity_num();

                        JSONObject obj = new JSONObject();
                        try {
                            obj.put("memberId", memberId);
                            obj.put("username", userName);
                            obj.put("phone", phone);
                            obj.put("gender", gender);
                            obj.put("vip", vip);
                            obj.put("avatarUrl", avatarUrl);
                            obj.put("security_num", security_num);
                            cb.onFinished(Constants.ErrorCode.ERR_OK, obj);
                        } catch (Exception e) {
                            Log.e(Constants.TAG, "Fail to run dangle_getInfo", e);
                            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                        }
                    } else if (status == CallbackStatus.FAIL) {
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                    } else {
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                    }
                }
            });

            return true;
        } else if (protocol.equals("dangle_openMemberCenterDialog")) {
            mDownJoy.openMemberCenterDialog(activity);
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

    @Override
    public void onResume(Activity activity, final IDispatcherCb cb) {
        if (mDownJoy != null) {
            mDownJoy.resume(activity);
        }
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void onPause(Activity activity) {
        if (mDownJoy != null) {
            mDownJoy.pause();
        }
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
        mDownJoy.openExitDialog(activity, new CallbackListener<String>() {

            @Override
            public void callback(int status, String data) {
                if (CallbackStatus.SUCCESS == status) {
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                } else if (CallbackStatus.CANCEL == status) {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }
        });
    }

}
