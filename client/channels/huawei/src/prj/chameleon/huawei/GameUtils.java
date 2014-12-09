package prj.chameleon.huawei;

import android.util.Log;
import prj.chameleon.channelapi.Constants;

class GameUtils {

    public static int mapError(String code) {
        Log.e(Constants.TAG, "huawei return code " + code);
        if ("30002".equals(code)) {
            return Constants.ErrorCode.ERR_FAIL;
        }
        return Constants.ErrorCode.ERR_UNKNOWN;
    }

}
