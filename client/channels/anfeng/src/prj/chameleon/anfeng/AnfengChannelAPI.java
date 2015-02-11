package prj.chameleon.anfeng;

import android.app.Activity;
import android.os.Bundle;

import com.anfeng.pay.AnFengCallback;
import com.anfeng.pay.AnFengPaySDK;
import com.anfeng.pay.entity.CPInfo;
import com.anfeng.pay.entity.OrderInfo;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.DecimalFormat;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public final class AnfengChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static String TAG = "AnfengChannelAPI";

    private static class UserInfo {
        public String mUserId;
        public String mUserToken;
    }

    private static class Config {
        public String appId;
        public String privateKey;
        public String notifyUri;
    }

    private Config mCfg;
    private UserInfo mUserInfo;

    private IAccountActionListener mAccountActionListener;
    private IDispatcherCb loginCb;
    private IDispatcherCb payCb;

    private AnFengPaySDK mAnfengPaySDK;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.appId = cfg.getString("appId");
        mCfg.privateKey = cfg.getString("privateKey");
        mCfg.notifyUri = cfg.getString("notifyUri");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, final IDispatcherCb cb) {
        // 必须传入appkey和appid
        CPInfo info = new CPInfo();
        info.setAppId(mCfg.appId);
        info.setAppKey(mCfg.privateKey);
        info.setGameName(activity.getResources().getString(R.string.app_name));
        mAnfengPaySDK = AnFengPaySDK.getInstance();
        mAnfengPaySDK.setCPInfo(info);

        AnFengPaySDK.getInstance().setCallback(mCallback);
    }

    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        if (loginCb != null)
            return;
        AnFengPaySDK.anfanLogin(activity);
        mAccountActionListener = accountActionListener;
        loginCb = cb;
    }

    @Override
    public boolean isSupportSwitchAccount() {
        return true;
    }

    @Override
    public boolean switchAccount(Activity activity, IDispatcherCb cb) {
        if (loginCb != null)
            return super.switchAccount(activity, cb);
        AnFengPaySDK.changeUser(activity);
        loginCb = cb;
        return super.switchAccount(activity, cb);
    }

    @Override
    public void logout(Activity activity) {
        AnFengPaySDK.anfanLogout(activity);
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

        if (payCb != null)
            return;
        int money = realPayMoney / 100;
        DecimalFormat df = new DecimalFormat("0.00");
        OrderInfo info = new OrderInfo(orderId, df.format(money), currencyName, payInfo);
        AnFengPaySDK.anFanPay(activity, info, mCfg.notifyUri);
        payCb = cb;
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

        if (payCb != null)
            return;
        int money = realPayMoney / 100;
        DecimalFormat df = new DecimalFormat("0.00");
        OrderInfo info = new OrderInfo(orderId, df.format(money), productName, payInfo);
        AnFengPaySDK.anFanPay(activity, info, mCfg.notifyUri);
        payCb = cb;

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
        return "anfeng";
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

    private AnFengCallback mCallback = new AnFengCallback() {

        @Override
        public void onLoginSuccessCallback(String uid, String uuid, String ucid) {
            //"用户登陆成功:uid=>" + uid + "\nuuid=>" + uuid + "\nucid=>" + ucid, Toast.LENGTH_LONG).show();
            if (loginCb == null)
                return;
            mUserInfo = new UserInfo();
            mUserInfo.mUserId = ucid;
            mUserInfo.mUserToken = uuid;
            JSONObject jsonObject = new JSONObject();
            try {
                jsonObject.put("uid", uid);
                jsonObject.put("ucid", ucid);
            } catch (JSONException e) {
            }
            String others = jsonObject.toString();
            loginCb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(uuid, others, mChannel));
            loginCb = null;
        }

        @Override
        public void onLoginCancelCallback() {
            // "用户放弃了登录"
            if (loginCb == null)
                return;
            loginCb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
            loginCb = null;
        }

        @Override
        public void onLogoutCallback() {// 退出回调
            //"用户退出了登录"
            if (mAccountActionListener != null) {
                mAccountActionListener.onAccountLogout();
            }
            mUserInfo = null;
        }

        @Override
        public void onPaySuccessCallback(String result) {// 用户生成的安锋网订单号
            //"支付提示：" + "订单  " + result + "  已支付成功", 1).show();
            if (payCb == null)
                return;
            payCb.onFinished(Constants.ErrorCode.ERR_OK, null);
            payCb = null;
        }

        @Override
        public void onPayCancelCallback() {
            // "用户放弃了支付"
            if (payCb == null)
                return;
            payCb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
            payCb = null;
        }
    };
}