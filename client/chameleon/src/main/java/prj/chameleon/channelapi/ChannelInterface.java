package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 *  ChannelInterface is the only interface for client to use
 */
public class ChannelInterface {

    /**
     * init the SDK
     * @param activity the activity to give the real SDK
     *
     * @param isDebug (deprecated) whether set sdk to debug mode
     * @param cb callback function when the request is finished, the JSON object is null
     */
	public static void init(final Activity activity,
                            boolean isDebug,
			  		        final IDispatcherCb cb) {
        Log.d(Constants.TAG, "on init from channel interface");
        _plugins.init(activity, cb);
	}

    /**
     * test if in debug mode
     * @return {boolean}, whether in debug mode
     */
    public static boolean isDebug() {
        return isDebug;
    }

    /**
     * set debug mode
     * @param debug if debug mode
     */
    public static void setDebug(boolean debug) {
        isDebug = debug;
    }

    /**
     * get channel user id
     * @return channel user id
     */
    public static String getUin() {
        return _plugins.mUserApi.getUid();
    }

    /**
     * user have loggined or not
     * @return true if the user have already logged in
     */
    public static boolean isLogined() {
        return _plugins.mUserApi.isLogined();
    }

    /**
     * get the token of this session
     * @return the token of the channel
     */
    public static String getToken() {
        return _plugins.mUserApi.getToken();
    }

    /**
     * get the pay token of this session
     * @return the pay token of this channel
     */
    public static String getPayToken() {
        JSONObject res = new JSONObject();
        try {
            res.put("ch", _plugins.getChannelName());
            JSONObject obj = _plugins.mPayApi.getPayInfo();
            if (obj != null) {
                res.put("i", obj);
            }
            return res.toString();
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to compose pay token");
            return "";
        }
    }

    /**
     * feed the login rsp from the chameleon server to SDK
     * @param rsp the login rsp from chameleon server
     * @return true if login rsp succeeds, false otherwise
     */
    public static boolean onLoginRsp(String rsp) {
        return _plugins.mUserApi.onLoginRsp(rsp);
    }

    /**
     * login as a guest
     * @param activity the activity to give the real SDK
     * @param loginCallback callback when login guest if finished ,JSON object will have one or three fields
     *                      guest : if this is non-zero, then the user login as a guest, following two
     *                              fields will not exists
     *                      token : the access token from the channel
     *                      others: a segment of json string for SDK server
     * @param accountActionListener listener of the user account actions, refer to the interface definition
     */
    public static void loginGuest(Activity activity,
                                  IDispatcherCb loginCallback,
                                  IAccountActionListener accountActionListener) {
        _plugins.mUserApi.loginGuest(activity, loginCallback, accountActionListener);
    }

    /**
     * register guest, if the user is not login as a guest, this function does nothing
     * @param activity  the activity to give the real SDK
     * @param tips the tips for the register, not all channel support customize the tips
     * @param cb callback of the binding request
     *
     * @return boolean, true when user login as a guest and the register can continue, otherwise false
     */
    public static boolean registGuest(Activity activity, String tips, IDispatcherCb cb) {
        return _plugins.mUserApi.registGuest(activity, tips, cb);
    }

    /**
     * user login to channel
     * @param activity the activity to give the real SDK
     * @param cb JSON object will have two fields
     *           token : the access token from the channel
     *           others: a segment of json string for SDK server
     * @param accountActionListener listener of the user account actions, refer to the interface definition
     */
    public static void login(Activity activity,
                             IDispatcherCb cb,
                             IAccountActionListener accountActionListener) {
		_plugins.mUserApi.login(activity, cb, accountActionListener);
	}


    /**
     * user charge the currency in the game
     * @param activity
     * @param orderId the order id from server
     * @param uidInGame player id in the game
     * @param userNameInGame  player name in the game
     * @param serverId  current server id
     * @param currencyName the currency name
     * @param payInfo the additional payinfo from chameleon server
     * @param rate the rate of the game currency to RMB, e.g. ￥1.0 can buy 10 game currency, then
     *             rate = 10
     * @param realPayMoney the real money to pay
     * @param allowUserChange can user change the amnout he paid
     * @param cb JSON object will be null
     */
    public static void charge(Activity activity,
                              String orderId,
                              String uidInGame,
                              String userNameInGame,
                              String serverId,
                              String currencyName,
                              String payInfo,
                              int rate,
                              int realPayMoney,
                              boolean allowUserChange,
                              IDispatcherCb cb) {
		_plugins.mPayApi.charge(activity, orderId, uidInGame, userNameInGame,
                serverId, currencyName, payInfo, rate, realPayMoney,
                allowUserChange, cb);
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
     * @param payInfo the additional payinfo from chameleon server
     * @param productCount the count of product
     * @param realPayMoney the real money to pay
     * @param cb JSON object will be null
     */
    public static void buy(android.app.Activity activity,
                           String orderId,
                           String uidInGame,
                           String userNameInGame,
                           String serverId,
                           String productName,
                           String productID,
                           String payInfo,
                           int productCount,
                           int realPayMoney,
                           IDispatcherCb cb) {
        _plugins.mPayApi.buy(activity, orderId, uidInGame, userNameInGame,
                serverId, productName, productID, payInfo, productCount,
                realPayMoney, cb);
    }

    /**
     * user logout
     * @param activity the activity to give the real SDK
     */
    public static void logout(Activity activity) {
        _plugins.mUserApi.logout(activity);
    }

    public static boolean isSupportSwitchAccount() {
        return _plugins.mUserApi.isSupportSwitchAccount();
    }
    /**
     * for user to switch the account, to many channel it performs logout then login
     * @param activity the activity to give the real SDK
     * @param cb callback when switch done, the ret value is the same as login
     * @return boolean, whether the switch account starts
     */
    public static boolean switchAccount(Activity activity, IDispatcherCb cb) {
        return _plugins.mUserApi.switchAccount(activity, cb);
    }

    /**
     * create the float tool bar ( required by 91, UC)
     * @param activity the activity to give the real SDK
     * @param position refer to Constant.Toolbar*
     */
    public static void createToolBar(Activity activity, int position) {
        isToobarCreated = true;
        _plugins.mUserApi.createToolBar(activity, position);
    }

    /**
     *  show or hide the float tool bar (required by 91, UC)
     * @param activity the activity to give the real SDK
     * @param visible true for show, false for hide
     */
    public static void showFloatBar(Activity activity, boolean visible) {
        _plugins.mUserApi.showFloatBar(activity, visible);
    }

    /**
     *  destroy the tool bar
     * @param activity the activity to give the real SDK
     */
    public static void destroyToolBar(Activity activity) {
        isToobarCreated = false;
        _plugins.mUserApi.destroyToolBar(activity);
    }

    /**
     *  when the app is activate from the background( refer to 91 doc, only required by 91)
     * @param activity the activity to give the real SDK
     * @param cb JSON object will be null
     */
    public static void onResume(Activity activity, IDispatcherCb cb) {
        _plugins.onResume(activity, cb);
    }

    /**
     *  when the app is stopped
     * @param activity the activity to give the real SDK
     */
    public static void onPause(Activity activity) {
        _plugins.onPause(activity);
    }

    /**
     *  when the app is onStarted
     * @param activity the activity to give the real SDK
     */
    public static void onStart(Activity activity) {
        _plugins.onStart(activity);
    }

    /**
     *  when the app is onStop
     * @param activity the activity to give the real SDK
     */
    public static void onStop(Activity activity) {
        _plugins.onStop(activity);
    }

    /**
     *  when the app is onNewIntent
     * @param activity the activity to give the real SDK
     */
    public static void onNewIntent(Activity activity, Intent intent) {
        _plugins.onNewIntent(activity, intent);
    }

    /**
     *  when the app is stopped
     * @param activity the activity to give the real SDK
     */
    public static void onDestroy(Activity activity) {
        if (isToobarCreated) {
            destroyToolBar(activity);
        }
        _plugins.onDestroy(activity);
    }

    /**
     *  check if the user is adult, if the channel doesn't provide this interface, user will be
     *  treated as adult
     * @param activity the activity to give the real SDK
     * @param cb JSON object will receive flag:
     *           ANTI_ADDICTION_ADULT
     *           ANTI_ADDICTION_CHILD
     *           ANTI_ADDICTION_UNKNOWN
     */
    public static void antiAddiction(Activity activity,
                                     IDispatcherCb cb) {
        _plugins.mUserApi.antiAddiction(activity, cb);
    }

    /**
     * destroy the sdk instance
     * @param activity
     */
    public static void exit(Activity activity, final IDispatcherCb cb) {
        _plugins.exit(activity, new IDispatcherCb() {

            @Override
            public void onFinished(int retCode, JSONObject data) {
                cb.onFinished(retCode, data);
            }
        });
    }

    /**
     * run additional protocol
     * @param activity
     * @param protocol the additional protocol
     * @param message the input message of the protocol
     * @param cb can be null, otherwise it will called when the sdk is desctoryed, JSON will be null
     */
    public static boolean runProtocol(Activity activity,
                               String protocol,
                               String message,
                               IDispatcherCb cb) {
        return _plugins.mUserApi.runProtocol(activity, protocol, message, cb);
    }

    /**
     * 当前SDK是否支持该函数
     * @param protocol protocol名称
     * @return
     */
    public static boolean isSupportProtocol(String protocol) {
        return _plugins.mUserApi.isSupportProtocol(protocol);
    }

    /**
     * submit player login info, for uc, oppo
     * @param activity activity
     * @param roleId player id
     * @param roleName player name
     * @param roleLevel player level
     * @param zoneId zone id
     * @param zoneName zone name
     */
    public static void submitPlayerInfo(Activity activity,
                                        String roleId,
                                        String roleName,
                                        String roleLevel,
                                        int zoneId,
                                        String zoneName) {
        _plugins.mUserApi.submitPlayerInfo(activity, roleId, roleName, roleLevel,
                zoneId, zoneName);
    }

    /**
     *
     * @param event refer to Constants.ApplicationEvent
     * @param arguments the var-arguments for this event
     */
    public static void onApplicationEvent(int event, Object... arguments) {
        _plugins.onApplicationEvent(event, arguments);
    }

    /**
     *
     * @return get current channel name
     */
	public static String getChannelName() {
		return _plugins.getChannelName();
	}

    static void setChannelName(String channelName) {
        _plugins.setChannelName(channelName);
    }
    /**
     * on activity result, the parameter is the same as Activity.onActivityResult
     * @param requestCode
     * @param resultCode
     * @param data
     */
    public static void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        _plugins.onActivityResult(activity, requestCode, resultCode, data);
    }


    //push

    /**
     * enable push
     * @param activity
     */
    public static void enablePush(Activity activity){
        _plugins.mPushApi.enablePush(activity);
    }

    /**
     * disable push
     * @param activity
     */
    public static void disablePush(Activity activity){
        _plugins.mPushApi.disablePush(activity);
    }

    /**
     * resume push
     * @param activity
     */
    public static void resumePush(Activity activity){
        _plugins.mPushApi.resumePush(activity);
    }


    /**
     * set tags
     * @param activity activity
     * @param tags Tags list to be set
     * @param cb callback
     */
    public static void setTags(Activity activity, List<String> tags, IDispatcherCb cb){
        _plugins.mPushApi.setTags(activity, tags, cb);
    }

    /**
     * get tags
     * @param activity activity
     * @param cb callback
     * @return Tags list
     */
    public static void getTags(Activity activity, IDispatcherCb cb){
        _plugins.mPushApi.getTags(activity, cb);
    }

    /**
     * delete tags
     * @param activity activity
     * @param tags Tags list to be delete
     * @param cb callback
     */
    public static void delTags(Activity activity, List<String> tags, IDispatcherCb cb){
        _plugins.mPushApi.delTags(activity, tags, cb);
    }


    /**
     * enable debug Mode
     * @param debugEnable whether to enable debug mode
     */
    public static void enableDebugMode(boolean debugEnable){
        _plugins.mPushApi.enableDebugMode(debugEnable);
    }

    /**
     * set no disturb mode
     * @param startHour start hour
     * @param startMinute start minute
     * @param endHour end hour
     * @param endMinute end minute
     */
    public static void setNoDisturbMode(int startHour, int startMinute, int endHour, int endMinute){
        _plugins.mPushApi.setNoDisturbMode(startHour, startMinute, endHour, endMinute);
    }


    /**
     *  the channel implementation for current package
     */
    private static class Plugins {
        private ArrayList<APIGroup> mApiGroups = new ArrayList<APIGroup>();
        private IChannelUserAPI mUserApi;
        private IChannelPayAPI mPayApi;
        private IChannelPushAPI mPushApi;
        private String mChannelName;
        private boolean mInited = false;

        public void onResume(final Activity activity, final IDispatcherCb cb) {
            if (!mInited) {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                return;
            }
            final Iterator<APIGroup> iterator = mApiGroups.iterator();
            final Runnable initProc = new Runnable() {
                @Override
                public void run() {
                    if (!iterator.hasNext()) {
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        return;
                    }
                    APIGroup group = iterator.next();
                    group.onResume(activity, new IDispatcherCb() {
                        @Override
                        public void onFinished(int retCode, JSONObject data) {
                            if (retCode != Constants.ErrorCode.ERR_OK) {
                                cb.onFinished(retCode, null);
                                return;
                            }
                            run();
                        }
                    });
                }
            };
            initProc.run();
        }

        public void onPause(Activity activity) {
            if (!mInited) {
                return;
            }
            for (APIGroup group : mApiGroups) {
                group.onPause(activity);
            }
        }

        public void onDestroy(Activity activity) {
            for (APIGroup group : mApiGroups) {
                group.onDestroy(activity);
            }
            mInited = false;
        }

        public void init(final Activity activity, final IDispatcherCb cb) {
            final Iterator<APIGroup> iterator = mApiGroups.iterator();
            final Runnable initProc = new Runnable() {
                @Override
                public void run() {
                    if (!iterator.hasNext()) {
                        mInited = true;
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        return;
                    }
                    APIGroup group = iterator.next();
                    group.init(activity, new IDispatcherCb() {
                        @Override
                        public void onFinished(int retCode, JSONObject data) {
                            if (retCode != Constants.ErrorCode.ERR_OK) {
                                cb.onFinished(retCode, null);
                                return;
                            }
                            run();
                        }
                    });
                }
            };
            initProc.run();
        }

        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (!mInited) {
                return;
            }
            for (APIGroup group : mApiGroups) {
                group.onActivityResult(activity, requestCode, resultCode, data);
            }
        }

        public void onApplicationEvent(int event, Object... arguments) {
            for (APIGroup group : mApiGroups) {
                group.onApplicationEvent(event, arguments);
            }
        }

        public void exit(final Activity activity, final IDispatcherCb cb) {
            // only user api can blocks the exit, other callback will be ignored
            mUserApi.exit(activity, new IDispatcherCb() {
                @Override
                public void onFinished(int retCode, JSONObject data) {
                    if (retCode != Constants.ErrorCode.ERR_OK) {
                        cb.onFinished(retCode, null);
                        return;
                    }
                    final Iterator<APIGroup> iterator = mApiGroups.iterator();
                    final Runnable initProc = new Runnable() {
                        @Override
                        public void run() {
                            if (!iterator.hasNext()) {
                                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                                return;
                            }
                            APIGroup group = iterator.next();
                            if (group.getApi() == mUserApi) {
                                run();
                                return;
                            }
                            group.exit(activity, new IDispatcherCb() {
                                @Override
                                public void onFinished(int retCode, JSONObject data) {
                                    run();
                                }
                            });
                        }
                    };
                    initProc.run();
                }
            });
        }

        private void addApiGroup(APIGroup group) {
            if (group == null) {
                throw new RuntimeException("empty api group");
            }
            if (group.testType(Constants.PluginType.USER_API)) {
                if (mUserApi != null) {
                    throw new RuntimeException("user api is already registered");
                }
                mUserApi = (IChannelUserAPI) group.getApi();
            }
            if (group.testType(Constants.PluginType.PAY_API)) {
                if (mPayApi != null) {
                    throw new RuntimeException("pay api is already registered");
                }
                mPayApi = (IChannelPayAPI) group.getApi();
            }
            if (group.testType(Constants.PluginType.PUSH_API)) {
                if (mPushApi != null) {
                    throw new RuntimeException("push api is already registered");
                }
                mPushApi = (IChannelPushAPI) group.getApi();
            }
            mApiGroups.add(group);
        }

        public String getChannelName() {
            return mChannelName;
        }

        public void setChannelName(String channelName) {
            mChannelName = channelName;
        }

        public void onStart(Activity activity) {
            if (!mInited) {
                return;
            }
            for (APIGroup group : mApiGroups) {
                group.onStart(activity);
            }
        }

        public void onStop(Activity activity) {
            if (!mInited) {
                return;
            }
            for (APIGroup group : mApiGroups) {
                group.onStop(activity);
            }
        }

        public void onNewIntent(Activity activity, Intent intent) {
            if (!mInited) {
                return;
            }
            for (APIGroup group : mApiGroups) {
                group.onNewIntent(activity, intent);
            }
        }
    }
    private static Plugins _plugins = new Plugins();
    private static boolean isToobarCreated = false;
    private static boolean isDebug = false;

    public static void addApiGroup(APIGroup apiGroup) {
        _plugins.addApiGroup(apiGroup);
    }

}
