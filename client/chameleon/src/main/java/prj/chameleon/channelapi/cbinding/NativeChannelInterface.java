package prj.chameleon.channelapi.cbinding;

import android.app.Activity;
import android.opengl.GLSurfaceView;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.lang.ref.WeakReference;

import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IDispatcherCb;

/**
 * Created by wushauk on 4/21/14.
 */
public class NativeChannelInterface {
    public static interface IRunEnv {
        public void run(Runnable runnable);
    }

    private static Activity mActivity;
    private static AccountActionListener mAccountActionListener = new AccountActionListener();
    private static class GlSurfaceViewRunEnv implements IRunEnv{
        public WeakReference<GLSurfaceView> mGlView;
        GlSurfaceViewRunEnv(GLSurfaceView view) {
            mGlView = new WeakReference<GLSurfaceView>(view);
        }
        @Override
        public void run(Runnable runnable) {
            if (mGlView.get() != null) {
                mGlView.get().queueEvent(runnable);
            } else {
                Log.e(Constants.TAG, "The glview is gone");
            }
        }
    }

    private static class UIRunEnv implements IRunEnv {
        @Override
        public void run(Runnable runnable) {
            runnable.run();
        }
    }

    private static IRunEnv mRunEnv;

    /**
     *  init the cbinding channel interface
     * @param activity the main activity
     * @param isDebug whether set the sdk to deubg mode
     * @param runEnv the callback will be run in the envrionment
     */
    public static void init(final Activity activity, final boolean isDebug, final IRunEnv runEnv) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.init(activity, isDebug, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        Log.d(Constants.TAG, String.format("on init finished %d", retCode));
                        try {
                            ChannelAPINative.init(isDebug, getChannelName());
                        } catch (UnsupportedEncodingException e) {
                            Log.e(Constants.TAG, "Fail to encode to UTF-8???", e);
                        }
                    }
                });
            }
        });
        mActivity = activity;
        mRunEnv = runEnv;
    }

    /**
     *  init the cbinding channel interface with the render thread of GLSurfaceView as running envrionment
     * @param activity the main activity
     * @param isDebug whether set the sdk to deubg mode
     *        IRunEnv
     */
    public static void init(final Activity activity, final boolean isDebug, final GLSurfaceView view) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Log.d(Constants.TAG, "start init activity");
                ChannelInterface.init(activity, isDebug, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        Log.d(Constants.TAG, String.format("on init finished %d", retCode));
                        try {
                            ChannelAPINative.init(isDebug, getChannelName());
                        } catch (UnsupportedEncodingException e) {
                            Log.e(Constants.TAG, "Fail to encode to UTF-8???", e);
                        }
                    }
                });
            }
        });
        mActivity = activity;
        mRunEnv = new GlSurfaceViewRunEnv(view);
    }

    /**
     *  init the cbinding channel interface with UI thread as running envrionment
     * @param activity the main activity
     * @param isDebug whether set the sdk to deubg mode
     *        IRunEnv
     */
    public static void init(final Activity activity, final boolean isDebug) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.init(activity, isDebug, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        Log.d(Constants.TAG, String.format("on init finished %d", retCode));
                        try {
                            ChannelAPINative.init(isDebug, getChannelName());
                        } catch (UnsupportedEncodingException e) {
                            Log.e(Constants.TAG, "Fail to encode to UTF-8???", e);
                        }
                    }
                });
            }
        });
        mActivity = activity;
        mRunEnv = new UIRunEnv();
    }

    /**
     * login as a guest
     * @param id  the identity of the request
     */
    public static void loginGuest(final int id) {
        Log.d(Constants.TAG, "login guest");
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.loginGuest(mActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(final int retCode, final JSONObject data) {
                        Runnable callbackFunc = new Runnable() {
                            @Override
                            public void run() {
                                if (retCode != Constants.ErrorCode.ERR_OK) {
                                    Log.d(Constants.TAG, String.format("get result %d", retCode));
                                    ChannelAPINative.onLoginGuest(id, retCode);
                                    return;
                                }
                                try {
                                    if (data.getInt("guest") == 1) {
                                        ChannelAPINative.onLoginGuest(id, Constants.ErrorCode.ERR_OK);
                                    } else {
                                        JSONObject userInfo = data.getJSONObject("loginInfo");
                                        ChannelAPINative.onLogin(id, Constants.ErrorCode.ERR_OK,
                                                userInfo.toString().getBytes("UTF-8"));
                                    }
                                } catch (JSONException e) {
                                    Log.e(Constants.TAG, "fail to get result", e);
                                    ChannelAPINative.onLoginGuest(id, Constants.ErrorCode.ERR_INTERNAL);
                                } catch (UnsupportedEncodingException e) {
                                    Log.e(Constants.TAG, "fail to get result", e);
                                    ChannelAPINative.onLoginGuest(id, Constants.ErrorCode.ERR_INTERNAL);
                                }
                            }
                        };
                        mRunEnv.run(callbackFunc);
                    }
                }, mAccountActionListener);
            }
        });

    }

    /**
     * request guest user to register or associate a channel account,
     * @param id the identity of the request
     * @param tips tips shown in the channel sdk, not all channel support this
     * @return false if the request is not valid, e.g. the user didn't login as a guest
     * @throws UnsupportedEncodingException
     */
    public static boolean registGuest(final int id, final byte[] tips) throws UnsupportedEncodingException {

        final String strTips = new String(tips, "UTF-8");
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.registGuest(mActivity, strTips, new IDispatcherCb() {
                    @Override
                    public void onFinished(final int retCode, final JSONObject data) {
                        Runnable callbackFunc = new Runnable() {
                            @Override
                            public void run() {
                                if (retCode != Constants.ErrorCode.ERR_OK) {
                                    ChannelAPINative.onRegistGuest(id, retCode, null);
                                    return;
                                }
                                try {
                                    ChannelAPINative.onRegistGuest(id, retCode,data.toString().getBytes("UTF-8"));
                                } catch (Exception e) {
                                    Log.e(Constants.TAG, "fail to get result", e);
                                    ChannelAPINative.onRegistGuest(id, Constants.ErrorCode.ERR_INTERNAL,null);
                                }
                            }
                        };
                        mRunEnv.run(callbackFunc);
                    }
                });
            }
        });
        return true;
    }

    /**
     * login
     * @param id the identity of the request
     */
    public static void login(final int id) {
        Log.d(Constants.TAG, "call login");
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.login(mActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(final int retCode, final JSONObject data) {
                        Runnable callbackFunc = new Runnable() {
                            @Override
                            public void run() {
                                if (retCode != Constants.ErrorCode.ERR_OK) {
                                    ChannelAPINative.onLogin(id, retCode, null);
                                    return;
                                }
                                try {
                                    ChannelAPINative.onLogin(id, retCode, data.toString().getBytes("UTF-8"));
                                } catch (Exception e) {
                                    Log.e(Constants.TAG, "fail to get result", e);
                                    ChannelAPINative.onLogin(id, Constants.ErrorCode.ERR_INTERNAL,
                                            null);
                                }
                            }
                        };
                        mRunEnv.run(callbackFunc);

                    }
                }, mAccountActionListener);
            }
        });
    }

    /**
     * start a charge, refer the meaning of the parameter to the
     *  prj.chameleon.channelapi.ChannelInterface
     * @param id the identity of the request
     * @param orderId order id of this charge
     * @param uidInGame user id in the game
     * @param userNameInGame  user name in the game
     * @param serverId server id
     * @param currencyName name of the currency
     * @param rate how much currency can get of ￥1
     * @param realPayMoney pay money
     * @param allowUserChange if user allow change the amount
     * @throws UnsupportedEncodingException
     */
    public static void charge(final int id,
                              final byte[] orderId,
                              final byte[] uidInGame,
                              final byte[] userNameInGame,
                              final byte[] serverId,
                              final byte[] currencyName,
                              final byte[] payInfo,
                              final int rate,
                              final int realPayMoney,
                              final boolean allowUserChange) throws UnsupportedEncodingException {
        final String strOrderId = new String(orderId, "UTF-8");
        final String strUidInGame = new String(uidInGame, "UTF-8");
        final String strUserNameInGame = new String(userNameInGame, "UTF-8");
        final String strServerId = new String(serverId, "UTF-8");
        final String strCurrencyName = new String(currencyName, "UTF-8");
        final String strPayInfo = new String(payInfo, "UTF-8");
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {

                ChannelInterface.charge(mActivity, strOrderId, strUidInGame, strUserNameInGame,
                        strServerId, strCurrencyName, strPayInfo, rate, realPayMoney, allowUserChange,
                        new IDispatcherCb() {
                            @Override
                            public void onFinished(int retCode, JSONObject data) {
                                Runnable callbackFunc = new Runnable() {
                                    @Override
                                    public void run() {
                                        ChannelAPINative.onCharge(id, Constants.ErrorCode.ERR_OK);
                                    }
                                };
                                mRunEnv.run(callbackFunc);

                            }
                        });
            }
        });

    }

    /**
     * start a buy request, refer the meaning of the parameters to prj.chameleon.channelapi.ChannelInterface
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
                           final byte[] orderId,
                           final byte[] uidInGame,
                           final byte[] userNameInGame,
                           final byte[] serverId,
                           final byte[] productName,
                           final byte[] productID,
                           final byte[] payInfo,
                           final int productCount,
                           final int realPayMoney) throws UnsupportedEncodingException {

        final String strOrderId = new String(orderId, "UTF-8");
        final String strUidInGame = new String(uidInGame, "UTF-8");
        final String strUserNameInGame = new String(userNameInGame, "UTF-8");
        final String strServerId = new String(serverId, "UTF-8");
        final String strProductName = new String(productName, "UTF-8");
        final String strProductID = new String(productID, "UTF-8");
        final String strPayInfo = new String(payInfo, "UTF-8");
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Log.d(Constants.TAG, String.format("real pay moeny %d", realPayMoney));
                ChannelInterface.buy(mActivity, strOrderId, strUidInGame,
                        strUserNameInGame, strServerId, strProductName, strProductID, strPayInfo,
                        productCount, realPayMoney,
                        new IDispatcherCb() {
                            @Override
                            public void onFinished(final int retCode, JSONObject data) {
                                Runnable callbackFunc = new Runnable() {
                                    @Override
                                    public void run() {
                                        if (retCode != Constants.ErrorCode.ERR_OK) {
                                            ChannelAPINative.onBuy(id, retCode);
                                            return;
                                        }
                                        ChannelAPINative.onBuy(id, Constants.ErrorCode.ERR_OK);
                                    }
                                };
                                mRunEnv.run(callbackFunc);

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
                ChannelInterface.logout(mActivity);
            }
        });

    }

    /**
     * whether the platform supports switching account
     * @return
     */
    public static boolean isSupportSwitchAccount() {
        return ChannelInterface.isSupportSwitchAccount();
    }

    /**
     * switch account
     * @param id the identity of the request
     */
    public static void switchAccount(final int id) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                boolean isStarting = ChannelInterface.switchAccount(mActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(final int retCode, final JSONObject data) {
                        Runnable callbackFunc = new Runnable() {
                            @Override
                            public void run() {
                                Log.d(Constants.TAG, "on switch account");
                                if (retCode != Constants.ErrorCode.ERR_OK) {
                                    ChannelAPINative.onSwitchAccount(id, retCode, null);
                                    return;
                                }
                                try {
                                    Log.d(Constants.TAG, String.format("switch account callback %s %s", data.getString("token"), data.getString("others")));
                                    ChannelAPINative.onSwitchAccount(id, retCode, data.toString().getBytes("UTF-8"));
                                } catch (Exception e) {
                                    Log.e(Constants.TAG, "fail to get result", e);
                                    ChannelAPINative.onSwitchAccount(id, Constants.ErrorCode.ERR_INTERNAL, null);
                                }
                            }

                        };
                        mRunEnv.run(callbackFunc);
                    }
                });
                // if the request failed, run callback immediately
                if (!isStarting) {
                    Runnable callbackFunc = new Runnable() {
                        @Override
                        public void run() {
                            ChannelAPINative.onSwitchAccount(id, Constants.ErrorCode.ERR_FAIL,
                                    null);
                        }
                    };
                    mRunEnv.run(callbackFunc);
                }
            }
        });
    }

    /**
     * create the toolbar and show it in (x,y)
     * @param position
     */
    public static void createAndShowToolBar(final int position) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.createToolBar(mActivity, position);
                showFloatBar(true);
            }
        });

    }

    /**
     * show platform toolbar
     * @param visible
     */
    public static void showFloatBar(final boolean visible) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.showFloatBar(mActivity, visible);
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
                ChannelInterface.destroyToolBar(mActivity);
            }
        });
    }

    /**
     * notify the platform we are coming back from a pause
     * @param id
     */
    public static void onResume(final int id) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.onResume(mActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        Runnable callbackFunc = new Runnable() {
                            @Override
                            public void run() {
                                ChannelAPINative.onPause();
                            }
                        };
                        mRunEnv.run(callbackFunc);
                    }
                });
            }
        });
    }

    /**
     * notify the platform we are coming back from a pause
     */
    public static void onPause() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.onPause(mActivity);
            }
        });
    }

    /**
     * request anti addiction info
     * @param id
     * @throws UnsupportedEncodingException
     */
    public static void antiAddiction(final int id) throws UnsupportedEncodingException {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.antiAddiction(mActivity,
                        new IDispatcherCb() {
                            @Override
                            public void onFinished(final int retCode, final JSONObject data) {
                                Runnable callbackFunc = new Runnable() {
                                    @Override
                                    public void run() {
                                        try {
                                            ChannelAPINative.onAntiAddiction(id, retCode, data.getInt("flag"));
                                        } catch (Exception e) {
                                            Log.e(Constants.TAG, "fail to get result", e);
                                            ChannelAPINative.onAntiAddiction(id, Constants.ErrorCode.ERR_INTERNAL,
                                                    Constants.ANTI_ADDICTION_ADULT);
                                        }
                                    }
                                };
                                mRunEnv.run(callbackFunc);
                            }
                        });
            }
        });
    }

    /**
     * exit the underlying channel sdk
     */
    public static void exit() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.exit(mActivity, new IDispatcherCb() {
                    @Override
                    public void onFinished(int retCode, JSONObject data) {
                        if (retCode == Constants.ErrorCode.ERR_OK) {
                            mRunEnv.run(new Runnable() {
                                @Override
                                public void run() {
                                    ChannelAPINative.onExit();
                                }
                            });
                        }
                    }
                });
            }
        });
    }

    public static boolean isSupportProtocol(String protocol) {
        return ChannelInterface.isSupportProtocol(protocol);
    }

    public static void runProtocol(final int id,
                                   final byte[] protocol,
                                   final byte[] message) throws UnsupportedEncodingException {
        final String strProtocol = new String(protocol, "UTF-8");
        final String strMessage = new String(message, "UTF-8");
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ChannelInterface.runProtocol(mActivity, strProtocol, strMessage,
                        new IDispatcherCb() {
                            @Override
                            public void onFinished(int retCode, JSONObject data) {
                                try {
                                    ChannelAPINative.onProtocolDone(id, retCode, strProtocol.getBytes("UTF-8"),
                                            data.toString().getBytes("UTF-8"));
                                } catch (UnsupportedEncodingException e) {
                                    Log.e(Constants.TAG, "encode error", e);
                                    ChannelAPINative.onProtocolDone(id, retCode, null, null);
                                }
                            }
                        });
            }
        });
    }

    /**
     * get current channel name
     * @return
     */
    public static byte[] getChannelName() throws UnsupportedEncodingException {
        return ChannelInterface.getChannelName().getBytes("UTF-8");
    }

    /**
     * get user id of this channel
     * @return user id
     */
    public static byte[] getUid() throws UnsupportedEncodingException {
        return ChannelInterface.getUin().getBytes("UTF-8");
    }

    /**
     * get user token of this channel
     * @return user token
     */
    public static byte[] getToken() throws UnsupportedEncodingException {
        return ChannelInterface.getToken().getBytes("UTF-8");
    }

    /**
     * whether user is logined
     * @return whether user is logined
     */
    public static boolean isLogined() {
        return ChannelInterface.isLogined();
    }

    public static byte[] getPayToken() throws UnsupportedEncodingException {
        return ChannelInterface.getChannelName().getBytes("UTF-8");
    }

    public static boolean onLoginRsp(byte[] rsp) throws UnsupportedEncodingException {
        return ChannelInterface.onLoginRsp(new String(rsp, "UTF-8"));
    }

    public static void submitPlayerInfo(byte[] roleId,
                                        byte[] roleName,
                                        byte[] roleLevel,
                                        int zoneId,
                                        byte[] zoneName) {
        try {
            ChannelInterface.submitPlayerInfo(mActivity,
                    new String(roleId, "UTF-8"),
                    new String(roleName, "UTF-8"),
                    new String(roleLevel, "UTF-8"),
                    zoneId,
                    new String(zoneName, "UTF-8"));
        } catch (UnsupportedEncodingException e) {
            Log.e(Constants.TAG, "Fail to convert utf-8 string", e);
        }
    }
}
