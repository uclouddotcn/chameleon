package prj.chameleon.test;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IChannelPayAPI;
import prj.chameleon.channelapi.IChannelUserAPI;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

/**
 * Created by wushauk on 7/17/14.
 */
public class TestChannelAPI extends SingleSDKChannelAPI.SingleSDK {
    public static class UserInfo {
        public String mUid = new String();
        public String mSession = new String();
        public boolean mIsLogined = false;
    }
    public UserInfo mUserInfo = new UserInfo();
    @Override
    public void charge(Activity activity, String orderId, String uidInGame, String userNameInGame, String serverId, String currencyName, String payInfo, int rate, int realPayMoney, boolean allowUserChange, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(0, null);
            }
        });
    }

    @Override
    public void buy(Activity activity, String orderId, String uidInGame, String userNameInGame, String serverId, String productName, String productID, String payInfo, int productCount, int realPayMoney, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(0, null);
            }
        });
    }
    String mChannel;

    @Override
    public void initCfg(Bundle cfg) {

    }

    @Override
    public void init(Activity activity, boolean isDebug, final IDispatcherCb cb) {

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(0, null);
            }
        });
    }


    @Override
    public void login(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        UserAccount.getInstance().login(activity, new IActionCallback() {
            @Override
            public void onAction(int code, String value) {
                if (code == 0) {
                    JSONObject obj = JsonMaker.makeLoginResponse(value, "", mChannel);
                    mUserInfo.mIsLogined = true;
                    mUserInfo.mUid = value;
                    cb.onFinished(0, obj);
                } else {
                    cb.onFinished(code, null);
                }
            }
        });
    }

    @Override
    public boolean onLoginRsp(String loginRsp) {
        try {
            JSONObject obj = new JSONObject(loginRsp);
            int code = obj.getInt("code");
            JSONObject loginInfo = obj.getJSONObject("loginInfo");
            if (code == 0) {
                mUserInfo.mUid = loginInfo.getString("uid");
                mUserInfo.mSession = loginInfo.getString("token");
                return true;
            }
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to responds to loginrsp", e);
        }
        mUserInfo.mIsLogined = false;
        return false;
    }

    @Override
    public void logout(Activity activity) {
        mUserInfo.mIsLogined = false;
    }

    @Override
    public String getUid() {
        return mUserInfo.mUid;
    }

    @Override
    public String getToken() {
        return mUserInfo.mSession;
    }

    @Override
    public boolean isLogined() {
        return mUserInfo.mIsLogined;
    }


    @Override
    public String getPayToken() {
        return mUserInfo.mSession;
    }

    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
    }
}
