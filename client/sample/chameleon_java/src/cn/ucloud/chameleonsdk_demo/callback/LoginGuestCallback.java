package cn.ucloud.chameleonsdk_demo.callback;

import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

import com.loopj.android.http.JsonHttpResponseHandler;
import com.loopj.android.http.RequestParams;

import cn.ucloud.chameleonsdk_demo.MainActivity;
import cn.ucloud.chameleonsdk_demo.tools.PlatformAPIRestClient;

import prj.chameleon.channelapi.IDispatcherCb;

public class LoginGuestCallback implements IDispatcherCb {

	private static String TAG = LoginGuestCallback.class.getSimpleName();
	
    private MainActivity mActivity;

	public  LoginGuestCallback(MainActivity activity) {
        mActivity = activity;
    }

    @Override
    public void onFinished(int retCode, final JSONObject data) {
        Log.i(TAG, "mlogin data is: " + data);
        
        RequestParams req = new RequestParams();
        try {
            int guest = data.getInt("guest");
            if (guest != 0) {
                mActivity.setUserInfo("login as a guest");
            } else {
                JSONObject loginInfo =  data.getJSONObject("loginInfo");
                req.put("others", (String) loginInfo.get("others"));
                req.put("token", (String) loginInfo.get("token"));
                PlatformAPIRestClient.get("/sdkapi/login",
                        req,
                        new JsonHttpResponseHandler() {
                            @Override
                            public void onSuccess(final JSONObject ret) {
                                mActivity.runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        mActivity.onGotAuthroizationCode(ret);
                                    }
                                });
                            }
                        }
                );
            }

        } catch (JSONException e) {
            Log.e(TAG, "fail to parse json", e);
        }

    }
}
