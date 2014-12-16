package cn.ucloud.chameleonsdk_demo.callback;

import org.json.JSONObject;

import android.util.Log;

import cn.ucloud.chameleonsdk_demo.MainActivity;

import prj.chameleon.channelapi.IDispatcherCb;

public class BuyCallBack implements IDispatcherCb{

    private static String TAG = BuyCallBack.class.getSimpleName();

    private MainActivity mActivity;

    public BuyCallBack(MainActivity activity) {
        mActivity = activity;
    }

    @Override
    public void onFinished(int retCode, final JSONObject data) {
        Log.i(TAG, "mbuy reCode is: " + retCode + " data is:" + data);
        mActivity.setUserInfo("finish buy. Return code is "+retCode+", mbuy data is: " + data);
    }

}
