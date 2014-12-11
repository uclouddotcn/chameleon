package prj.chameleon.baidumg;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import com.baidu.gamesdk.ActivityAdPage;
import com.baidu.gamesdk.ActivityAnalytics;
import com.baidu.gamesdk.BDGameSDK;
import com.baidu.gamesdk.BDGameSDKSetting;
import com.baidu.gamesdk.IResponse;
import com.baidu.gamesdk.ResultCode;
import com.baidu.platformsdk.PayOrderInfo;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public class BaidumgChannelAPI extends SingleSDKChannelAPI.SingleSDK {
    private IAccountActionListener mAccountListener;
    private static class Cfg {
        public int mAppID;
        public String mAppKey;
        public BDGameSDKSetting.Orientation mScreenOrientation;
    }

    private Cfg mCfg;
    private boolean mIsDebug = false;
    private static class AdPageListener implements ActivityAdPage.Listener {
        public IDispatcherCb mCb;
        @Override
        public void onClose() {
            if (mCb != null) {
                mCb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
            mCb = null;
        }
    }
    private ActivityAdPage mAdPage = null;
    private AdPageListener mAdPageListener = new AdPageListener();
    private ActivityAnalytics mActivityAnalytics = null;
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
        if (realPayMoney > 9999900) {
            Log.e(Constants.TAG, "baidumg: excceeds money limit");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            return;
        }
        PayOrderInfo payOrderInfo = new PayOrderInfo();
        payOrderInfo.setCooperatorOrderSerial(orderId);
        payOrderInfo.setProductName(currencyName);
        if (allowUserChange) {
            payOrderInfo.setTotalPriceCent(0);
            payOrderInfo.setRatio(rate);
        } else {
            payOrderInfo.setTotalPriceCent(realPayMoney);
        }
        payOrderInfo.setExtInfo(composePayExt(null));
        BDGameSDK.pay(payOrderInfo, null, new IResponse<PayOrderInfo>() {
            @Override
            public void onResponse(int i, String s, PayOrderInfo payOrderInfo) {
                switch (i) {
                    case ResultCode.PAY_SUCCESS:
                    case ResultCode.PAY_SUBMIT_ORDER://订单已经提交,
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    case ResultCode.PAY_CANCEL://订单支付取消
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                        break;
                    default:
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        break;
                }
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
        if (realPayMoney > 9999900) {
            Log.e(Constants.TAG, "baidumg: excceeds money limit");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            return;
        }
        PayOrderInfo payOrderInfo = new PayOrderInfo();
        payOrderInfo.setCooperatorOrderSerial(orderId);
        payOrderInfo.setProductName(productName);
        payOrderInfo.setTotalPriceCent(realPayMoney);
        payOrderInfo.setExtInfo(composePayExt(productID));
        BDGameSDK.pay(payOrderInfo, null, new IResponse<PayOrderInfo>() {
            @Override
            public void onResponse(int i, String s, PayOrderInfo payOrderInfo) {
                switch (i) {
                    case ResultCode.PAY_SUCCESS:
                    case ResultCode.PAY_SUBMIT_ORDER://订单已经提交,
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    case ResultCode.PAY_CANCEL://订单支付取消
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                        break;
                    default:
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        break;
                }
            }
        });
    }

    @Override
    public String getId() {
        return "baidumg";
    }

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Cfg();
        mCfg.mAppID = (int) cfg.getLong("appId");
        mCfg.mAppKey = cfg.getString("appKey");
        mCfg.mScreenOrientation = commCfg.mIsLandscape ? BDGameSDKSetting.Orientation.LANDSCAPE:
                BDGameSDKSetting.Orientation.PORTRAIT;
        mChannel = commCfg.mChannel;
        mIsDebug = commCfg.mIsDebug;
    }

    @Override
    public void init(final Activity activity, final IDispatcherCb cb) {
        BDGameSDKSetting appInfo = new BDGameSDKSetting();
        appInfo.setAppID(mCfg.mAppID);
        appInfo.setAppKey(mCfg.mAppKey);
        mActivityAnalytics = new ActivityAnalytics(activity);
        if (mIsDebug) {
            appInfo.setDomain(BDGameSDKSetting.Domain.DEBUG);
        } else {
            appInfo.setDomain(BDGameSDKSetting.Domain.RELEASE);
        }
        appInfo.setOrientation(mCfg.mScreenOrientation);
        BDGameSDK.init(activity, appInfo, new IResponse<Void>() {
            @Override
            public void onResponse(int i, String s, Void aVoid) {
                switch (i) {
                    case ResultCode.INIT_SUCCESS:
                        mAdPage = new ActivityAdPage(activity, mAdPageListener);
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        break;
                    default:
                        Log.e(Constants.TAG, "Fail to start SDK");
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        break;
                }
            }
        });
        BDGameSDK.setSuspendWindowChangeAccountListener(new IResponse<Void>() {
            @Override
            public void onResponse(int i, String s, Void aVoid) {
                if (mAccountListener == null) {
                    return;
                }
                switch (i) {
                    case ResultCode.LOGIN_SUCCESS:
                        mAccountListener.preAccountSwitch();
                        mAccountListener.afterAccountSwitch(Constants.ErrorCode.ERR_OK,
                                JsonMaker.makeLoginResponse(BDGameSDK.getLoginAccessToken(), BDGameSDK.getLoginUid(),
                                        mChannel));
                    case ResultCode.LOGIN_FAIL:
                        mAccountListener.onAccountLogout();
                        break;
                    default:
                        break;
                }
            }
        });
        BDGameSDK.setSessionInvalidListener(new IResponse<Void>() {
            @Override
            public void onResponse(int i, String s, Void aVoid) {
                if(i == ResultCode.SESSION_INVALID) {
                    if (mAccountListener != null) {
                        mAccountListener.onAccountLogout();
                    }
                }
            }
        });
    }


    @Override
    public void login(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        mAccountListener = accountActionListener;
        BDGameSDK.login(new IResponse<Void>() {
            @Override
            public void onResponse(int i, String s, Void aVoid) {
                switch (i) {
                    case ResultCode.LOGIN_SUCCESS:
                        cb.onFinished(Constants.ErrorCode.ERR_OK,
                                JsonMaker.makeLoginResponse(BDGameSDK.getLoginAccessToken(), BDGameSDK.getLoginUid(),
                                        mChannel));
                        break;
                    default:
                        Log.e(Constants.TAG, String.format("unknown login rsp state from baidumg: %d", i));
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }
        });
    }

    @Override
    public void logout(Activity activity) {
        BDGameSDK.logout();
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
    public String getUid() {
        return BDGameSDK.getLoginUid();
    }

    @Override
    public String getToken() {
        return BDGameSDK.getLoginAccessToken();
    }

    @Override
    public boolean isLogined() {
        return BDGameSDK.isLogined();
    }

    @Override
    public void onResume(Activity activity, final IDispatcherCb cb) {
        if (mActivityAnalytics != null) {
            mActivityAnalytics.onResume();
        }
        if (mAdPage != null) {
            mAdPageListener.mCb = cb;
            mAdPage.onResume();
        } else {
            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
        }
    }

    @Override
    public void onPause(Activity activity) {
        if (mAdPage != null) {
            mAdPage.onStop();
        }
        if (mActivityAnalytics != null) {
            mActivityAnalytics.onPause();
        }
    }

    @Override
    public void onDestroy(Activity activity) {
        BDGameSDK.destroy();
        mAdPage = null;
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

    private String composePayExt(String productId) {
        StringBuilder builder = new StringBuilder();
        builder.append(mChannel);
        builder.append('|');
        builder.append(productId);
        return builder.toString();
    }
}
