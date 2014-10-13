package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

public class SingleSDKChannelAPI {
    public static abstract class SingleSDK implements IChannelPayAPI, IChannelUserAPI {
        protected String mChannel;

        @Override
        public void init(Activity activity, IDispatcherCb cb) {
        }

        public void setChannel(String channelName) {
            mChannel = channelName;
        }

        @Override
        public void loginGuest(Activity activity, final IDispatcherCb loginCallback, IAccountActionListener accountActionListener) {
            login(activity, new IDispatcherCb() {
                @Override
                public void onFinished(int retCode, JSONObject data) {
                    if (retCode == Constants.ErrorCode.ERR_OK) {
                        JSONObject obj = JsonMaker.makeLoginGuestResponse(false, data);
                        loginCallback.onFinished(retCode, obj);
                    } else {
                        loginCallback.onFinished(retCode, null);
                    }
                }
            }, accountActionListener);
        }

        @Override
        public boolean registGuest(Activity activity, String tips, IDispatcherCb cb) {
            return false;
        }

        @Override
        public boolean onLoginRsp(String loginRsp) {
            JSONObject obj = null;
            try {
                obj = new JSONObject(loginRsp);
                int code = obj.getInt("code");
                if (code != Constants.ErrorCode.ERR_OK) {
                    return false;
                } else {
                    return true;
                }
            } catch (JSONException e) {
                Log.e(Constants.TAG, "Fail to parse login rsp", e);
                return false;
            }
        }

        @Override
        public boolean isSupportSwitchAccount() {
            return false;
        }

        @Override
        public boolean switchAccount(Activity activity, IDispatcherCb cb) {
            return false;
        }

        @Override
        public void antiAddiction(Activity activity, final IDispatcherCb cb) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    JSONObject ret = new JSONObject();
                    try {
                        ret.put("flag", Constants.ANTI_ADDICTION_ADULT);
                        cb.onFinished(Constants.ErrorCode.ERR_OK, ret);
                    } catch (JSONException e) {
                        cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                    }

                }
            });
        }

        @Override
        public boolean runProtocol(Activity activity, String protocol, String message, IDispatcherCb cb) {
            return false;
        }

        @Override
        public boolean isSupportProtocol(String protocol) {
            return false;
        }

        @Override
        public void onActivityResult(int requestCode, int resultCode, Intent data) {

        }

        @Override
        public void createToolBar(Activity activity, int position) {

        }

        @Override
        public void showFloatBar(Activity activity, boolean visible) {

        }

        @Override
        public void destroyToolBar(Activity activity) {

        }

        @Override
        public void onResume(Activity activity, final IDispatcherCb cb) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                }
            });
        }

        @Override
        public void onPause(Activity activity) {

        }


        @Override
        public JSONObject getPayInfo() {
            return null;
        }

        @Override
        public void onApplicationEvent(int event, Object... arguments) {

        }

        @Override
        public void submitPlayerInfo(Activity activity,
                                     String roleId,
                                     String roleName,
                                     String roleLevel,
                                     int zoneId,
                                     String zoneName) {

        }

        @Override
        public void onDestroy(Activity activity) {

        }
    }
}
