package prj.chameleon.channelapi.unity;

import android.util.Log;

import com.unity3d.player.UnityPlayer;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.Constants;

/**
 * Created by wushauk on 6/9/14.
 */
public class U3DHelper {
    private static String GAMEOBJ = "ChameleonBridge";
    public static void SendMessage(String func, String result) {
        UnityPlayer.UnitySendMessage(GAMEOBJ, func, result);
    }


    public static void SendMessage(String func, int code, JSONObject result) {
        JSONObject r = new JSONObject();
        try {
            r.put("code", code);
            if (result != null) {
                r.put("data", result);
            }
            UnityPlayer.UnitySendMessage(GAMEOBJ, func, r.toString());
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to format messgae", e);
            UnityPlayer.UnitySendMessage(GAMEOBJ, func,
                    String.format("{\"code\": %d}", Constants.ErrorCode.ERR_INTERNAL));
        } catch (Exception e) {
            Log.e(Constants.TAG, "Fail to send message", e);
        }
    }


}
