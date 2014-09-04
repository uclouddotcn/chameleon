package prj.chameleon.channelapi.cbinding;

import android.util.Log;

import org.json.JSONObject;

import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;

/**
 * Created by wushauk on 4/21/14.
 */
public class AccountActionListener implements IAccountActionListener {

    @Override
    public void preAccountSwitch() {
        ChannelAPINative.preAccountSwitch();
    }

    @Override
    public void afterAccountSwitch(int code, JSONObject newUserInfo) {
        try {
            ChannelAPINative.afterAccountSwitch(code, newUserInfo.toString().getBytes("UTF-8"));
        } catch (Exception e) {
            Log.e(Constants.TAG, "internal error", e);
        }
    }

    @Override
    public void onAccountLogout() {
        ChannelAPINative.onAccountLogout();
    }

    @Override
    public void onGuestBind(JSONObject newUserInfo) {
        try {
            ChannelAPINative.onGuestBind(newUserInfo.toString().getBytes("UTF-8"));
        } catch (Exception e) {
            Log.e(Constants.TAG, "internal error", e);
        }
    }

}
