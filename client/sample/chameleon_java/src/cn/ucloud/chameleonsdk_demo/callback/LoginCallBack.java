package cn.ucloud.chameleonsdk_demo.callback;

import org.json.JSONException;
import org.json.JSONObject;

import cn.ucloud.chameleonsdk_demo.MainActivity;
import cn.ucloud.chameleonsdk_demo.tools.PlatformAPIRestClient;

import com.loopj.android.http.JsonHttpResponseHandler;
import com.loopj.android.http.RequestParams;

import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IDispatcherCb;
import android.util.Log;

public class LoginCallBack implements IDispatcherCb{

    private static String TAG = LoginCallBack.class.getSimpleName();

    private MainActivity mActivity;

    public LoginCallBack(MainActivity mainActivity){
        this.mActivity = mainActivity;
    }
    @Override
    public void onFinished(int retCode, final JSONObject data) {
        //登录回调
        if (retCode != Constants.ErrorCode.ERR_OK) {
            mActivity.setUserInfo("登录异常，返回码为："+retCode);
            return;
        }

        Log.i(TAG, "以下是用户登录信息："+data);

        RequestParams req = new RequestParams();
        try {
            if (data.has("others")) {
                req.put("others", (String) data.get("others"));
            }
            req.put("token", (String) data.get("token"));
            req.put("channel", (String) data.get("channel"));
            PlatformAPIRestClient.get("/sdkapi/login",
                    req,
                    new JsonHttpResponseHandler() {
                        @Override
                        public void onSuccess(final JSONObject ret) {
                            Log.i(TAG, ret.toString());
                            mActivity.runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    mActivity.onGotAuthroizationCode(ret);
                                }
                            });
                            ChannelInterface.submitPlayerInfo(mActivity, "test", "test", "123", 2, "testzone");
                        }
                        @Override
                        public void onFailure(java.lang.Throwable e, org.json.JSONArray errorResponse) {
                            Log.e(TAG, "on failure", e);
                            if (errorResponse != null) {
                                Log.i(TAG, errorResponse.toString(), e);
                            }

                        }
                        @Override
                        public void onFailure(java.lang.Throwable e, org.json.JSONObject errorResponse) {
                            Log.e(TAG, "on failure", e);
                            if (errorResponse != null) {
                                Log.i(TAG, errorResponse.toString(), e);

                            }
                        }

                        @Override
                        protected java.lang.Object parseResponse(java.lang.String responseBody) throws org.json.JSONException
                        {
                            Object res = super.parseResponse(responseBody);
                            return res;
                        }
                    }
            );

        } catch (JSONException e) {
            Log.e(TAG, "fail to parse json", e);
        }
    }

}
