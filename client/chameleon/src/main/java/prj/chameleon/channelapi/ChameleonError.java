package prj.chameleon.channelapi;

/**
 * Created by wushauk on 3/24/14.
 */
public class ChameleonError extends Error {
    public ChameleonError(String errMsg) {
        mErrMsg = errMsg;
    }

    public String getErrMsg() {
        return mErrMsg;
    }

    private String mErrMsg;
}
