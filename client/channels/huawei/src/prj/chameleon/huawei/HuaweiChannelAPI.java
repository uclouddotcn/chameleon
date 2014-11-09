package prj.chameleon.huawei;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.util.Log;

import com.android.huawei.pay.plugin.IPayHandler;
import com.android.huawei.pay.plugin.PayParameters;
import com.android.huawei.pay.util.HuaweiPayUtil;
import com.android.huawei.pay.util.Rsa;
import com.huawei.gamebox.buoy.sdk.InitParams;
import com.huawei.gamebox.buoy.sdk.util.BuoyConstant;
import com.huawei.gamebox.buoy.sdk.util.DebugConfig;
import com.huawei.hwid.openapi.out.IHwIDCallBack;

import org.json.JSONException;
import org.json.JSONObject;


import java.util.HashMap;
import java.util.Map;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public class HuaweiChannelAPI extends SingleSDKChannelAPI.SingleSDK {
    private static class UserInfo {
        public void logout() {
            mUid = "";
            mToken = "";
            mIsLogined = false;
        }
        public String mUid = "";
        public String mToken = "";
        public boolean mIsLogined = false;
    }

    private class SwitchAccountReceiver extends BroadcastReceiver{
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            DebugConfig.d(Constants.TAG, "onReceive action=" + action);
            if (BuoyConstant.CHANGE_USER_LOGIN_ACTION.equals(action)) {
                Bundle bundle = intent.getBundleExtra(BuoyConstant.GAMEBOX_EXTRA_DATA);
                int value = bundle.getInt(BuoyConstant.KEY_GAMEBOX_CHANGEUSERLOGIN);
                DebugConfig.d(Constants.TAG, "onReceive value=" + value);
                if (BuoyConstant.VALUE_CHANGE_USER == value) {
                    GlobalParams.hwId = null;
                    onLogout();
                }
            }
        }
    }
    private String mAppID;
    private String mCpID;
    private String mAppPrivateKey;
    private String mChannel;
    private String mPayID;
    private String mCpName;
    private String mPayUrl;
    private SwitchAccountReceiver mSAReceiver;
    private IAccountActionListener mAccountActionListener;
    private boolean mIsDebug;
    private final UserInfo mUserInfo = new UserInfo();

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mAppID = cfg.getString("appId");
        mCpID = cfg.getString("cpId");
        mAppPrivateKey = cfg.getString("privateKey");
        mPayID = cfg.getString("payId");
        mCpName = cfg.getString("cpName");
        mPayUrl = cfg.getString("payUrl");
        mIsDebug = commCfg.mIsDebug;
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(android.app.Activity activity,
                     final IDispatcherCb cb) {
        if (GameUtils.checkPayPluginLoad(activity)) {
            DebugConfig.d(Constants.TAG, "支付服务加载成功");
        } else { // 支付插件加载失败
            DebugConfig.d(Constants.TAG, "支付服务加载失败");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }

        if (GameUtils.checkBuoyPluginLoad(activity)) {
            InitParams p = new InitParams(mAppID,
                    mCpID, mAppPrivateKey,
                    new GameCallback(activity, cb));
            DebugConfig.d(Constants.TAG, "浮标服务加载成功");
            GlobalParams.hwBuoy.init(activity, p);

            // 初始化切换用户广播接收器
            mSAReceiver = new SwitchAccountReceiver();
            IntentFilter filter = new IntentFilter();
            filter.addAction("com.huawei.gamebox.changeUserLogin");
            // 注册切换用户广播
            activity.registerReceiver(mSAReceiver, filter);

        } else { // 浮标插件加载失败
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
    }


    @Override
    public void charge(Activity activity, String orderId, String uidInGame, String userNameInGame, String serverId, String currencyName, String payInfo, int rate, int realPayMoney, boolean allowUserChange, IDispatcherCb cb) {
        try {
            JSONObject obj = new JSONObject(payInfo);
            String sign = obj.getString("sign");
            String productName = obj.getString("pn");
            String productDesc = obj.getString("pd");
            startPay(activity, realPayMoney, productName, productDesc, orderId, sign, cb);
        } catch (JSONException e) {
            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
        }
    }

    @Override
    public void buy(Activity activity, String orderId, String uidInGame, String userNameInGame, String serverId, String productName, String productID, String payInfo, int productCount, int realPayMoney, IDispatcherCb cb) {
        try {
            JSONObject obj = new JSONObject(payInfo);
            String sign = obj.getString("sign");
            String _productName = obj.getString("pn");
            String _productDesc = obj.getString("pd");
            startPay(activity, realPayMoney, _productName, _productDesc, orderId, sign, cb);
        } catch (JSONException e) {
            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
        }
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        mAccountActionListener = accountActionListener;
        if (GameUtils.checkAccountPluginLoad(activity)) {
            Bundle loginBundle = new Bundle();
            // 为登录设置代理
            GlobalParams.hwId.setLoginProxy(activity,
                    mAppID, new IHwIDCallBack() {
                        @Override
                        public void onUserInfo(HashMap hashMap) {
                            int loginStatus = Integer.parseInt((String) hashMap.get("loginStatus"));
                            switch (loginStatus) {
                                case 0:
                                    cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                                    break;
                                case 1:
                                    mUserInfo.mUid = (String) hashMap.get("userID");
                                    mUserInfo.mToken = (String) hashMap.get("accesstoken");
                                    mUserInfo.mIsLogined = true;
                                    cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(mUserInfo.mToken,
                                            mUserInfo.mUid, mChannel));
                                    break;
                                case 2:
                                    Log.e(Constants.TAG, "receive 2");
                                    break;
                                default:
                                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                            }
                        }
                    }, loginBundle);
            GlobalParams.hwId.login(new Bundle());
        } else {
            cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
        }
    }

    @Override
    public void logout(Activity activity) {
        GlobalParams.hwId.logout();
        mUserInfo.logout();
        mAccountActionListener = null;
    }

    @Override
    public String getUid() {
        return mUserInfo.mUid;
    }

    @Override
    public String getToken() {
        return mUserInfo.mToken;
    }

    @Override
    public boolean isLogined() {
        return mUserInfo.mIsLogined;
    }

    @Override
    public String getId() {
        return "huawei";
    }

    @Override
    public void exit(Activity activity, IDispatcherCb cb) {
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    /** tool bar **/

    @Override
    public void createToolBar(Activity activity, int position) {
    }

    @Override
    public void showFloatBar(Activity activity, boolean visible) {
        if (visible) {
            GlobalParams.hwBuoy.showSamllWindow(activity.getApplicationContext());
        } else {
            GlobalParams.hwBuoy.hideSmallWindow(activity.getApplicationContext());
            GlobalParams.hwBuoy.hideBigWindow(activity.getApplicationContext());
        }
    }

    @Override
    public void destroyToolBar(Activity activity) {
        GlobalParams.hwBuoy.destroy(activity.getApplicationContext());
    }

    @Override
    public void onDestroy(Activity activity) {
        if (GlobalParams.hwBuoy != null) {
            GlobalParams.hwBuoy.destroy(activity.getApplicationContext());
        }
        if (GlobalParams.hwId != null) {
            GlobalParams.hwId.releaseResouce();
        }
        if (mSAReceiver != null) {
            activity.unregisterReceiver(mSAReceiver);
        }
    }

    private void onLogout() {
        if (mAccountActionListener != null) {
            mAccountActionListener.onAccountLogout();
        }
    }


    /**
     * 支付方法，实现参数签名与调起支付服务
     *
     * @param activity
     * @param price
     * @param productName
     * @param productDesc
     * @param orderId
     * @param cb
     */
    private void startPay(Activity activity, int price,
                          String productName, String productDesc, String orderId, String sign,
                          final IDispatcherCb cb) {

        String priceStr = String.format("%d.%2d", price/100, price%100);
        Map<String, String> params = new HashMap<String, String>();
        params.put("userID", mPayID);
        params.put("applicationID", mAppID);
        params.put("amount", priceStr);
        params.put("productName", productName);
        params.put("productDesc", productDesc);
        params.put("requestId", orderId);

        String noSign = HuaweiPayUtil.getSignData(params);
        DebugConfig.d("startPay", "签名参数noSign：" + noSign);
        String sign_ = Rsa.sign(noSign, GlobalParams.PAY_RSA_PRIVATE);
        DebugConfig.d("startPay", "签名： " + sign_ + "    " + sign);


        Log.d(Constants.TAG, "price str is " + priceStr);
        Map<String, Object> payInfo = new HashMap<String, Object>();
        payInfo.put("amount", priceStr);
        payInfo.put("productName", productName);
        payInfo.put("requestId", orderId);
        payInfo.put("productDesc", productDesc);
        payInfo.put("userName", mCpName);
        payInfo.put("applicationID", mAppID);
        payInfo.put("userID", mPayID);
        payInfo.put("sign", sign_);
        payInfo.put("notifyUrl", mPayUrl);
        // payInfo.put("environment", HuaweiPayUtil.environment_live);
        String accessToken = "";
        HashMap userInfo = GlobalParams.hwId.getDefaultUserInfo();
        if (userInfo != null) {
            accessToken = (String) userInfo.get("accesstoken");
        }
        payInfo.put("accessToken", accessToken);
        // 调试期可打开日志，发布时注释掉
        payInfo.put("showLog", true);
        payInfo.put("serviceCatalog", "X6");
        DebugConfig.d("startPay", "支付请求参数 : " + payInfo.toString());
        /**
         * 开始支付
         */
        GlobalParams.hwPay.startPay(activity, payInfo, new IPayHandler() {
            @Override
            public void onFinish(Map<String, String> payRsp) {
                int code = Integer.parseInt(payRsp.get(PayParameters.returnCode));
                if (code == 0) {
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                } else {
                    cb.onFinished(GameUtils.mapError(code), null);
                }
            }
        });
    }
}