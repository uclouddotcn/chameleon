package prj.chameleon.test;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.util.Log;
import android.view.View;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public class TestChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static final String TAG = TestChannelAPI.class.getSimpleName();

    public static class UserInfo {
        public String mUid = "";
        public String mSession = "";
        public boolean mIsLogined = false;
    }
    public UserInfo mUserInfo = new UserInfo();
    @Override
    public void charge(Activity activity, String orderId, String uidInGame, String userNameInGame, String serverId, String currencyName, String payInfo, int rate, int realPayMoney, boolean allowUserChange, final IDispatcherCb cb) {
        Log.i(TAG, "'pay()' method is called");
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(0, null);
            }
        });
    }

    @Override
    public void buy(Activity activity, String orderId, String uidInGame, String userNameInGame, String serverId, String productName, String productID, String payInfo, int productCount, int realPayMoney, final IDispatcherCb cb) {
        Log.i(TAG, "'pay()' method is called");
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(0, null);
            }
        });
    }

    @Override
    public String getId() {
        Log.i(TAG, "'getId()' method is called");
        return "test";
    }

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        Log.i(TAG, "'initCfg()' method is called");
    }

    @Override
    public void init(Activity activity, final IDispatcherCb cb) {
        Log.i(TAG, "'init()' method is called");
        mChannel = "test";
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(0, null);
            }
        });
    }


    @Override
    public void login(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        Log.i(TAG, "'login()' method is called");
        showLoginDialog(activity, new IActionCallback() {
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
        Log.i(TAG, "'onLoginRsp()' method is called");
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
        Log.i(TAG, "'logout()' method is called");
        mUserInfo.mIsLogined = false;
    }

    @Override
    public String getUid() {
        Log.i(TAG, "'getUid()' method is called");
        return mUserInfo.mUid;
    }

    @Override
    public String getToken() {
        Log.i(TAG, "'getToken()' method is called");
        return mUserInfo.mSession;
    }

    @Override
    public boolean isLogined() {
        Log.i(TAG, "'isLogined()' method is called");
        return mUserInfo.mIsLogined;
    }

    @Override
    public void exit(final Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                showDialog(activity ,cb);
            }
        });
    }

    @Override
    public boolean isSupportSwitchAccount() {
        Log.i(TAG, "'isSupportSwitchAccount()' method is called");
        return true;
    }

    @Override
    public boolean switchAccount(Activity activity,final IDispatcherCb cb) {
        Log.i(TAG, "'switchAccount()' method is called");
        logout(activity);
        login(activity, new IDispatcherCb() {
            @Override
            public void onFinished(int retCode, JSONObject data) {
                if (retCode == Constants.ErrorCode.ERR_OK) {
                    cb.onFinished(retCode, data);
                } else {
                    cb.onFinished(retCode, null);
                }
            }
        }, null);
        return true;
    }

    protected void showDialog(Activity activity, final IDispatcherCb cb) {
        AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        builder.setTitle("提示");
        builder.setMessage("确认退出吗？");
        builder.setPositiveButton("确定", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                Log.i(TAG, "'exit(): OK' method is called");
                dialog.dismiss();
            }
        });
        builder.setNegativeButton("取消", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                Log.i(TAG, "'exit(): CANCEL' method is called");
                dialog.dismiss();
            }
        });
        builder.create().show();
    }

    private int userNum = 0;
    public void showLoginDialog(Activity activity, final IActionCallback callback){
        AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        builder.setTitle("请选择要登录的测试账号：");
        builder.setSingleChoiceItems(new String[]{"test_0 登录支付都成功", "test_1 登录即失败", "test_2 登录成功支付失败"}, 0, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                userNum = which;
            }
        });
        builder.setPositiveButton("登录", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                if (userNum == -1) {
                    callback.onAction(-1, null);
                } else {
                    callback.onAction(0, "test_" + userNum);
                }
                dialog.dismiss();
            }
        });
        builder.setNegativeButton("取消", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.dismiss();
            }
        });
        builder.show();
    }
}
