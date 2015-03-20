package prj.chameleon.mopo;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.util.Log;

import com.alibaba.fastjson.serializer.JSONSerializerMap;
import com.skymobi.moposnsplatsdk.application.MoposnsPlatApplication;
import com.skymobi.moposnsplatsdk.pay.MoposnsPlatPayServer;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

import com.skymobi.moposnsplatsdk.plugins.account.ISnsAccountServerSupport;
import com.skymobi.moposnsplatsdk.plugins.account.SnsAccountServerSupport;
import com.skymobi.snssdknetwork.outfunction.keeplibs.IObjectResultListener;
import com.skymobi.snssdknetwork.outfunction.keeplibs.IRemovable;
import com.skymobi.snssdknetwork.outfunction.keeplibs.UserParam;

public final class MopoChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class Config {
        public String mAppID;
    }

    private Config mCfg;
    private IAccountActionListener mAccountActionListener;
    private boolean mIsLogined = false;


    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppID = cfg.getString("appId");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void onApplicationEvent(int event, Object... arguments) {
        switch (event) {
            case Constants.ApplicationEvent.AFTER_ON_CREATE:
                Application app = (Application) arguments[0];
                MoposnsPlatApplication mopoApp = new MoposnsPlatApplication();
                mopoApp.initApplication(app.getBaseContext());
                break;
        }
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        MoposnsPlatPayServer.getInstance().startUp(activity, "payMethod=3rd&appid="+mCfg.mAppID);
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        SnsAccountServerSupport.getInstance().login(activity, new IObjectResultListener() {
            @Override
            public void onResult(int result, Object arg1) {
                if (result == 1) {
                    UserParam params = SnsAccountServerSupport.getInstance().getparam();
                    cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(params.getToken(), Long.toString(params.getIndex()), mChannel));
                    mIsLogined = true;
                } else {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }
        });
        mAccountActionListener = accountActionListener;
    }

    @Override
    public void logout(Activity activity) {
        mIsLogined = false;
    }

    public void startPay(Activity activity, String orderInfo, IDispatcherCb cb) {
	    /*
		 * 1.初始化，设置支付回调handle
		 */
        PayResultHandle payCallBackHandle = new PayResultHandle();
        int initRet = MoposnsPlatPayServer.getInstance()
                .init(payCallBackHandle);
        if (MoposnsPlatPayServer.PAY_RETURN_SUCCESS == initRet) {
            payCallBackHandle.setCB(null);
        } else {
            cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
            return;
        }

        if (orderInfo.length() < 2) {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            return;
        }

        // 2、启动付费
        int payRet = MoposnsPlatPayServer.getInstance().startActivityAndPay(
                activity, orderInfo.substring(1, orderInfo.length()-1));
        if (MoposnsPlatPayServer.PAY_RETURN_SUCCESS == payRet) {
            // 初始化成功
            Log.i("pay", "接口斯凯付费调用成功");
        } else {
            // 未初始化 \传入参数有误 \服务正处于付费状态
            cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
        }
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
        startPay(activity, payInfo, cb);
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
        startPay(activity, payInfo, cb);
    }

    @Override
    public String getUid() {
        UserParam params = SnsAccountServerSupport.getInstance().getparam();
        if (params != null) {
            return  Long.toString(params.getIndex());
        } else {
            return "";
        }
    }

    @Override
    public String getToken() {
        UserParam params = SnsAccountServerSupport.getInstance().getparam();
        if (params != null) {
            return params.getToken();
        } else {
            return "";
        }
    }

    @Override
    public boolean isLogined() {
      return  mIsLogined;
    }

    @Override
    public String getId() {
        return "mopo";
    }

    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        MoposnsPlatApplication.exit();
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_LOGIN_GAME_EXIT_NOCARE, null);
            }
        });
    }

}