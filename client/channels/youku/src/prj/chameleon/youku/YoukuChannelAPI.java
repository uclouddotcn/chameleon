package prj.chameleon.youku;

import android.app.Activity;
import android.os.Bundle;

import com.youku.gamesdk.act.YKCallBack;
import com.youku.gamesdk.act.YKInit;
import com.youku.gamesdk.act.YKPlatform;
import com.youku.gamesdk.data.Bean;
import com.youku.gamesdk.data.YKGameUser;
import com.youku.gamesdk.data.YKPayBean;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class YoukuChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class UserInfo {
        public String mUserName;
        public String mUserSession;
    }

    private static class Config {
        public String mAppId;
        public String mAppName;
        public String mAppKey;
        public String mAppSecret;
        public String mNotifyUrl;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IAccountActionListener mAccountActionListener;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppId = cfg.getString("appId");
        mCfg.mAppName = cfg.getString("appName");
        mCfg.mAppKey = cfg.getString("appKey");
        mCfg.mAppSecret = cfg.getString("appSecret");
        mCfg.mNotifyUrl = cfg.getString("notifyUrl");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, final IDispatcherCb cb) {
        new YKInit(activity).init(new YKCallBack() {
            @Override
            public void onSuccess(Bean bean) {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

            @Override
            public void onFailed(String failReason) {
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
        });
    }

    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        YKPlatform.autoLogin(new YKCallBack() {
            @Override
            public void onSuccess(Bean bean) {
                YKGameUser ykGameUser = (YKGameUser) bean;
                mUserInfo = new UserInfo();
                mUserInfo.mUserSession = ykGameUser.getSession();// 优酷游戏平台唯一标示，消费时需要用到
                mUserInfo.mUserName = ykGameUser.getUserName();// 用户名
                mAccountActionListener = accountActionListener;
                cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(mUserInfo.mUserSession, mUserInfo.mUserName, mChannel));
            }

            @Override
            public void onFailed(String failReason) {
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
        }, activity);//调用优酷登录接口
    }

    @Override
    public void logout(Activity activity) {
        YKPlatform.logout(activity);//注销账号方法
        if (mAccountActionListener != null) {
            mAccountActionListener.onAccountLogout();
        }
        mUserInfo = null;
    }

    @Override
    public void createToolBar(final Activity activity, int position) {
        YKPlatform.setYKFloat(activity, new YKCallBack() {
            //悬浮窗切换账号的回调方法
            @Override
            public void onSuccess(Bean bean) {
                YKPlatform.logout(activity);//注销账号方法
                //注销账号后回到登陆页（代码需cp自行编写）
                if (mAccountActionListener != null) {
                    mAccountActionListener.onAccountLogout();
                }
                mUserInfo = null;
            }

            @Override
            public void onFailed(String failReason) {
            }
        });
    }

    @Override
    public void showFloatBar(final Activity activity, boolean visible) {
        if (visible) {
            YKPlatform.closeYKFloat(activity);//关闭悬浮窗
        } else {
            YKPlatform.setYKFloat(activity, new YKCallBack() {
                //悬浮窗切换账号的回调方法
                @Override
                public void onSuccess(Bean bean) {
                    YKPlatform.logout(activity);//注销账号方法
                    //注销账号后回到登陆页（代码需cp自行编写）
                    if (mAccountActionListener != null) {
                        mAccountActionListener.onAccountLogout();
                    }
                    mUserInfo = null;
                }

                @Override
                public void onFailed(String failReason) {
                }
            });
        }
    }

    @Override
    public void destroyToolBar(Activity activity) {
        YKPlatform.closeYKFloat(activity);//关闭悬浮窗
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
        String money = String.valueOf(realPayMoney * 100);
        startPay(activity, cb, money, orderId, "0", "游戏道具", payInfo);
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
        String money = String.valueOf(realPayMoney * 100);
        startPay(activity, cb, money, orderId, productID, productName, payInfo);
    }

    @Override
    public String getUid() {
        if (mUserInfo == null) {
            return "";
        } else {
            return mUserInfo.mUserName;
        }
    }

    @Override
    public String getToken() {
        if (mUserInfo == null) {
            return "";
        } else {
            return mUserInfo.mUserSession;
        }
    }

    @Override
    public boolean isLogined() {
        return mUserInfo != null;
    }

    @Override
    public String getId() {
        return "youku";
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

    private void startPay(Activity activity, final IDispatcherCb cb, String realPayMoney, String orderId, String productId, String productName, String payInfo) {
        YKPayBean ykPayBean = new YKPayBean();
        ykPayBean.setAmount(realPayMoney);//金额（以分为单位，只能传整数值，不能有小数）
        ykPayBean.setAppOrderId(orderId);////cp自己生成的订单号，不能为空，不能重复（若是单机游戏没有订单号，则传"defaultapporderid"）
        ykPayBean.setNotifyUri(mCfg.mNotifyUrl);//cp的支付回调通知地址，不能为空，（目前优酷后台不提供设置通知地址的功能）
        ykPayBean.setProductId(productId);//cp的物品ID（没有可以传"0"）
        ykPayBean.setProductName(productName);//物品名称（没有就传"游戏道具"）
        ykPayBean.setAppExt1(payInfo);//cp透传参数（没有透传参数就注销本行,支持最多64位）

        YKPlatform.doPay(activity, ykPayBean, new YKCallBack() {
            @Override
            public void onSuccess(Bean bean) {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

            @Override
            public void onFailed(String failReason) {
                //进行支付失败操作，failReason为失败原因
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

        });//支付接口，优酷支付方法，需要UI线程调用
    }
}