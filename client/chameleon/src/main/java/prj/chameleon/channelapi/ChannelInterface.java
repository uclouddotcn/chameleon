package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import org.json.JSONObject;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

/**
 *  ChannelInterface is the only interface for client to use
 */
public class ChannelInterface {

    /**
     * init the SDK
     * @param activity the activity to give the real SDK
     * @param isDebug whether set sdk to debug mode
     * @param cb callback function when the request is finished, the JSON object is null
     */
	public static void init(final Activity activity,
                            boolean isDebug,
			  		        final IDispatcherCb cb) {
        Log.d(Constants.TAG, "on init from channel interface");
        _channelAPI.init(activity, isDebug, cb);
	}

    /**
     * get channel user id
     * @return channel user id
     */
    public static String getUin() {
        return _channelAPI.getmUserAPI().getUid();
    }

    /**
     * user have loggined or not
     * @return true if the user have already logged in
     */
    public static boolean isLogined() {
        return _channelAPI.getmUserAPI().isLogined();
    }

    /**
     * get the token of this session
     * @return the token of the channel
     */
    public static String getToken() {
        return _channelAPI.getmUserAPI().getToken();
    }

    /**
     * get the pay token of this session
     * @return the pay token of this channel
     */
    public static String getPayToken() {
        return _channelAPI.getmPayAPI().getPayToken();
    }

    /**
     * feed the login rsp from the chameleon server to SDK
     * @param rsp the login rsp from chameleon server
     * @return
     */
    public static boolean onLoginRsp(String rsp) {
        return _channelAPI.getmUserAPI().onLoginRsp(rsp);
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
        _channelAPI.getmUserAPI().loginGuest(activity, loginCallback, accountActionListener);
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
        return _channelAPI.getmUserAPI().registGuest(activity, tips, cb);
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
		_channelAPI.getmUserAPI().login(activity, cb, accountActionListener);
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
		_channelAPI.getmPayAPI().charge(activity, orderId, uidInGame, userNameInGame,
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
        _channelAPI.getmPayAPI().buy(activity, orderId, uidInGame, userNameInGame,
                serverId, productName, productID, payInfo, productCount,
                realPayMoney, cb);
    }

    /**
     * user logout
     * @param activity the activity to give the real SDK
     */
    public static void logout(Activity activity) {
        _channelAPI.getmUserAPI().logout(activity);
    }

    public static boolean isSupportSwitchAccount() {
        return _channelAPI.getmUserAPI().isSupportSwitchAccount();
    }
    /**
     * for user to switch the account, to many channel it performs logout then login
     * @param activity the activity to give the real SDK
     * @param cb callback when switch done, the ret value is the same as login
     * @return boolean, whether the switch account starts
     */
    public static boolean switchAccount(Activity activity, IDispatcherCb cb) {
        return _channelAPI.getmUserAPI().switchAccount(activity, cb);
    }

    /**
     * create the float tool bar ( required by 91, UC)
     * @param activity the activity to give the real SDK
     * @param position refer to Constant.Toolbar*
     */
    public static void createToolBar(Activity activity, int position) {
        _channelAPI.getmUserAPI().createToolBar(activity, position);
    }

    /**
     *  show or hide the float tool bar (required by 91, UC)
     * @param activity the activity to give the real SDK
     * @param visible true for show, false for hide
     */
    public static void showFloatBar(Activity activity, boolean visible) {
        _channelAPI.getmUserAPI().showFloatBar(activity, visible);
    }

    /**
     *  destroy the tool bar
     * @param activity the activity to give the real SDK
     */
    public static void destroyToolBar(Activity activity) {
        _channelAPI.getmUserAPI().destroyToolBar(activity);
    }

    /**
     *  when the app is activate from the background( refer to 91 doc, only required by 91)
     * @param activity the activity to give the real SDK
     * @param cb JSON object will be null
     */
    public static void onResume(Activity activity, IDispatcherCb cb) {
        _channelAPI.getmUserAPI().onResume(activity, cb);
    }

    /**
     *  when the app is stopped
     * @param activity the activity to give the real SDK
     */
    public static void onPause(Activity activity) {
        _channelAPI.getmUserAPI().onPause(activity);
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
        _channelAPI.getmUserAPI().antiAddiction(activity, cb);
    }

    /**
     * destroy the sdk instance
     * @param activity
     */
    public static void exit(Activity activity, final IDispatcherCb cb) {
        _channelAPI.exit(activity, new IDispatcherCb() {

            @Override
            public void onFinished(int retCode, JSONObject data) {
                if (retCode == Constants.ErrorCode.ERR_OK) {
                    _channelAPI = null;
                }
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
        return _channelAPI.getmUserAPI().runProtocol(activity, protocol, message, cb);
    }

    public static boolean isSupportProtocol(String protocol) {
        return _channelAPI.getmUserAPI().isSupportProtocol(protocol);
    }


    /**
     *
     * @param event refer to Constants.ApplicationEvent
     * @param arguments the var-arguments for this event
     */
    public static void onApplicationEvent(int event, Object... arguments) {
        _channelAPI.onApplicationEvent(event, arguments);
    }

    /**
     *
     * @return get current channel name
     */
	public static String getChannelName() {
		return _channelAPI.getChannelName();
	}

    /**
     * on activity result, the parameter is the same as Activity.onActivityResult
     * @param requestCode
     * @param resultCode
     * @param data
     */
    public static void onActivityResult(int requestCode, int resultCode, Intent data) {
        _channelAPI.onActivityResult(requestCode, resultCode, data);
    }

    /**
     *  the channel implementation for current package
     */
	private static ChannelAPI _channelAPI = null;
    /**
     * loading the channel implementation according to the meta data
     */
	public static void loadChannelImp() {
        boolean isInited = false;
        try {
            Class<?> instClass = Class.forName("prj.chameleon.entry.Instantializer");
            Method m = instClass.getMethod("instantialize");
            _channelAPI = (ChannelAPI) m.invoke(null);
            isInited = true;
        } catch (ClassNotFoundException e) {
            Log.e(Constants.TAG, "while initing current channel imp", e);
        } catch (IllegalAccessException e) {
            Log.e(Constants.TAG, "while initing current channel imp", e);
        } catch (NoSuchMethodException e) {
            Log.e(Constants.TAG, "while initing current channel imp", e);
        } catch (InvocationTargetException e) {
            Log.e(Constants.TAG, "while initing current channel imp", e);
        }
        if (!isInited) {
            ChannelAPI inst = DummyChannelAPI.instantialize();
            _channelAPI = inst;
        }
	}
}
