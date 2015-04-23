package prj.chameleon.yuwan;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;

import com.ireadygo.sdk.RgAppInfo;
import com.ireadygo.sdk.RgBuyInfo;
import com.ireadygo.sdk.RgCommplatform;
import com.ireadygo.sdk.RgConstant;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class YuwanChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private String mAppId;
    private String mAppKey;
    private String mForumId;
    private String mNotifyUrl;
    private Context mApplicationCtx;

    private IAccountActionListener mAccountActionListener;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mAppId = cfg.getString("appId");
        mAppKey = "";
        mForumId = cfg.getString("forumId");
        mNotifyUrl = cfg.getString("notifyUrl");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, final IDispatcherCb cb) {
        RgAppInfo appInfo = new RgAppInfo(mAppId, mAppKey, mForumId);
        mApplicationCtx = activity;
        RgCommplatform.rgInit(activity, appInfo, new RgCommplatform.OnInitCompleteListener() {
            @Override
            public void onInitComplete(int initCode) {
                if (initCode == RgConstant.INIT_SUCCESS) {
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    RgCommplatform.addOnLogoutListener(new RgCommplatform.OnLogoutListener() {
                        @Override
                        public void onLogout() {
                            YuwanChannelAPI.this.onAccountLogout();
                        }
                    });
                } else {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }
        });
    }

    @Override
    public void onDestroy(Activity activity) {
        RgCommplatform.rgDestory();
        mApplicationCtx = null;
    }

    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        this.mAccountActionListener = accountActionListener;
        RgCommplatform.rgLogin(new RgCommplatform.OnLoginProcessListener () {

            @Override
            public void finishLoginProcess(int code) {
                if (RgConstant.LOGIN_SUCCESS == code) {// 登陆成功
                    String uid = RgCommplatform.getAccountNo(activity);
                    String session = RgCommplatform.getSession(activity);
                    cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(session, uid, mChannel));
                    RgCommplatform.showFloatWindow(activity);
                } else if (RgConstant.LOGIN_CANCELED == code) {
                    cb.onFinished(Constants.ErrorCode.ERR_CANCEL,
                            null);
                } else {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL,
                            null);
                }
            }
        });
    }

    @Override
    public void logout(Activity activity) {
        // do nothing
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
        startPay(activity, cb, orderId, realPayMoney, currencyName);
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
        startPay(activity, cb, orderId, realPayMoney, productName);
    }

    @Override
    public String getUid() {
        if (mApplicationCtx != null) {
            return RgCommplatform.getAccountNo(mApplicationCtx);
        } else {
            return "";
        }
    }

    @Override
    public String getToken() {
        if (mApplicationCtx != null) {
            return RgCommplatform.getSession(mApplicationCtx);
        } else {
            return "";
        }
    }

    @Override
    public boolean isLogined() {
        return RgCommplatform.isLogined(mApplicationCtx);
    }

    @Override
    public String getId() {
        return "yuwan";
    }


    @Override
    public void exit(final Activity activity, final IDispatcherCb cb) {
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    private void startPay(Activity activity,
                          final IDispatcherCb cb,
                          String orderId,
                          int realPayMoney,
                          String productName){
        int gredit = realPayMoney/100;// 支付金额 必须设置，单位：元
        RgBuyInfo buyInfo = new RgBuyInfo(orderId, productName, gredit);
        if (mNotifyUrl != null && mNotifyUrl.length() > 0) {
            buyInfo.setNoticeUrl(mNotifyUrl);
        }
        RgCommplatform.rgPayAsyn(buyInfo, new RgCommplatform.OnPayProcessListener() {

            @Override
            public void finishPayProcess(int payCode) {
                Log.d(Constants.TAG, "返回支付结果--payCode=" + payCode);
                switch (payCode) {
                    case RgConstant.PAY_SUCCESS:// 支付成功
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        break;
                    case RgConstant.PAY_FAIL:// 支付失败
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        break;
                    case RgConstant.PAY_CANCEL:// 支付取消
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                        break;
                    default:
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        break;
                }
            }
        });
    }

    private void onAccountLogout() {
        if (mAccountActionListener != null) {
            mAccountActionListener.onAccountLogout();
        }
    }

}
