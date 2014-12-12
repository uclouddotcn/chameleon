package prj.chameleon.coolpad;

import android.app.Activity;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;

import com.coolcloud.uac.android.api.Coolcloud;
import com.coolcloud.uac.android.api.ErrInfo;
import com.coolcloud.uac.android.api.auth.OAuth2;
import com.iapppay.interfaces.authentactor.AccountBean;
import com.iapppay.interfaces.callback.IPayResultCallback;
import com.iapppay.sdk.main.CoolPadPay;
import com.iapppay.utils.RSAHelper;

import org.json.JSONException;
import org.json.JSONObject;

import java.net.URLDecoder;
import java.net.URLEncoder;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class CoolpadChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class UserInfo {
        public String mAuthCode;
        public String mUserID;
        public String mUserToken;
        public String mUserName;
    }

    private static class Config {
        public int mScapeType;
        public String mLoginAppId;
        public String mLoginAppKey;
        public String mPayAppId;
        public String mPayAppKey;
        public String mPayPlatKey;
        public String mNotifyurl;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IAccountActionListener mAccountActionListener;

    private Coolcloud mCoolcloud = null;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mLoginAppId = cfg.getString("loginAppId");
        mCfg.mLoginAppKey = cfg.getString("loginAppKey");
        mCfg.mPayAppId = cfg.getString("payAppId");
        mCfg.mPayAppKey = cfg.getString("payAppKey");
        mCfg.mPayPlatKey = cfg.getString("payPlatKey");
        mCfg.mNotifyurl = cfg.getString("notifyurl");
        if (commCfg.mIsLandscape)
            mCfg.mScapeType = CoolPadPay.LANDSCAPE;
        else
            mCfg.mScapeType = CoolPadPay.PORTRAIT;
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        //支付sdk初始化
        CoolPadPay.init(activity, mCfg.mScapeType, mCfg.mPayAppId);
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        //账户sdk初始化
        mCoolcloud = Coolcloud.createInstance(activity, mCfg.mLoginAppId, mCfg.mLoginAppKey);
        mCoolcloud.getAuthCode(activity, "", null, new OAuth2.OnAuthListener() {
            @Override
            public void onDone(Object code) {
                mUserInfo = new UserInfo();
                mUserInfo.mAuthCode = (String) code;
                mAccountActionListener = accountActionListener;
                cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(mUserInfo.mAuthCode, "", mChannel));
            }

            @Override
            public void onCancel() {
                cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
            }

            @Override
            public void onError(ErrInfo errInfo) {
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
        });

    }

    @Override
    public boolean onLoginRsp(String loginRsp) {
        JSONObject obj = null;
        try {
            obj = new JSONObject(loginRsp);
            int code = obj.getInt("code");
            if (code != Constants.ErrorCode.ERR_OK) {
                return false;
            } else {
                mUserInfo.mUserID = obj.getJSONObject("loginInfo").getString("uid");
                mUserInfo.mUserToken = obj.getJSONObject("loginInfo").getString("token");
                mUserInfo.mUserName = obj.getJSONObject("loginInfo").getString("name");
                return true;
            }
        } catch (JSONException e) {
            Log.e(Constants.TAG, "Fail to parse login rsp", e);
            return false;
        }
    }

    @Override
    public boolean isSupportSwitchAccount() {
        return true;
    }

    @Override
    public boolean switchAccount(Activity activity, final IDispatcherCb cb) {
        if (mCoolcloud == null)
            return false;

        mCoolcloud.getAuthCodeBySwitchAccount(activity, "", null, new OAuth2.OnAuthListener() {
            @Override
            public void onDone(Object code) {
                mUserInfo = new UserInfo();
                mUserInfo.mAuthCode = (String) code;
                cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(mUserInfo.mAuthCode, "", mChannel));
            }

            @Override
            public void onCancel() {
                cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
            }

            @Override
            public void onError(ErrInfo errInfo) {
                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
        });
        return true;
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
        startPayhub(activity, 1, realPayMoney, orderId, uidInGame, cb);
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
        int waresid = Integer.valueOf(productID) + 1;
        startPayhub(activity, waresid, 1, orderId, uidInGame, cb);
    }

    @Override
    public String getUid() {
        if (mUserInfo == null) {
            return "";
        } else {
            return mUserInfo.mUserID;
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
        return "coolpad";
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

    /**
     * activity
     * waresid 商品编号
     * price 商品价格，单位为元。如果您的商品配置的计费模式是应用传入价格，则本字段有效，否则price客户端传入无效，统一使用在商户自服务配置的价格
     * cporderid  本次支付的订单号，需要保证在应用范围内唯一
     */
    public void startPayhub(Activity activity, int waresid, double price, String cporderid, String uidInGame, final IDispatcherCb cb) {

        if(price > 500000){
            Log.e(Constants.TAG, "coolpad: excceeds money limit");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            return;
        }

        String genUrl = genUrl(mCfg.mPayAppId, uidInGame, mCfg.mPayAppKey, waresid, price, cporderid);

    	/* 发起支付 */
        AccountBean account = CoolPadPay.buildAccount(activity, mUserInfo.mUserToken, mCfg.mLoginAppId, mUserInfo.mUserID);
        CoolPadPay.startPay(activity, genUrl, account, new IPayResultCallback() {
            @Override
            public void onPayResult(int resultCode, String signvalue, String resultInfo) {
                mUserInfo.mAuthCode = null;
                switch (resultCode) {
                    case CoolPadPay.PAY_SUCCESS:
                        dealPaySuccess(signvalue);
                        break;
                    default:
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }

            /**
             * 支付成功。
             * 需要对应答返回的签名做验证，只有在签名验证通过的情况下，才是真正的支付成功
             */
            private void dealPaySuccess(String signValue) {
                if (TextUtils.isEmpty(signValue)) {
                    //  没有签名值
                    cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                    return;
                }

                boolean isvalid = false;
                try {
                    isvalid = signCpPaySuccessInfo(signValue);
                } catch (Exception e) {
                    isvalid = false;
                }
                if (isvalid) {
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                } else {
                    cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                }

            }

            /**
             * valid cp callback sign
             * @param signValue
             * @return
             * @throws Exception
             *
             * transdata={"cporderid":"1","transid":"2","appid":"3","waresid":31,
             * "feetype":4,"money":5,"count":6,"result":0,"transtype":0,
             * "transtime":"2012-12-12 12:11:10","cpprivate":"7",
             * "paytype":1}&sign=xxxxxx&signtype=RSA
             */
            private boolean signCpPaySuccessInfo(String signValue) throws Exception {
                int transdataLast = signValue.indexOf("&sign=");
                String transdata = URLDecoder.decode(signValue.substring("transdata=".length(), transdataLast));

                int signLast = signValue.indexOf("&signtype=");
                String sign = URLDecoder.decode(signValue.substring(transdataLast + "&sign=".length(), signLast));

                String signtype = signValue.substring(signLast + "&signtype=".length());

                boolean isSign = RSAHelper.verify(transdata, mCfg.mPayPlatKey, sign);
                if (signtype.equals("RSA") && isSign) {
                    return true;
                }
                return false;
            }
        });
    }

    /**
     * 客户端下单模式
     * 生成数据后需要对数据做签名，签名的算法是使用应用的私钥做RSA签名。
     * 应用的私钥可以在商户自服务获取
     */
    private String genUrl(String appid, String appuserid, String appKey, int waresid, double price, String cporderid) {
        String json = "";

        JSONObject obj = new JSONObject();
        try {
            obj.put("appid", appid);
            obj.put("waresid", waresid);
            obj.put("cporderid", cporderid);
            obj.put("price", price);
            obj.put("appuserid", appuserid);

            /*支付成功的通知地址。选填。如果客户端不设置本参数，则使用服务端配置的地址。*/
            if(!TextUtils.isEmpty(mCfg.mNotifyurl)){
                obj.put("notifyurl", mCfg.mNotifyurl);
            }

            json = obj.toString();
        } catch (Exception e) {
            e.printStackTrace();
        }
        String sign = "";
        try {
            String cppk = appKey;
            sign = RSAHelper.signForPKCS1(json, cppk);
        } catch (Exception e) {
        }

        return "transdata=" + URLEncoder.encode(json) + "&sign=" + URLEncoder.encode(sign) + "&signtype=" + "RSA";
    }


    @Override
    public void onDestroy(Activity activity) {
        super.onDestroy(activity);
        CoolPadPay.mPayResultCallback = null;
    }
}