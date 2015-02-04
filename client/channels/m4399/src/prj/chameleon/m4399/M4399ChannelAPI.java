package prj.chameleon.m4399;


import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

import cn.m4399.operate.OperateCenter;
import cn.m4399.operate.OperateCenterConfig;
import cn.m4399.operate.User;
import cn.m4399.operate.OperateCenter.*;
import cn.m4399.operate.OperateCenterConfig.PopLogoStyle;
import cn.m4399.operate.OperateCenterConfig.PopWinPosition;
import cn.m4399.operate.UpgradeInfo;
import cn.m4399.operate.ui.activity.LoginActivity;


import cn.m4399.recharge.RechargeCenter;
import cn.m4399.recharge.RechargeSettings;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class M4399ChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    OperateCenter mOpeCenter;
    OperateCenterConfig mOpeConfig;

    private String mAppId;
    private String mAppKey;
    private int mScreenOrientation;
    boolean mIsLandscape;

    private IAccountActionListener mAccountActionListener;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {

        mAppId = cfg.getString("appId");
        mAppKey = cfg.getString("appKey");
        mChannel = commCfg.mChannel;
        mIsLandscape = commCfg.mIsLandscape;
        if (mIsLandscape){
            mScreenOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE;
        }else{
            mScreenOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
        }

    }


    @Override
    public void init(Activity activity, IDispatcherCb cb) {
            mOpeCenter = OperateCenter.getInstance();
            mOpeConfig = new OperateCenterConfig.Builder(activity)
            .setGameKey(mAppKey)
            .setDebugEnabled(false)

            .setOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
            .setSupportExcess(true)
            .setPopLogoStyle(PopLogoStyle.POPLOGOSTYLE_ONE)
            .setPopWinPosition(PopWinPosition.POS_LEFT)
            .build();
            mOpeCenter.setConfig(mOpeConfig);
            mOpeCenter.init(activity ,new OperateCenter.OnInitGloabListener() {
                @Override
            public void onInitFinished(boolean isLogin, User userInfo)
            {
            }
            @Override
            public void onUserAccountLogout()
            {
            }
        });

        mOpeCenter.setSupportExcess(false);

        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {

        mOpeCenter.login(activity, new OnLoginFinishedListener(){
            public void onLoginFinished(boolean success, int resultCode, User userInfo) {
                if(success){
                    cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(userInfo.getState(), null, mChannel));
                }
                else{
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }
        });

        mAccountActionListener = accountActionListener;
    }

    @Override
    public boolean isSupportSwitchAccount() {
        return true;
    }

    @Override
    public boolean switchAccount(Activity activity, IDispatcherCb cb) {
        if (mAccountActionListener != null){
            mAccountActionListener.preAccountSwitch();
        }
        mOpeCenter.switchAccount(activity, new OnLoginFinishedListener(){
            public void onLoginFinished(boolean b, int i, User user) {
                try{
                    JSONObject obj = new JSONObject(user.toString());
                    mAccountActionListener.afterAccountSwitch(i, obj);
                }catch (Exception e){

                }
            }
        });

        return true;
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        super.onActivityResult(activity, requestCode, resultCode, data);
    }

    @Override
    public void logout(final Activity activity) {
        mOpeCenter.logout(new OnLogoutFinishedListener() {
            @Override
            public void onLogoutFinished(boolean success, int resultCode) {
                mAccountActionListener.onAccountLogout();
            }
        });
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
        int je = 0;
        if (realPayMoney < 100)     //4399至少充值1元，且只能充值整数，小于1元的，当做0元，从而使SDK报错。
            je = 0;
        else
            je = realPayMoney/100 + 1;

        mOpeCenter.recharge(activity, je, //充值金额（元）
                orderId, //游戏方订单号
                currencyName, //商品名称
                new OnRechargeFinishedListener() {
                    @Override
                    public void onRechargeFinished(boolean success, int resultCode, String msg)
                    {
                        if(success){
                            //请求游戏服，获取充值结果

                            cb.onFinished(resultCode, null);
                        }else{
                            //充值失败逻辑
                            cb.onFinished(resultCode, null);
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
                    int productCount,//个数
                    int realPayMoney,
                    final IDispatcherCb cb) {
        int je = 0;
        if (realPayMoney < 100)     //4399至少充值1元，且只能充值整数，小于1元的，当做0元，从而使SDK报错。
            je = 0;
        else
            je = realPayMoney/100 + 1;

        mOpeCenter.recharge(activity, je, //充值金额（元）
                orderId, //游戏方订单号
                productName, //商品名称
                new OnRechargeFinishedListener() {
                    @Override
                    public void onRechargeFinished(boolean success, int resultCode, String msg)
                    {
                        if(success){
                            //请求游戏服，获取充值结果
                            cb.onFinished(resultCode, null);
                        }else{
                            //充值失败逻辑
                            cb.onFinished(resultCode, null);
                        }
                    }
                });

    }

    @Override
    public String getUid() {
        if (!mOpeCenter.isLogin())
            return null;

        return mOpeCenter.getCurrentAccount().getUid();
    }

    @Override
    public String getToken() {
        if (!mOpeCenter.isLogin())
            return mOpeCenter.getCurrentAccount().getState();

        return null;

    }

    @Override
    public boolean isLogined() {
        return mOpeCenter.isLogin();
    }

    @Override
    public String getId() {
        return "m4399";
    }

    @Override
    public void exit(final Activity activity, final IDispatcherCb cb) {
        mOpeCenter.shouldQuitGame(activity , new OnQuitGameListener() {
            @Override
            public void onQuitGame(boolean shouldQuit) {
                // 点击“退出游戏”时，shouldQuit 为true，游戏处理自己的退出业务逻辑
                // 点击“前往游戏圈”时，shouldQuit 为false，SDK 会进入游戏圈或者下载
                // 游戏盒子界面，游戏可以不做处理。
                // 点击“留在游戏”时，shouldQuit 为false，SDK 和游戏都不做任何处理
                if (shouldQuit) {
                    activity.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            cb.onFinished(Constants.ErrorCode.ERR_LOGIN_GAME_EXIT_NOCARE, null);
                        }
                    });
                    activity.finish();
                    android.os.Process.killProcess(android.os.Process.myPid());
                }
            }
        });
    }

    @Override
    public void onDestroy(Activity activity) {
        super.onDestroy(activity);
        mOpeCenter.destroy();
        mOpeCenter = null;
    }
}
