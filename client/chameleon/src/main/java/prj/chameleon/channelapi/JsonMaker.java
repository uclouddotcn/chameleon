package prj.chameleon.channelapi;

import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

public class JsonMaker {
    /**
     * make login info json object
     * @param token tokens from the platform
     * @param others other information from the platform SDK, useful for backend or using later.
     * @param channel the channel
     * @return Login Info
     */
	public static JSONObject makeLoginResponse(String token,
                                               String others,
											   String channel) {
		if (token == null || channel == null) {
			return null;
		}

		JSONObject ret = null;
		try {
			ret = new JSONObject();
            if (others != null) {
                ret.put("others", others);
            }
			ret.put("token", token);
			ret.put("channel", channel);
		} catch (JSONException e) {
			ret = null;
            Log.e(Constants.TAG, "fail to make json", e);
        }
		return ret;
    }

    /**
     * make login guest response
     * @param isGuest if the user logged in as a guest, if so, loginInfo will be ignored
     * @param loginInfo the structure made from makeLoginResponse
     * @return Guest Login Info
     */
    public static JSONObject makeLoginGuestResponse(boolean isGuest,
                                                    JSONObject loginInfo) {
        JSONObject ret = null;
        try {
            if (isGuest) {
                ret = new JSONObject();
                ret.put("guest", 1);
            } else {
                ret = new JSONObject();
                ret.put("guest", 0);
                ret.put("loginInfo", loginInfo);
            }
        } catch (JSONException e) {
            ret = null;
            Log.e(Constants.TAG, "fail to make json", e);
        }
        return ret;
    }
}
