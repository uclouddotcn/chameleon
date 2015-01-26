package prj.chameleon.wandoujia;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;

import com.wandoujia.mariosdk.plugin.api.api.WandouGamesApi;
import com.wandoujia.mariosdk.plugin.api.model.callback.OnLoginFinishedListener;
import com.wandoujia.mariosdk.plugin.api.model.callback.OnLogoutFinishedListener;
import com.wandoujia.mariosdk.plugin.api.model.callback.OnPayFinishedListener;
import com.wandoujia.mariosdk.plugin.api.model.model.LoginFinishType;
import com.wandoujia.mariosdk.plugin.api.model.model.LogoutFinishType;
import com.wandoujia.mariosdk.plugin.api.model.model.PayResult;
import com.wandoujia.mariosdk.plugin.api.model.model.UnverifiedPlayer;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

/**
 * Created by wushauk on 8/11/14.
 */
public class WandoujiaChannelAPI extends SingleSDKChannelAPI.SingleSDK  {
    private WandouGamesApi mWandouGamesApi;
    private long mAppId;
    private String mAppKey;
    private boolean mIsDebug;
    @Override
    public void charge(Activity activity,
                       String orderId,
                       String uidInGame,
                       String userNameInGame,
                       String serverId,
                       String currencyName,
                       String payInfo,
                       int rate,
                       int realPayMoney,
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
        mWandouGamesApi.pay(activity, String.format("%s", currencyName), realPayMoney,
                orderId, new OnPayFinishedListener() {
            @Override
            public void onPaySuccess(PayResult payResult) {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

            @Override
            public void onPayFail(PayResult payResult) {
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
        });

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
                    int productCount,
                    int realPayMoney,
                    final IDispatcherCb cb) {
        mWandouGamesApi.pay(activity, String.format("%s*%d", productName, productCount), realPayMoney,
                orderId, new OnPayFinishedListener() {
            @Override
            public void onPaySuccess(PayResult payResult) {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

            @Override
            public void onPayFail(PayResult payResult) {
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);

            }
        });
    }

    @Override
    public String getId() {
        return "wandoujia";
    }

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        Log.e("appId", cfg.getString("appId"));
        mAppId = Integer.valueOf(cfg.getString("appId"));
        mAppKey = cfg.getString("appKey");
        mIsDebug = commCfg.mIsDebug;
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        mWandouGamesApi.init(activity);
        mWandouGamesApi.setLogEnabled(mIsDebug);
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void loginGuest(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        mWandouGamesApi.login(new OnLoginFinishedListener() {
            @Override
            public void onLoginFinished(LoginFinishType loginFinishType, UnverifiedPlayer unverifiedPlayer) {
                if (loginFinishType == LoginFinishType.CANCEL) {
                    cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                } else {
                    JSONObject obj =
                            JsonMaker.makeLoginResponse(unverifiedPlayer.getToken(),
                                    unverifiedPlayer.getId(), mChannel);
                    JSONObject res =
                            JsonMaker.makeLoginGuestResponse(false, obj);
                    cb.onFinished(Constants.ErrorCode.ERR_OK, res);
                }
            }
        });
    }

    @Override
    public boolean registGuest(Activity activity, String tips, IDispatcherCb cb) {
        return false;
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        mWandouGamesApi.login(new OnLoginFinishedListener() {
            @Override
            public void onLoginFinished(LoginFinishType loginFinishType, UnverifiedPlayer unverifiedPlayer) {
                if (loginFinishType == LoginFinishType.CANCEL) {
                    cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                } else {
                    JSONObject obj =
                            JsonMaker.makeLoginResponse(unverifiedPlayer.getToken(),
                                    unverifiedPlayer.getId(), mChannel);
                    cb.onFinished(Constants.ErrorCode.ERR_OK, obj);
                }
            }
        });
    }

    @Override
    public void logout(Activity activity) {
        mWandouGamesApi.logout(new OnLogoutFinishedListener() {
            @Override
            public void onLoginFinished(LogoutFinishType logoutFinishType) {

            }
        });
    }


    @Override
    public void onPause(Activity activity) {
        mWandouGamesApi.onPause(activity);
    }

    @Override
    public void onResume(Activity activity, final IDispatcherCb cb) {
        mWandouGamesApi.onResume(activity);
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
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
    public String getUid() {
       return mWandouGamesApi.getCurrentPlayerInfo().getId();
    }

    @Override
    public String getToken() {
        return "";
    }

    @Override
    public boolean isLogined() {
        return mWandouGamesApi.isLoginned();
    }

    @Override
    public void onApplicationEvent(int event, Object... arguments) {

        switch (event) {
            case Constants.ApplicationEvent.ON_BIND_CONTEXT:
                Context base = (Context) arguments[1];
                WandouGamesApi.initPlugin(base, mAppId, mAppKey);
                break;
            case Constants.ApplicationEvent.BEFORE_ON_CREATE:
                Application app = (Application) arguments[0];
                mWandouGamesApi = new WandouGamesApi.Builder(app, mAppId, mAppKey).create();
                mWandouGamesApi.setLogEnabled(true);
                break;
        }
    }

    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_LOGIN_GAME_EXIT_NOCARE, null);
            }
        });
    }
}
