package prj.chameleon.channelapi;

import org.json.JSONObject;

/**
 * Created by wushauk on 4/14/14.
 */
public interface IAccountActionListener {
    /**
     *  called just before the user switch the account, the uin and session is still valid here
     *  APP can save the user data here
     */
    public abstract void preAccountSwitch();

    /**
     * Previous user has logged out, and maybe has logged in here
     * @param code ERR_OK means the another account has logged in, otherwise the no one has logged in
     *             APP maybe need to show the login activity again
     * @param newUserInfo if another account has logged in, then the user info is passed here, the
     *                    structure is same as ChannelInterface.login
     */
    public abstract void afterAccountSwitch(int code, JSONObject newUserInfo);

    /**
     * callback when the user has logged out
     */
    public abstract void onAccountLogout();

    /**
     * if the user logged in as a guest and later an account is bound to this guest, this callback will
     * be fired with the new account info.
     * @param newUserInfo the bound account info. The structure is same as ChannelInterface.login
     */
    public abstract void onGuestBind(JSONObject newUserInfo);

}
