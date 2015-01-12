package prj.chameleon.dianxin;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;

import com.ffcs.inapppaylib.PayHelper;
import com.ffcs.inapppaylib.bean.response.BaseResponse;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import cn.open189.api.EmpAPI;
import cn.open189.api.http.Callback;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class DianxinChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static String TAG = "DianxinChannelAPI";

    private static class UserInfo {
        public String mUserId;
        public String mUserToken;
    }

    private static class Config {
        public String mAppId;
        public String mAppSecret;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IAccountActionListener mAccountActionListener;
    private IDispatcherCb mPayCb;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppId = cfg.getString("appId");
        mCfg.mAppSecret = cfg.getString("appSecret");
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        EmpAPI.getAccessToken(mCfg.mAppId,
                mCfg.mAppSecret, null, null,
                new Callback() {
                    @Override
                    public void onSuccess(final Object object) {
                        activity.runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                /**
                                 * 当请求成功时，获取EMP返回的access
                                 * token信息.具体请查看《EMP开放API接口规范》的5.3.7章.
                                 */
                                try {
                                    JSONObject json = (JSONObject) object;
                                    StringBuilder sb = new StringBuilder();
                                    sb.append("res_code=" + json.getString("res_code") + "\n"); // 标准返回码。返回0表示成功
                                    sb.append("res_message=" + json.getString("res_message") + "\n"); // 返回码描述信息
                                    sb.append("access_token=" + json.getString("access_token") + "\n"); // AT访问令牌的有效期（以秒为单位）
                                    sb.append("expires_in=" + json.getString("expires_in") + "\n"); // AT访问令牌的有效期（以秒为单位）
                                    if (json.has("scope")) {
                                        sb.append("scope=" + json.getString("scope") + "\n"); // 权限列表，保留字段，默认为空，表示所有权限
                                    }
                                    if (json.has("state")) {
                                        sb.append("state=" + json.getString("state") + "\n"); // 与请求参数中state的值一致
                                    }

                                    Log.i(TAG, sb.toString());
                                    if ("0".equals(json.getString("res_code"))) {
                                        mUserInfo = new UserInfo();
                                        mUserInfo.mUserToken = json.getString("access_token");
                                        mAccountActionListener = accountActionListener;
                                        cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(mUserInfo.mUserToken, "", mChannel));
                                    } else {
                                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                    }


                                } catch (JSONException e) {
                                    Log.i(TAG, e.toString());
                                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                }
                            }
                        });
                    }

                    @Override
                    public void onFail(final int code, final Object object) {
                        activity.runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                /**
                                 * 当请求失败时（如请求参数错误等）,获取EMP返回的信息，具体请查看《
                                 * EMP开放API接口规范》的5.3.7章.
                                 */
                                String result = code // 错误编码
                                        + ":" + object; // EMP返回的错误信息
                                Log.i(TAG, result);
                                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                            }
                        });
                    }

                    @Override
                    public void onException(final Throwable throwable) {
                        activity.runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                /**
                                 * 处理发送请求过程中的出现异常
                                 */
                                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                            }
                        });
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

        try {
            JSONObject jsonObject = new JSONObject(payInfo);
            String payCode = jsonObject.getString("payCode");
            String payState = jsonObject.getString("payState");
            PayHelper payHelper = PayHelper.getInstance(activity);
            payHelper.init(mCfg.mAppId, mCfg.mAppSecret);
            payHelper.settimeout(120000);	//设置超时时间（可不设，默认为8s）
            payHelper.pay(activity, payState, handler, payState);
            mPayCb = cb;
        } catch (JSONException e) {
        }
    }

    Handler handler = new Handler(){

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
                    resp = (BaseResponse)msg.obj;
                    mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_SESSION_INVALID, null);
                    break;
                case com.ffcs.inapppaylib.bean.Constants.RESULT_PAY_SUCCESS:
                    //支付成功
                    resp = (BaseResponse)msg.obj;
                    mPayCb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    break;
                case com.ffcs.inapppaylib.bean.Constants.RESULT_PAY_FAILURE:
                    //支付失败
                    resp = (BaseResponse)msg.obj;
                    mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                    break;
                default:
                    break;
            }

        };

    };
}