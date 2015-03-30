package prj.chameleon.mopo;

import java.util.HashMap;
import java.util.Map;

import android.os.Handler;
import android.os.Message;

import com.skymobi.moposnsplatsdk.pay.MoposnsPlatPayServer;

import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IDispatcherCb;

public class PayResultHandle extends Handler {
    public static final String STRING_MSG_CODE = "msg_code";
    public static final String STRING_PAY_STATUS = "pay_status";
    public static final String STRING_CHARGE_STATUS = "3rdpay_status";
    public static final String STRING_ERR_CODE = "error_code";

    private IDispatcherCb mCb;

    void setCB(IDispatcherCb cb) {
        mCb = cb;
    }
    @Override
    public void handleMessage(Message msg) {
        super.handleMessage(msg);
        /*
        if (msg.what == MoposnsPlatPayServer.MSG_WHAT_TO_APP) {
            // 形式：key-value
            String retInfo = (String) msg.obj;
            Map<String, String> map = new HashMap<String, String>();
            String[] keyValues = retInfo.split("&|=");
            for (int i = 0; i < keyValues.length; i = i + 2) {
                map.put(keyValues[i], keyValues[i + 1]);
            }

            int msgCode = Integer.parseInt(map.get(STRING_MSG_CODE));

            if (msgCode == 101) {

                int errorCode = Integer.parseInt(map.get(STRING_ERR_CODE))
                if (mCb != null) {
                    mCb.onFinished(Constants.ErrorCode.);
                }
                return;
            }

            if (map.get(STRING_PAY_STATUS) != null) {

            } else if (map.get(STRING_CHARGE_STATUS) != null) {

            }
        }*/

    }
}
