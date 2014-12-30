package prj.chameleon.channelapi.unity;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import com.unity3d.player.UnityPlayer;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.util.LinkedList;

import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.DummyChannelAPI;
import prj.chameleon.channelapi.IDispatcherCb;

public class UnityChannelInterface {
    private static AccountActionListener mAccountActionListener = new AccountActionListener();
    private static class RequestProxy {
        private LinkedList<Runnable> mPendingQueue = new LinkedList<Runnable>();
        private boolean mIsInited = false;

        // run on UI thread only
        public void setInitDone () {
            setInited();
            for (Runnable runnable : mPendingQueue) {
                runnable.run();
            }
            mPendingQueue.clear();
        }

        public synchronized void request(Runnable runnable) {
            if (!mIsInited) {
                mPendingQueue.add(runnable);
            } else {
                UnityPlayer.currentActivity.runOnUiThread(runnable);
            }
        }

        public synchronized void onDestroy() {
            mIsInited = false;
        }

        private synchronized void setInited() {
            mIsInited = true;
        }
    }

    private static RequestProxy mRequestProxy = new RequestProxy();


    /**
     * init the Chameleon
     */
    public static void init() {
        Log.d(Constants.TAG, "on init");
        UnityPlayer.currentActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.init(UnityPlayer.currentActivity, true, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        Log.d(Constants.TAG, String.format("on init finished %d", retCode));
                        mRequestProxy.setInitDone();
                        U3DHelper.SendMessage("onInited", retCode, null);
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
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.loginGuest(UnityPlayer.currentActivity, new IDispatcherCb() {
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
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.registGuest(UnityPlayer.currentActivity, tips, new IDispatcherCb() {
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
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.login(UnityPlayer.currentActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(final int retCode, final JSONObject data) {
                        UnityPlayer.
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

        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {

                prj.chameleon.channelapi.ChannelInterface.charge(UnityPlayer.currentActivity, orderId,
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
    public static void buy(final String orderId,
                           final String uidInGame,
                           final String userNameInGame,
                           final String serverId,
                           final String productName,
                           final String productID,
                           final String payInfo,
                           final int productCount,
                           final int realPayMoney) throws UnsupportedEncodingException {
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                Log.d(Constants.TAG, String.format("real pay moeny %d", realPayMoney));
                prj.chameleon.channelapi.ChannelInterface.buy(UnityPlayer.currentActivity, orderId,
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
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.logout(UnityPlayer.currentActivity);
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
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                boolean isStarting = prj.chameleon.channelapi.ChannelInterface.switchAccount(UnityPlayer.currentActivity, new IDispatcherCb() {
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
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.createToolBar(UnityPlayer.currentActivity, position);
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
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.showFloatBar(UnityPlayer.currentActivity, visible);
            }
        });
    }


    /**
     * destroy the toolbar
     */
    public static void destroyToolBar() {
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.destroyToolBar(UnityPlayer.currentActivity);
            }
        });
    }

    /**
     * notify the platform we are coming back from a pause
     */
    public static void onResume() {
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.onResume(UnityPlayer.currentActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        U3DHelper.SendMessage("onPause", Constants.ErrorCode.ERR_OK, null);
                    }
                });
            }
        });
    }

    /**
     * notify the platform we are paused
     */
    public static void onPause() {
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.onPause(UnityPlayer.currentActivity);
            }
        });
    }

    /**
     * notify the platform we are destroyed
     */
    public static void onDestroy() {
        prj.chameleon.channelapi.ChannelInterface.onDestroy(UnityPlayer.currentActivity);
        mRequestProxy.onDestroy();
    }

    public static void onActivityResult(final Activity activity, final int requestCode, final int resultCode, final Intent data) {
        prj.chameleon.channelapi.ChannelInterface.onActivityResult(activity, requestCode, resultCode, data);
    }


    public static void onStart(Activity activity) {
        prj.chameleon.channelapi.ChannelInterface.onStart(activity);
    }

    public static void onStop(Activity activity) {
        prj.chameleon.channelapi.ChannelInterface.onStop(activity);
    }

    public static void onNewIntent(Activity activity, Intent intent) {
        prj.chameleon.channelapi.ChannelInterface.onStop(activity);
    }


    /**
     * request anti addiction info
     *
     * @throws UnsupportedEncodingException
     */
    public static void antiAddiction() throws UnsupportedEncodingException {
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.antiAddiction(UnityPlayer.currentActivity,
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
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                prj.chameleon.channelapi.ChannelInterface.exit(UnityPlayer.currentActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        U3DHelper.SendMessage("onDestroyed", String.format("{\"code\": %d}", retCode));
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

    public static void submitPlayerInfo(final String roleId,
                                        final String roleName,
                                        final String roleLevel,
                                        final int zoneId,
                                        final String zoneName) {
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.submitPlayerInfo(UnityPlayer.currentActivity,
                        roleId,
                        roleName,
                        roleLevel,
                        zoneId,
                        zoneName);
            }
        });
    }

    public static boolean isSupportProtocol (final String protocol) {
        return ChannelInterface.isSupportProtocol(protocol);
    }

    public static void runProtocol (final String protocol, final String params) {
        mRequestProxy.request(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.runProtocol(UnityPlayer.currentActivity,
                        protocol, params, new IDispatcherCb() {
                            @Override
                            public void onFinished(int retCode, JSONObject data) {
                                JSONObject res = new JSONObject();
                                try{
                                    res.put("method", protocol);
                                    if (data != null) {
                                        res.put("res", data.toString());
                                    }
                                    Log.d(Constants.TAG, String.format("run protocol", retCode));
                                    U3DHelper.SendMessage("onRunProtocol", retCode, res);
                                } catch (JSONException e) {
                                    U3DHelper.SendMessage("onRunProtocol", Constants.ErrorCode.ERR_INTERNAL, null);
                                }
                            }
                        });
            }
        });
    }
}

