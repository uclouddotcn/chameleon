package prj.chameleon.channelapi.unity;

import android.app.Activity;
import android.util.Log;

import org.json.JSONObject;

import java.io.UnsupportedEncodingException;

import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IDispatcherCb;

/**
 * Created by wushauk on 6/9/14.
 */
public class UnityChannelInterface {
    private static Activity mActivity;
    private static AccountActionListener mAccountActionListener = new AccountActionListener();

    /**
     * init the cbinding platform interface
     *
     * @param activity the main activity
     */
    public static void init(final Activity activity) {
        Log.d(Constants.TAG, "on init");
        if (mActivity != null) {
            return;
        }
        mActivity = activity;
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.init(activity, true, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        Log.d(Constants.TAG, String.format("on init finished %d", retCode));
                        U3DHelper.SendMessage("onInited", "");
                    }
                });
            }
        });

    }

    /**
     * login as a guest
     */
    public static void loginGuest() {
        Log.d(Constants.TAG, "login guest");
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.loginGuest(mActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(final int retCode, final JSONObject data) {
                        if (retCode != Constants.ErrorCode.ERR_OK) {
                            Log.d(Constants.TAG, String.format("get result %d", retCode));
                            U3DHelper.SendMessage("onLoginFail", retCode, null);
                            return;
                        }
                        try {
                            if (data.getInt("guest") == 1) {
                                U3DHelper.SendMessage("onLoginGuest", retCode, null);
                            } else {
                                JSONObject userInfo = data.getJSONObject("loginInfo");
                                U3DHelper.SendMessage("onLogin", retCode, userInfo);
                            }
                        } catch (Exception e) {
                            Log.e(Constants.TAG, "fail to get result", e);
                            U3DHelper.SendMessage("onLoginFail", Constants.ErrorCode.ERR_INTERNAL, null);
                        }
                    }
                }, mAccountActionListener);
            }
        });

    }

    /**
     * request guest user to register or associate a platform account,
     *
     * @param tips tips shown in the platform sdk, not all platform support this
     * @return false if the request is not valid, e.g. the user didn't login as a guest
     * @throws UnsupportedEncodingException
     */
    public static boolean registGuest(final String tips) throws UnsupportedEncodingException {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.registGuest(mActivity, tips, new IDispatcherCb() {
                    @Override
                    public void onFinished(final int retCode, final JSONObject data) {
                        U3DHelper.SendMessage("onRegistGuest", retCode, data);
                    }
                });
            }
        });
        return true;
    }

    /**
     * login
     */
    public static void login() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.login(mActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(final int retCode, final JSONObject data) {
                        if (retCode != Constants.ErrorCode.ERR_OK) {
                            U3DHelper.SendMessage("onLoginFail", retCode, null);
                            return;
                        }
                        U3DHelper.SendMessage("onLogin", retCode, data);
                    }
                }, mAccountActionListener);
            }
        });
    }

    /**
     * start a charge, refer the meaning of the parameter to the
     * prj.chameleon.platformapi.UnityChannelInterface
     *
     * @param orderId
     * @param uidInGame
     * @param userNameInGame
     * @param serverId
     * @param currencyName
     * @param rate
     * @param realPayMoney
     * @param allowUserChange
     */
    public static void charge(final String orderId,
                              final String uidInGame,
                              final String userNameInGame,
                              final String serverId,
                              final String currencyName,
                              final String payInfo,
                              final int rate,
                              final int realPayMoney,
                              final boolean allowUserChange) {

        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {

                prj.chameleon.channelapi.ChannelInterface.charge(mActivity, orderId,
                        uidInGame, userNameInGame, serverId, currencyName, payInfo, rate, realPayMoney, allowUserChange,
                        new IDispatcherCb() {
                            @Override
                            public void onFinished(int retCode, JSONObject data) {
                                U3DHelper.SendMessage("onPay", retCode, null);
                            }
                        });
            }
        });

    }

    /**
     * start a buy request, refer the meaning of the parameters to prj.chameleon.platformapi.UnityChannelInterface
     *
     * @param id
     * @param orderId
     * @param uidInGame
     * @param userNameInGame
     * @param serverId
     * @param productName
     * @param productID
     * @param productCount
     * @param realPayMoney
     * @throws UnsupportedEncodingException
     */
    public static void buy(final int id,
                           final String orderId,
                           final String uidInGame,
                           final String userNameInGame,
                           final String serverId,
                           final String productName,
                           final String productID,
                           final String payInfo,
                           final int productCount,
                           final int realPayMoney) throws UnsupportedEncodingException {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Log.d(Constants.TAG, String.format("real pay moeny %d", realPayMoney));
                prj.chameleon.channelapi.ChannelInterface.buy(mActivity, orderId,
                        uidInGame, userNameInGame, serverId, productName, productID, payInfo,
                        productCount, realPayMoney,
                        new IDispatcherCb() {
                            @Override
                            public void onFinished(final int retCode, JSONObject data) {
                                U3DHelper.SendMessage("onPay", retCode, data);
                            }
                        });
            }
        });

    }

    /**
     * logout current user
     */
    public static void logout() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.logout(mActivity);
            }
        });

    }

    /**
     * whether the platform supports switching account
     *
     * @return
     */
    public static boolean isSupportSwitchAccount() {
        return prj.chameleon.channelapi.ChannelInterface.isSupportSwitchAccount();
    }

    /**
     * switch account
     *
     * @return
     */
    public static void switchAccount() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                boolean isStarting = prj.chameleon.channelapi.ChannelInterface.switchAccount(mActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(final int retCode, final JSONObject data) {
                        U3DHelper.SendMessage("onSwitchAccount", retCode, data);
                    }
                });
                // if the request failed, run callback immediately
                if (!isStarting) {
                    U3DHelper.SendMessage("onSwitchAccount", Constants.ErrorCode.ERR_FAIL, null);
                }
            }
        });
    }

    /**
     * create the toolbar and show it in (x,y)
     */
    public static void createAndShowToolBar(final int position) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.createToolBar(mActivity, position);
                showFloatBar(true);
            }
        });

    }

    /**
     * show platform toolbar
     *
     * @param visible
     */
    public static void showFloatBar(final boolean visible) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.showFloatBar(mActivity, visible);
            }
        });
    }


    /**
     * destroy the toolbar
     */
    public static void destroyToolBar() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.destroyToolBar(mActivity);
            }
        });
    }

    /**
     * notify the platform we are coming back from a pause
     */
    public static void onResume() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.onResume(mActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        U3DHelper.SendMessage("onResume", Constants.ErrorCode.ERR_OK, null);
                    }
                });
            }
        });
    }

    /**
     * notify the platform we are paused
     */
    public static void onPause() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.onPause(mActivity);
            }
        });
    }

    /**
     * request anti addiction info
     *
     * @throws UnsupportedEncodingException
     */
    public static void antiAddiction() throws UnsupportedEncodingException {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.antiAddiction(mActivity,
                        new IDispatcherCb() {
                            @Override
                            public void onFinished(final int retCode, final JSONObject data) {
                                if (retCode == Constants.ErrorCode.ERR_OK) {
                                    U3DHelper.SendMessage("onAntiAddiction", retCode, data);
                                } else {
                                    U3DHelper.SendMessage("onAntiAddiction",
                                            String.format("{\"flag\": %d, \"code\": %d}", Constants.ANTI_ADDICTION_ADULT,
                                                    Constants.ErrorCode.ERR_OK));
                                }
                            }
                        });
            }
        });
    }

    /**
     * destroy the underlying platform sdk
     */
    public static void destroy() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.exit(mActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        if (retCode == Constants.ErrorCode.ERR_OK) {
                            U3DHelper.SendMessage("onExit", "");
                        }
                    }
                });
            }
        });
    }

    /**
     * get current platform name
     *
     * @return
     */
    public static String getChannelName() {
        return prj.chameleon.channelapi.ChannelInterface.getChannelName();
    }


    /**
     * get channel user id
     *
     * @return channel user id
     */
    public static String getUid() {
        return ChannelInterface.getUin();
    }

    /**
     * user have loggined or not
     *
     * @return true if the user have already logged in
     */
    public static boolean isLogined() {
        return ChannelInterface.isLogined();
    }

    /**
     * get the token of this session
     *
     * @return the token of the channel
     */
    public static String getToken() {
        return ChannelInterface.getToken();
    }

    /**
     * get the pay token of this session
     *
     * @return the pay token of this channel
     */
    public static String getPayToken() {
        return ChannelInterface.getPayToken();
    }

    /**
     * feed the login rsp from the chameleon server to SDK
     *
     * @param rsp the login rsp from chameleon server
     * @return
     */
    public static boolean onLoginRsp(String rsp) {
        return ChannelInterface.onLoginRsp(rsp);
    }

    public static void submitPlayerInfo(String roleId,
                                        String roleName,
                                        String roleLevel,
                                        int zoneId,
                                        String zoneName) {
        ChannelInterface.submitPlayerInfo(mActivity,
                roleId,
                roleName,
                roleLevel,
                zoneId,
                zoneName);
    }
}

