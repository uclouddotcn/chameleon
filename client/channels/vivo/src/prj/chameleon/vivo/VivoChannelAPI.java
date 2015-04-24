package prj.chameleon.vivo;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.bbk.payment.PaymentActionDetailsInit;
import com.bbk.payment.PaymentActivity;
import com.vivo.account.base.activity.LoginActivity;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class VivoChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class UserInfo {
        public String mUserId;
        public String mUserName;
        public String mUserToken;
    }

    private static class Config {
        public String mAppId;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IDispatcherCb mLoginCb;
    private IDispatcherCb mPayCb;
    private IAccountActionListener mAccountActionListener;
    private int REQUEST_CODE_LOGIN = 0;
    private int REQUEST_CODE_PAY = 1;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppId = cfg.getString("appId");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        if (mLoginCb != null) {
            cb.onFinished(Constants.ErrorCode.ERR_LOGIN_IN_PROGRESS, null);
            return;
        }
        Intent loginIntent = new Intent(activity, LoginActivity.class);
        activity.startActivityForResult(loginIntent, REQUEST_CODE_LOGIN);
        mLoginCb = cb;
        mAccountActionListener = accountActionListener;
    }

    @Override
    public boolean isSupportSwitchAccount() {
        return true;
    }

    @Override
    public boolean switchAccount(Activity activity, IDispatcherCb cb) {
        if (mAccountActionListener != null) {
            mAccountActionListener.onAccountLogout();
        }
        Intent swithIntent = new Intent(activity, LoginActivity.class);
        swithIntent.putExtra("switchAccount", true);
        activity.startActivityForResult(swithIntent, REQUEST_CODE_LOGIN);
        return true;
    }

    @Override
    public void onActivityResult(final Activity activity, int requestCode, int resultCode, Intent data) {
        super.onActivityResult(activity, requestCode, resultCode, data);
        if (requestCode == REQUEST_CODE_LOGIN) {
            if (resultCode == Activity.RESULT_OK && mLoginCb != null) {
                String loginResult = data.getStringExtra("LoginResult");
                JSONObject loginResultObj;
                try {
                    UserInfo userInfo = new UserInfo();
                    loginResultObj = new JSONObject(loginResult);
                    userInfo.mUserId = loginResultObj.getString("openid");
                    userInfo.mUserName = loginResultObj.getString("name");
                    userInfo.mUserToken = loginResultObj.getString("authtoken");
                    mUserInfo = userInfo;

                    new PaymentActionDetailsInit(activity, mCfg.mAppId);// appid为vivo开发者平台中生成的App ID；方法原型PaymentActionDetailsInit(Context context, String appId)

                    mLoginCb.onFinished(Constants.ErrorCode.ERR_OK,
                            JsonMaker.makeLoginResponse(mUserInfo.mUserToken, mUserInfo.mUserId, mChannel));
                } catch (JSONException e) {
                    Log.e(Constants.TAG, "Fail to load login", e);
                }
            }
            mLoginCb = null;
        } else if (requestCode == REQUEST_CODE_PAY && mPayCb != null) {
            if (resultCode == Activity.RESULT_OK) {
                Bundle extras = data.getBundleExtra("pay_info");
                String trans_no = extras.getString("transNo");
                boolean pay_result = extras.getBoolean("pay_result");
                String res_code = extras.getString("result_code");
                String pay_msg = extras.getString("pay_msg");
                Log.i("VivoChannelAPI", "trans_no = " + trans_no +" pay_result = " + pay_result +" res_code = " + res_code +" pay_msg = " + pay_msg);
                if(pay_result){
                    mPayCb.onFinished(Constants.ErrorCode.ERR_OK, null);
                }else {
                    mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                }
            }
            mPayCb = null;
        }

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
                       String userNameInGame,//用户名
                       String serverId,
                       String currencyName,//货币名称
                       String payInfo,
                       int rate,//单价
                       int realPayMoney,//总价
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
        if (mPayCb != null) {
            cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
            return;
        }
        startPay(activity, (long) realPayMoney, orderId, payInfo);
        mPayCb = cb;
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
        if (mPayCb != null) {
            cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
            return;
        }
        startPay(activity, (long) realPayMoney, orderId, payInfo);
        mPayCb = cb;
    }

    @Override
    public String getUid() {
        if (mUserInfo == null) {
            return "";
        } else {
            return mUserInfo.mUserId;
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
        return "vivo";
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

    @Override
    public void onDestroy(Activity activity) {
        super.onDestroy(activity);
    }

    //以下为辅助方法
    private void startPay(Activity activity, Long price, String vivoOrder, String payInfo) {

        Log.i("VivoChannelAPI", payInfo);

        String vivoSignature = "";
        String productName = "";
        String productDes = "";

        try {
            JSONObject jsonObject = new JSONObject(payInfo);
            vivoSignature = jsonObject.getString("sign");
            vivoOrder = jsonObject.getString("order");
            productName = jsonObject.getString("title");
            productDes = jsonObject.getString("desc");
        } catch (JSONException e) {
        }

        Bundle localBundle = new Bundle();
        localBundle.putString("transNo", vivoOrder);// 交易流水号，由订单推送接口返回
        localBundle.putString("accessKey", vivoSignature);// 由订单推送接口返回
        localBundle.putString("productName", productName);//商品名称
        localBundle.putString("productDes", productDes);//商品描述
        localBundle.putLong("price", price);//价格,单位为分（1000即10.00元）
        localBundle.putString("appId", mCfg.mAppId);// appid为vivo开发者平台中生成的App ID

        // 以下为可选参数，能收集到务必填写，如未填写，掉单、用户密码找回等问题可能无法解决。
        /*localBundle.putString("blance", "100元宝");//100元宝
        localBundle.putString("vip", "vip2");//vip2
        localBundle.putInt("level", 35);//35
        localBundle.putString("party", "工会");//工会
        localBundle.putString("roleId", "角色id");//角色id
        localBundle.putString("roleName", "角色名称");//角色名称
        localBundle.putString("serverName", "区服信息");//区服信息
        localBundle.putString("extInfo", "扩展参数");//扩展参数*/
        localBundle.putBoolean("logOnOff", false);
        Intent target = new Intent(activity, PaymentActivity.class);
        target.putExtra("payment_params", localBundle);
        activity.startActivityForResult(target, REQUEST_CODE_PAY);
    }
}