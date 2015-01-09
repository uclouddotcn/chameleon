package prj.chameleon.mzw;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import com.muzhiwan.sdk.login.MzwApiCallback;
import com.muzhiwan.sdk.login.MzwApiFactory;
import com.muzhiwan.sdk.utils.CallbackCode;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;



public final class MzwChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private String mAppId;
    private String mAppKey;
    private String mChannel;
    private boolean mIsLandscape;
    private int mScreenOrientation;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mAppId = cfg.getString("appId");
        mAppKey = cfg.getString("appKey");
        mChannel = commCfg.mChannel;
        mIsLandscape = commCfg.mIsLandscape;
        if (mIsLandscape){
            mScreenOrientation = MzwApiFactory.ORIENTATION_HORIZONTAL;
        }else{
            mScreenOrientation = MzwApiFactory.ORIENTATION_VERTICAL;
        }
    }


    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        MzwApiFactory.getInstance().init(activity, mScreenOrientation, new MzwApiCallback() {
                    @Override
                    public void onResult(int code, Object arg1) {

                    }
                });
    }



    public void setChannel(String channelName) {
        mChannel = channelName;
    }


    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        MzwApiFactory.getInstance().doLogin(activity, new MzwApiCallback(){

            @Override
            public void onResult(final int code, final Object data) {
                Log.i("mzw_net_modify", "data:" + data);
                    activity.runOnUiThread(new Runnable() {

                    @Override
                    public void run() {
                        if (code == CallbackCode.SUCCESS) {
                        } else if (code == CallbackCode.ERROR) {
                        } else if (code == CallbackCode.CANCEL) {
                        }

                    }
                });

            }
        });
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
    public void logout(final Activity activity) {
    }


    @Override
    public void charge(Activity activity,
                       String orderId,
                       String uidInGame,
                       String userNameInGame,//用户名
                       String serverId,
                       String currencyName,//货币名称
                       String payInfo,
                       int rate,//单价
                       int realPayMoney,//总价
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
    }

    @Override
    public void buy(Activity activity,
                    String orderId,
                    String uidInGame,
                    String userNameInGame,
                    String serverId,
                    String productName,
                    String productID,
                    String payInfo,
                    int productCount,//个数
                    int realPayMoney,
                    final IDispatcherCb cb) {
    }


    @Override
    public boolean registGuest(Activity activity, String tips, IDispatcherCb cb) {
        return false;
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
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {

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
        MzwApiFactory.getInstance().destroy(activity);
    }

    @Override
    public void onStart(Activity activity) {

    }

    @Override
    public void onStop(Activity activity) {

    }

    @Override
    public String getUid() {
        return null;
    }

    @Override
    public String getToken() {
        return null;

    }

    @Override
    public boolean isLogined() {
        return false;
    }

    @Override
    public String getId() {
        return null;
    }

    @Override
    public void exit(final Activity activity, final IDispatcherCb cb) {
    }
}

