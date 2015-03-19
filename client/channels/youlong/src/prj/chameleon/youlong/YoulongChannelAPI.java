package prj.chameleon.youlong;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;

import com.yx19196.bean.OrderInfoVo;
import com.yx19196.callback.IExitDispatcherCallback;
import com.yx19196.callback.ILoginDispatcherCallback;
import com.yx19196.callback.IPaymentCallback;
import com.yx19196.callback.IRegisterDispatcherCallback;
import com.yx19196.utils.Utils;
import com.yx19196.utils.YLGameSDK;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class YoulongChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static String TAG = "YoulongChannelAPI";

    private static class UserInfo {
        public String mUserName;
        public String mUserToken;
    }

    public UserInfo mUserInfo;
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
        YLGameSDK.login(activity, new ILoginDispatcherCallback() {
            @Override
            public void onFinished(Context context, Intent intent) {
                //登录状态：成功 :Utils.LOGIN_SUCCESS，取消：Utils.LOGIN_CANCEL
                String state = intent.getStringExtra("state");
                if (!TextUtils.isEmpty(state)) {
                    if (state.equals(Utils.LOGIN_SUCCESS)) {
                        UserInfo userInfo = new UserInfo();
                        userInfo.mUserName = intent.getStringExtra("userName");
                        userInfo.mUserToken = intent.getStringExtra("token");
                        mUserInfo = userInfo;
                        cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(userInfo.mUserName, userInfo.mUserToken, mChannel));
                        mAccountActionListener = accountActionListener;
                    } else if (state.equals(Utils.LOGIN_CANCEL)) {
                        //取消登录操作
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                    }
                }
            }
        }, new IRegisterDispatcherCallback() {
            @Override
            public void onFinished(Context context, Intent intent) {
                UserInfo userInfo = new UserInfo();
                userInfo.mUserName = intent.getStringExtra("userName");
                userInfo.mUserToken = intent.getStringExtra("token");
                mUserInfo = userInfo;
                cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(userInfo.mUserName, userInfo.mUserToken, mChannel));
            }
        });
    }

    @Override
    public void logout(Activity activity) {
        if (mAccountActionListener != null) {
            mAccountActionListener.onAccountLogout();
        }
        mUserInfo = null;
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
        if (mUserInfo == null)
            return;
        //startPay(Activity activity, final IDispatcherCb cb, String serverNum, String playerName, String amount, String extra, String orderId, String productName)
        int money = realPayMoney/100;
        String amount = String.valueOf(money);
        startPay(activity, cb, serverId, userNameInGame, amount, payInfo, orderId, currencyName);
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
        if (mUserInfo == null)
            return;
        //startPay(Activity activity, final IDispatcherCb cb, String serverNum, String playerName, String amount, String extra, String orderId, String productName)
        int money = realPayMoney/100;
        String amount = String.valueOf(money);
        startPay(activity, cb, serverId, userNameInGame, amount, payInfo, orderId, productName);
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
            return mUserInfo.mUserToken;
        }
    }

    @Override
    public boolean isLogined() {
        return mUserInfo != null;
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
                YLGameSDK.exit(activity, new IExitDispatcherCallback() {
                    @Override
                    public void onExit(Context context, Intent intent) {
                        String exitStr = intent.getStringExtra("exit");
                        if ("success".equals(exitStr)){
                            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        }else {
                            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        }
                    }
                });
            }
        });
    }

    private void startPay(Activity activity, final IDispatcherCb cb, String serverNum, String playerName, String amount, String extra, String orderId, String productName){
        OrderInfoVo orderInfoVo = new OrderInfoVo();
        orderInfoVo.setUserName(mUserInfo.mUserName);
        orderInfoVo.setServerNum(serverNum);
        orderInfoVo.setPlayerName(playerName);
        orderInfoVo.setAmount(amount);
        orderInfoVo.setExtra(extra);
        orderInfoVo.setOrder(orderId);
        orderInfoVo.setProductName(productName);

        // 调用支付接口，打开支付页
        YLGameSDK.performPay(activity,orderInfoVo,new IPaymentCallback() {
            /**
             *
             * @param paramString 支付结果json
             *                    {"err_code":"1","err_msg":"支付成功","content":""}
             *                    {"err_code":"0","err_msg":"支付失败","content":""}
             *                    {"err_code":"-1","err_msg":"取消支付","content":""}
             *                    {"err_code":"2","err_msg":"支付结果确认中","content":""}
             */
            @Override
            public void onPaymentFinished(String paramString) {
                if ("1".equals(paramString)){
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                }else if ("0".equals(paramString)){
                    cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                }else if ("-1".equals(paramString)){
                    cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                }else if ("2".equals(paramString)){
                    cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
                }else {
                    cb.onFinished(Constants.ErrorCode.ERR_PAY_UNKNOWN, null);
                }
            }
        });

    }

}