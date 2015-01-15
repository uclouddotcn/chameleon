package prj.chameleon.dianxin;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;

import com.ffcs.inapppaylib.PayHelper;
import com.ffcs.inapppaylib.bean.response.BaseResponse;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import cn.open189.api.AuthView;
import cn.open189.api.EmpAPI;
import cn.open189.api.http.Callback;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.JsonTools;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.channelapi.cbinding.AccountActionListener;

public final class DianxinChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static String TAG = "DianxinChannelAPI";

    private static class UserInfo {
        public String mUserId;
        public String mUserToken;
    }

    private static class Config {
        public String mAppId;
        public String mAppSecret;
        public String mRedirectUri;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IAccountActionListener mAccountActionListener;
    private IDispatcherCb mLoginCb;
    private IDispatcherCb mPayCb;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppId = cfg.getString("appId");
        mCfg.mAppSecret = cfg.getString("appSecret");
        mCfg.mRedirectUri = cfg.getString("redirectUri");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {

        /**
         * 发起登入请求,具体参数信息,请查看EMP开放API接口规范》的5.2.6章的“当response_type为”token”时”部分
         * .
         */
        if (mLoginCb != null)
            return;
        Intent intent = new Intent(activity, AuthView.class);
        intent.putExtra("app_id", mCfg.mAppId); // 应用在EMP平台上的唯一标识，在应用注册时分配
        intent.putExtra("app_secret", mCfg.mAppSecret); // EMP颁发给应用的密钥信息
        intent.putExtra("display", "mobile"); // 登录和授权页面的展现样式
        intent.putExtra("redirect_uri", mCfg.mRedirectUri); // 必须与应用安全设置中的设置回调地址一致.用于验证请求的目的,防止hack响应的行为.
        activity.startActivityForResult(intent, 189);
        mLoginCb = cb;
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        super.onActivityResult(activity, requestCode, resultCode, data);
        if (mLoginCb == null)
            return;
        if (resultCode == Activity.RESULT_OK && requestCode == 189) {
            /**
             * 此处获取EMP返回的access
             * token信息.具体请查看《EMP开放API接口规范》的5.2.7章的“额外应答参数：当response_type为
             * ”token”时”部分.
             */
            Bundle bundle = data.getExtras();
            Log.e(Constants.TAG, "dianxin login request bundle : " + bundle.toString());

            if (bundle.getString("res_code").equals("0")) {
                mUserInfo.mUserToken = bundle.getString("access_token");
                mUserInfo.mUserId = bundle.getString("open_id");
                mLoginCb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(mUserInfo.mUserToken, mUserInfo.mUserId, mChannel));
                StringBuilder sb = new StringBuilder();
                sb.append("res_code=" + bundle.getString("res_code") + "\n"); // 标准返回码。返回0表示成功
                sb.append("res_message=" + bundle.getString("res_message") + "\n"); // 返回码描述信息
                sb.append("access_token=" + bundle.getString("access_token") + "\n"); // 获取到的AT访问令牌
                sb.append("expires_in=" + bundle.getString("expires_in") + "\n"); // AT访问令牌的有效期（以秒为单位）
                sb.append("scope=" + bundle.getString("scope") + "\n"); // 权限列表，保留字段，默认为空，表示所有权限
                sb.append("state=" + bundle.getString("state") + "\n"); // 与请求参数中state的值一致
                sb.append("open_id=" + bundle.getString("open_id") + "\n"); // 天翼帐号的唯一标志，标识当前授权的用户
                Log.e(Constants.TAG, "dianxin login request : " + sb.toString());
            } else {
                mLoginCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            }
        } else {
            mLoginCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
        mLoginCb = null;
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
        startPay(activity, cb, payInfo);
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
        startPay(activity, cb, payInfo);
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
        return "dianxin";
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

    private void startPay(Activity activity, IDispatcherCb cb, String payInfo) {
        if (mPayCb != null)
            return;
        JSONObject jsonObject = JsonTools.getJsonObject(payInfo);
        String payCode = JsonTools.getStringByKey(jsonObject, "payCode");
        String payState = JsonTools.getStringByKey(jsonObject, "payState");
        PayHelper payHelper = PayHelper.getInstance(activity);
        payHelper.init(mCfg.mAppId, mCfg.mAppSecret);
        payHelper.settimeout(120000);    //设置超时时间（可不设，默认为8s）
        payHelper.pay(activity, payState, handler, payState);
        mPayCb = cb;
    }

    Handler handler = new Handler() {

        public void handleMessage(android.os.Message msg) {
            if (mPayCb == null)
                return;

            BaseResponse resp = null;
            switch (msg.what) {
//			    case com.ffcs.inapppaylib.bean.Constants.RESULT_NO_CT:
                //				//非电信用户
                //				break;
                case com.ffcs.inapppaylib.bean.Constants.RESULT_VALIDATE_FAILURE:
                    //合法性验证失败
                    resp = (BaseResponse) msg.obj;
                    mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_SESSION_INVALID, null);
                    break;
                case com.ffcs.inapppaylib.bean.Constants.RESULT_PAY_SUCCESS:
                    //支付成功
                    resp = (BaseResponse) msg.obj;
                    mPayCb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    break;
                case com.ffcs.inapppaylib.bean.Constants.RESULT_PAY_FAILURE:
                    //支付失败
                    resp = (BaseResponse) msg.obj;
                    mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                    break;
                default:
                    break;
            }
            mPayCb = null;
        }

        ;

    };

}