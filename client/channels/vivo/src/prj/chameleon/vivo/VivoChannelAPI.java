package prj.chameleon.vivo;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.util.Log;

import com.bbkmobile.iqoo.payment.PaymentActivity;
import com.vivo.account.base.accounts.OnVivoAccountChangedListener;
import com.vivo.account.base.accounts.VivoAccountManager;
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
        public String mAppKey;
        public String mCpId;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IDispatcherCb mLoginCb;
    private IDispatcherCb mPayCb;
    private IAccountActionListener mAccountActionListener;
    private int REQUEST_CODE_LOGIN = 0;
    private int REQUEST_CODE_PAY = 1;
    private VivoAccountManager mVivoAccountManager;
    private Handler mHandler = new Handler();

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppKey = cfg.getString("appId");
        mCfg.mCpId = cfg.getString("cpId");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        mVivoAccountManager = VivoAccountManager.getInstance(activity);
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
        /*activity.startActivity(loginIntent);
        mVivoAccountManager.registeListener(new OnVivoAccountChangedListener() {
            @Override
            public void onAccountLogin(String name, String openid, String authtoken) {
                cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(authtoken, openid, mChannel));
            }

            //第三方游戏不需要使用此回调
            @Override
            public void onAccountRemove(boolean isRemoved) {
            }
        });*/
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
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
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
                mPayCb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
            mPayCb = null;
        }

    }

    @Override
    public void logout(Activity activity) {
        if (mVivoAccountManager != null){
            mVivoAccountManager.removeAccount();
        }
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
        startPay(activity, (double) realPayMoney, orderId, payInfo);
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
        startPay(activity, (double) realPayMoney, orderId, payInfo);
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
        if (mVivoAccountManager != null){
            mVivoAccountManager.unRegistListener(new OnVivoAccountChangedListener() {
                @Override
                public void onAccountLogin(String name, String openid, String authtoken) {
                }
                //第三方游戏不需要使用此回调
                @Override
                public void onAccountRemove(boolean isRemoved) {
                }
            });
        }
    }

    //以下为辅助方法
    private void startPay(Activity activity, Double price, String vivoOrder, String payInfo) {

        String vivoSignature = "";
        ;
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
        localBundle.putString("signature", vivoSignature);// 签名信息，由订单推送接口返回
        localBundle.putString("package", activity.getPackageName()); //在开发者平台创建应用时填写的包名，务必一致，否则SDK界面不会被唤起
        localBundle.putString("useMode", "00");//固定值
        localBundle.putString("productName", productName);//商品名称
        localBundle.putString("productDes", productDes);//商品描述
        localBundle.putDouble("price", price/100);//价格
        localBundle.putString("userId", mUserInfo.mUserId);//ivo账户id，不允许为空
        Intent payIntent = new Intent(activity, PaymentActivity.class);
        payIntent.putExtra("payment_params", localBundle);
        activity.startActivityForResult(payIntent, REQUEST_CODE_PAY);
    }
}