package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 *   Interface for the real platform SDK
 */
public interface IChannelUserAPI {

    /**
     * init the config of this channel
     * @param cfg config of this channel
     */
    public abstract void initCfg(Bundle cfg);

    /**
     * init the SDK
     * @param activity the activity to give the real SDK
     * @param isDebug whether set it in debug mode
     * @param cb callback function when the request is finished, the JSON object is null
     */
	public abstract void init(android.app.Activity activity,
                              boolean isDebug,
							  IDispatcherCb cb);


    /**
     * login as a guest
     * @param activity the activity to give the real SDK
     * @param loginCallback callback when login guest if finished ,JSON object will have one or three fields
     *                      guest : if this is non-zero, then the user login as a guest, following two
     *                              fields will not exists
     *                      token : the access token from the platform
     *                      others: a segment of json string for SDK server
     * @param accountActionListener listener of the user account actions, refer to the interface definition
     */
    public abstract void loginGuest(Activity activity,
                                     IDispatcherCb loginCallback,
                                     IAccountActionListener accountActionListener);

    /**
     * register guest, if the user is not login as a guest, this function does nothing
     * @param activity  the activity to give the real SDK
     * @param tips the tips for the register, not all platform support customize the tips
     * @param cb callback of the binding request
     * @return boolean, true when user login as a guest and the register can continue, otherwise false
     */
    public abstract boolean registGuest(Activity activity, String tips, IDispatcherCb cb);

    /**
     * user login to platform
     * @param activity the activity to give the real SDK
     * @param cb JSON object will have two fields
     *           token : the access token from the platform
     *           others: a segment of json string for SDK server
     * @param accountActionListener listener of the user account actions, refer to the interface definition
     */
	public abstract void login(android.app.Activity activity,
							   IDispatcherCb cb,
                               IAccountActionListener accountActionListener);


    /**
     * set the rsp from chameleon sdk server
     * @param loginRsp the rsp string from chameleon sdk server
     * @return whether the login is successed
     */
    public abstract boolean onLoginRsp(String loginRsp);

    /**
     * user logout
     * @param activity the activity to give the real SDK
     */
    public abstract void logout(Activity activity);

    /**
     * whether this platform support switch account interface, some platform only allows user change
     * the account through their toolbar(e.g. nd91)
     * @return true if the platform support it, otherwise not
     */
    public abstract boolean isSupportSwitchAccount();

    /**
     * for user to switch the account, to many platform it performs logout then login
     * @param activity the activity to give the real SDK
     * @param cb callback when switch done, the ret value is the same as login
     * @return boolean, whether the switch account starts
     */
    public abstract boolean switchAccount(Activity activity, IDispatcherCb cb);

    /**
     * create the float tool bar ( required by 91, UC)
     * @param activity the activity to give the real SDK
     * @param position refer to Constant.Toolbar*
     */
    public abstract void createToolBar(Activity activity, int position);

    /**
     *  show or hide the float tool bar (required by 91, UC)
     * @param activity the activity to give the real SDK
     * @param visible true for show, false for hide
     */
    public abstract void showFloatBar(Activity activity, boolean visible);

    /**
     *  destroy the tool bar
     * @param activity the activity to give the real SDK
     */
    public abstract void destroyToolBar(Activity activity);

    /**
     *  when the app is activate from the background( refer to 91 doc, only required by 91)
     * @param activity the activity to give the real SDK
     * @param cb JSON object will be null
     */
    public abstract void onResume(Activity activity, IDispatcherCb cb);

    /**
     *  when the app is stopped
     * @param activity the activity to give the real SDK
     */
    public abstract void onPause(Activity activity);

    /**
     *  check if the user is adult, if the platform doesn't provide this interface, user will be
     *  treated as adult
     * @param activity the activity to give the real SDK
     * @param cb JSON object will receive flag:
     *           ANTI_ADDITION_ADULT
     *           ANTI_ADDITION_CHILD
     *           ANTI_ADDITION_UNKNOWN
     */
    public abstract void antiAddiction(Activity activity,
                                     IDispatcherCb cb);


    /**
     * run additional protocol
     * @param activity
     * @param protocol the additional protocol
     * @param message the input message of the protocol
     * @param cb can be null, otherwise it will called when the sdk is desctoryed, JSON will be null
     */
    public boolean runProtocol(Activity activity, String protocol, String message,
                               IDispatcherCb cb);


    /**
     * is support addictional protocol
     * @param protocol the protocol name
     * @return true if the protocol is supported
     */
    public boolean isSupportProtocol(String protocol);

    /**
     * on activity result, the parameter is the same as Activity.onActivityResult
     * @param requestCode
     * @param resultCode
     * @param data
     */
    public void onActivityResult(int requestCode, int resultCode, Intent data);

    /**
     * get user id
     * @return user id of the login user, or empty string if not logined
     */
    public String getUid();

    /**
     * get token of this login session
     * @return the token, or empty string if user is not logined
     */
    public String getToken();

    /**
     * user is logined or not
     * @return true if user is logined, false otherwise
     */
    public boolean isLogined();

    /**
     *
     * @param event refer to Constants.ApplicationEvent
     * @param arguments the var-arguments for this event
     */
    public void onApplicationEvent(int event, Object... arguments);


    /**
     * submit player login info, for uc, oppo
     * @param activity activity
     * @param roleId player id
     * @param roleName player name
     * @param roleLevel player level
     * @param zoneId zone id
     * @param zoneName zone name
     */
    public void submitPlayerInfo(Activity activity,
                                 String roleId,
                                 String roleName,
                                 String roleLevel,
                                 int zoneId,
                                 String zoneName);

    /**
     * exit the user sdk
     * @param activity
     */
    public abstract void exit(Activity activity, IDispatcherCb cb);
}
