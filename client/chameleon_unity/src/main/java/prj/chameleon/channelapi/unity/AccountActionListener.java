package prj.chameleon.channelapi.unity;

import org.json.JSONObject;

import prj.chameleon.channelapi.IAccountActionListener;

/**
 * Created by wushauk on 4/21/14.
 */
public class AccountActionListener implements IAccountActionListener {
    private static String GAMEOBJ = "ChameleonSDK";
    @Override
    public void preAccountSwitch() {
        U3DHelper.SendMessage("preAccountSwitch", "");
    }

    @Override
    public void afterAccountSwitch(int code, JSONObject newUserInfo) {
        U3DHelper.SendMessage("onSwitchAccount", code, newUserInfo);
    }

    @Override
    public void onAccountLogout() {
        U3DHelper.SendMessage("onLogout", "");
    }

    @Override
    public void onGuestBind(JSONObject newUserInfo) {
        U3DHelper.SendMessage("onGuestBind", newUserInfo.toString());
    }

}
