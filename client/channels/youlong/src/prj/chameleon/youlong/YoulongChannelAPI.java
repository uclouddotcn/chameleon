package prj.chameleon.youlong;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;

import com.yx9158.external.ChangeActivity;
import com.yx9158.external.LoginIDispatcherCallback;
import com.yx9158.external.Payment;
import com.yx9158.external.RegisterIDispatcherCallback;
import com.yx9158.external.YXWebActivity;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class YoulongChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static String TAG = "YoulongChannelAPI";

    public String mUserToken;
    private IAccountActionListener mAccountActionListener;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        ChangeActivity.getInstance().toLogin(activity, new LoginIDispatcherCallback(){
            @Override
            public void onFinished(Context context, Intent intent) {
                Bundle bundle = intent.getExtras();
                mUserToken = bundle.getString("用户名");
                cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(mUserToken, null, mChannel));
                mAccountActionListener = accountActionListener;
            }
        }, new RegisterIDispatcherCallback(){
            @Override
            public void onFinished(Context context, Intent intent) {
                Bundle bundle = intent.getExtras();
                mUserToken = bundle.getString("用户名");
                cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(mUserToken, null, mChannel));
                mAccountActionListener = accountActionListener;
            }
        });
    }

    @Override
    public void logout(Activity activity) {
        if (mAccountActionListener != null) {
            mAccountActionListener.onAccountLogout();
        }
        mUserToken = null;
    }

    @Override
    public void charge(Activity activity,
                       String orderId,
                       String uidInGame,
                       String userNameInGame,//用户名 无用
                       String serverId,
                       String currencyName,//货币名称 无用
                       String payInfo,
                       int rate,//单价
                       int realPayMoney,//总价
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
        if (mUserToken == null)
            return;
        String url = null;
        try {
            url = Payment.getInstance().toRecharge( mUserToken, serverId, userNameInGame, orderId, String.valueOf(realPayMoney/100), payInfo, activity);
        } catch (PackageManager.NameNotFoundException e) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
        }
        Intent intent = new Intent(activity, YXWebActivity.class);
        intent.putExtra("url",url);
        activity.startActivity(intent);
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
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
                    IDispatcherCb cb) {
        if (mUserToken == null)
            return;
        String url = null;
        try {
            url = Payment.getInstance().toRecharge( mUserToken, serverId, userNameInGame, orderId, String.valueOf(realPayMoney/100), payInfo, activity);
        } catch (PackageManager.NameNotFoundException e) {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
        }
        Intent intent = new Intent(activity, YXWebActivity.class);
        intent.putExtra("url",url);
        activity.startActivity(intent);
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public String getUid() {
        if (mUserToken == null) {
            return "";
        } else {
            return mUserToken;
        }
    }

    @Override
    public String getToken() {
        if (mUserToken == null) {
            return "";
        } else {
            return mUserToken;
        }
    }

    @Override
    public boolean isLogined() {
        return mUserToken != null;
    }

    @Override
    public String getId() {
        return "youlong";
    }

    @Override
    public void onPause(Activity activity) {
        super.onPause(activity);

    }

    @Override
    public void exit(final Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {

            }
        });
    }

}