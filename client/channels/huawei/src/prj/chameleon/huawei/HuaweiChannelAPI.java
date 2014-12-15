package prj.chameleon.huawei;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.android.huawei.pay.plugin.IHuaweiPay;
import com.android.huawei.pay.plugin.IPayHandler;
import com.android.huawei.pay.plugin.MobileSecurePayHelper;
import com.android.huawei.pay.plugin.PayParameters;
import com.android.huawei.pay.util.HuaweiPayUtil;
import com.android.huawei.pay.util.Rsa;
import com.huawei.gamebox.buoy.sdk.InitParams;
import com.huawei.gamebox.buoy.sdk.impl.BuoyOpenSDK;
import com.huawei.gamebox.buoy.sdk.util.BuoyConstant;
import com.huawei.gamebox.buoy.sdk.util.DebugConfig;
import com.huawei.hwid.openapi.OpenHwID;
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
                    //GlobalParams.hwId = null;
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
    private String mPayRsaPublic;
    private int mPayOrient;
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
        mPayRsaPublic = cfg.getString("payRsaPubKey");
        mIsDebug = commCfg.mIsDebug;
        mChannel = commCfg.mChannel;
        mPayOrient = commCfg.mIsLandscape ? 2 : 1;
    }

    @Override
    public void init(android.app.Activity activity,
                     final IDispatcherCb cb) {

        if (null == GlobalParams.hwBuoy) {
            GlobalParams.hwBuoy = BuoyOpenSDK.getIntance();
        }

        GlobalParams.hwBuoy = BuoyOpenSDK.getIntance();

        InitParams p = new InitParams(mAppID, mPayID,
                mAppPrivateKey, new GameCallback(activity, cb));

        // 如果游戏的引擎为cocos2d或者unity3d，将下面一句代码打开
        GlobalParams.hwBuoy.setShowType(2);

        // 浮标初始化
        GlobalParams.hwBuoy.init(activity, p);
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
    public void login(final Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
    mAccountActionListener = accountActionListener;
        Bundle loginBundle = new Bundle();
        // 为登录设置代理
        OpenHwID.setLoginProxy(activity,
                mAppID, new IHwIDCallBack() {
                    @Override
                    public void onUserInfo(String rsp) {
                        if(null == GlobalParams.hwBuoy) {
                            GlobalParams.hwBuoy = BuoyOpenSDK.getIntance();
                        }
                        boolean userResult = GlobalParams.hwBuoy.onUserInfo(rsp, new com.huawei.gamebox.buoy.sdk.inter.UserInfo() {
                            @Override
                            public void dealUserInfo(HashMap<String, String> uinfo) {
                                if (uinfo == null) {
                                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                } else {
                                    if ("1".equals(uinfo.get("loginStatus"))) {
                                        mUserInfo.mUid = (String) uinfo.get("userID");
                                        mUserInfo.mToken = (String) uinfo.get("accesstoken");
                                        mUserInfo.mIsLogined = true;
                                        cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(mUserInfo.mToken,
                                                mUserInfo.mUid, mChannel));
                                    } else {
                                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                                    }
                                }
                            }
                        }, activity);
                    }
                }, loginBundle);
        OpenHwID.login(new Bundle());
    }

    @Override
    public void logout(Activity activity) {
        OpenHwID.logout();
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
        cb.onFinished(Constants.ErrorCode.ERR_LOGIN_GAME_EXIT_NOCARE, null);
    }

    /** tool bar **/

    @Override
    public void createToolBar(Activity activity, int position) {
    }

    @Override
    public void showFloatBar(Activity activity, boolean visible) {
        if (visible) {
            synchronized (GlobalParams.hwBuoy)
            {
                GlobalParams.hwBuoy.showSmallWindow(activity.getApplicationContext());
            }
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
    public void onResume(Activity activity, IDispatcherCb cb) {
        if (isLogined() && null != GlobalParams.hwBuoy)
        {
            synchronized (GlobalParams.hwBuoy)
            {
                GlobalParams.hwBuoy.showSmallWindow(activity.getApplicationContext());
            }
        }
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void onPause(Activity activity) {
        // 在界面暂停的时候，隐藏浮标，和onResume配合使用
        if (null != GlobalParams.hwBuoy) {
            GlobalParams.hwBuoy.hideSmallWindow(activity.getApplicationContext());
            GlobalParams.hwBuoy.hideBigWindow(activity.getApplicationContext());
        }
    }

    @Override
    public void onDestroy(Activity activity) {
        if (GlobalParams.hwBuoy != null) {
            GlobalParams.hwBuoy.destroy(activity.getApplicationContext());
            GlobalParams.hwBuoy = null;
        }
        OpenHwID.releaseResouce();
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

        String priceStr = String.format("%d.%02d", price/100, price%100);
        Log.d(Constants.TAG, "price str is " + priceStr);
        Map<String, Object> payInfo = new HashMap<String, Object>();
        payInfo.put("amount", priceStr);
        payInfo.put("productName", productName);
        payInfo.put("requestId", orderId);
        payInfo.put("productDesc", productDesc);
        payInfo.put("userName", mCpName);
        payInfo.put("applicationID", mAppID);
        payInfo.put("userID", mPayID);
        payInfo.put("sign", sign);
        payInfo.put("notifyUrl", mPayUrl);
        // payInfo.put("environment", HuaweiPayUtil.environment_live);
        String accessToken = "";
        HashMap userInfo = OpenHwID.getDefaultUserInfo();
        if (userInfo != null) {
            accessToken = (String) userInfo.get("accesstoken");
        }
        payInfo.put("accessToken", accessToken);
        // 调试期可打开日志，发布时注释掉
        if (mIsDebug) {
            payInfo.put("showLog", true);
        } else {
            payInfo.put("showLog", false);
        }
        payInfo.put("serviceCatalog", "X6");
        payInfo.put("screentOrient", mPayOrient);

        DebugConfig.d("startPay", "支付请求参数 : " + payInfo.toString());

        IHuaweiPay payHelper = new MobileSecurePayHelper();
        /**
         * 开始支付
         */
        payHelper.startPay(activity, payInfo, new IPayHandler() {
            @Override
            public void onFinish(Map<String, String> payRsp) {
                String code = payRsp.get(PayParameters.returnCode);
                if (code.equals("0") && "success".equals(payRsp.get(PayParameters.errMsg))) {
                    // 支付成功，验证信息的安全性；待验签字符串中如果有isCheckReturnCode参数且为yes，则去除isCheckReturnCode参数
                    if (payRsp.containsKey("isCheckReturnCode")
                            && "yes".equals(payRsp.get("isCheckReturnCode"))) {
                        payRsp.remove("isCheckReturnCode");

                    } else {// 支付成功，验证信息的安全性；待验签字符串中如果没有isCheckReturnCode参数活着不为yes，则去除isCheckReturnCode和returnCode参数
                        payRsp.remove("isCheckReturnCode");
                        payRsp.remove(PayParameters.returnCode);
                    }
                    // 支付成功，验证信息的安全性；待验签字符串需要去除sign参数
                    String sign = payRsp.remove(PayParameters.sign);

                    String noSigna = HuaweiPayUtil.getSignData(payRsp);

                    // 使用公钥进行验签
                    boolean s = Rsa.doCheck(noSigna, sign, mPayRsaPublic);

                    if (s) {
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    } else {
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                    }

                } else {
                    cb.onFinished(GameUtils.mapError(code), null);
                }
            }
        });
    }
}