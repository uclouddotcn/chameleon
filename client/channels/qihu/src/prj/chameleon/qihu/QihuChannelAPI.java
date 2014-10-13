package prj.chameleon.qihu;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.qihoo.gamecenter.sdk.activity.ContainerActivity;
import com.qihoo.gamecenter.sdk.common.IDispatcherCallback;
import com.qihoo.gamecenter.sdk.matrix.Matrix;
import com.qihoo.gamecenter.sdk.protocols.ProtocolConfigs;
import com.qihoo.gamecenter.sdk.protocols.ProtocolKeys;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.ChameleonError;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class QihuChannelAPI extends SingleSDKChannelAPI.SingleSDK {
    private static class UserInfo {
        public String mUid;
        public String mSession;
        public boolean loadFromRsp(String rsp) {
            try {
                JSONObject obj = new JSONObject(rsp);
                int code = obj.getInt("code");
                if (code != Constants.ErrorCode.ERR_OK) {
                    return false;
                } else {
                    JSONObject loginInfo = obj.getJSONObject("loginInfo");
                    mUid = loginInfo.getString("uid");
                    mSession = loginInfo.getString("token");
                    return true;
                }
            } catch (JSONException e) {
                Log.e(Constants.TAG, "Fail to parse login json", e);
                return false;
            }

        }
    }
    private static final String RESPONSE_TYPE_CODE = "access_token";

    // callback for login request
    class LoginDispatcherCallback implements IDispatcherCallback {
        private IDispatcherCb mCb = null;
        private boolean mIsFromGuestMethod = false;
        private String mChannelName;

        LoginDispatcherCallback(IDispatcherCb cb, boolean isFromGuestMethod, String channelName) {
            mCb = cb;
            mIsFromGuestMethod = isFromGuestMethod;
            mChannelName = channelName;
        }

        @Override
        public void onFinished(String data) {
            Log.d(Constants.TAG, String.format("login get callback %s", data));
            try {
                JSONObject ret = null;
                JSONObject loginInfo;
                int retCode = 0;
                JSONObject result = new JSONObject(data);
                int errCode = result.optInt("error_code", -1);
                Log.e(Constants.TAG, data);
                if (errCode == 0) {
                    JSONObject content = new JSONObject(result.getString("data"));
                    String authorizationCode = content.optString(RESPONSE_TYPE_CODE);
                    loginInfo = JsonMaker.makeLoginResponse(authorizationCode, "", mChannelName);
                    if (mIsFromGuestMethod) {
                        ret = new JSONObject();
                        ret.put("guest", 0);
                        ret.put("loginInfo", loginInfo);
                    } else {
                        ret = loginInfo;
                    }
                } else {
                    retCode = -1;
                }
                mCb.onFinished(retCode, ret);
            } catch (Exception e) {
                Log.e(Constants.TAG, "fail to parse sdk login", e);
                mCb.onFinished(-1, null);
            }
        }
    }

    // callback for pay request
    class PayCallback implements IDispatcherCallback {
        private IDispatcherCb mCb = null;

        PayCallback(IDispatcherCb cb) {
            mCb = cb;
        }

        @Override
        public void onFinished(String data) {
            Log.d(Constants.TAG, "mPayCallback, data is " + data);
            JSONObject jsonRes;
            try {
                    jsonRes = new JSONObject(data);
                    // error_code 状态码:0 支付成功, 1 支付失败,-1 支付取消,-2 支付进行中。
                    // error_msg 状态描述
                    int errorCode = jsonRes.getInt("error_code");
                    mCb.onFinished(mapBuyErrorCode(errorCode), null);
            } catch (JSONException e) {
                Log.e(Constants.TAG, "unexpected exception", e);
            }
        }
    }

    private boolean mCfgLandscape;
    private boolean mCfgBGTransparent;
    private String mCfgUri;
    private String mCfgAppName;
    private IAccountActionListener mAccountActionListener;
    private UserInfo mUserInfo;


    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfgLandscape = commCfg.mIsLandscape;
        mCfgBGTransparent = cfg.getBoolean("bgTransparent");
        mCfgUri = cfg.getString("uri");
        mCfgAppName = commCfg.mAppName;
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(final Activity context, final IDispatcherCb cb) {

        Matrix.init(context);
        context.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(0, null);
            }
        });
    }

    @Override
    public void loginGuest(Activity activity, IDispatcherCb loginCallback, IAccountActionListener accountActionListener) {
        doSdkLogin(activity, mCfgLandscape, mCfgBGTransparent, loginCallback, true);
        mAccountActionListener = accountActionListener;
    }

    @Override
    public boolean registGuest(Activity activity, String tips, IDispatcherCb cb) {
        return false;
    }

    @Override
    public void login(Activity activity, IDispatcherCb cb, IAccountActionListener accountActionListener) {
        doSdkLogin(activity, mCfgLandscape, mCfgLandscape, cb, false);
        mAccountActionListener = accountActionListener;
    }

    @Override
    public boolean onLoginRsp(String loginRsp) {
        UserInfo userInfo = new UserInfo();
        if (userInfo.loadFromRsp(loginRsp)) {
            mUserInfo = userInfo;
            return true;
        } else {
            return false;
        }
    }

    @Override
    public void charge(Activity activity,
                       String orderId,
                       String appUid,
                       String appUserName,
                       String serverId,
                       String currencyName,
                       String payInfo,
                       int rate,
                       int realPayMoney,
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
        if (!isLogined()) {
            throw new ChameleonError("need login first");
        }
        if (allowUserChange) {
            realPayMoney = 0;
        }
        Intent intent = getChargeIntent(activity, orderId, mUserInfo.mUid, mUserInfo.mSession, appUid, appUserName,
                currencyName, rate, realPayMoney);
        // 必需参数,使用 360SDK 的支付模块。
        intent.putExtra(ProtocolKeys.FUNCTION_CODE, ProtocolConfigs.FUNC_CODE_PAY);
        // 界面相关参数,360SDK 登录界面背景是否透明。
        intent.putExtra(ProtocolKeys.IS_LOGIN_BG_TRANSPARENT, mCfgBGTransparent);
        Matrix.invokeActivity(activity, intent, new PayCallback(cb));
    }

    @Override
    public void buy(Activity activity,
                    String orderId,
                    String appUid,
                    String appUserName,
                    String serverId,
                    String productName,
                    String productID,
                    String payInfo,
                    int productCount,
                    int realPayMoney,
                    final IDispatcherCb cb) {
        Intent intent = getBuyIntent(activity, orderId, mUserInfo.mUid, mUserInfo.mSession, appUid, appUserName,
            productID, productName, productCount, realPayMoney);
        // 必需参数,使用 360SDK 的支付模块。
        intent.putExtra(ProtocolKeys.FUNCTION_CODE, ProtocolConfigs.FUNC_CODE_PAY);
        // 界面相关参数,360SDK 登录界面背景是否透明。 intent.putExtra(ProtocolKeys.IS_LOGIN_BG_TRANSPARENT, isBgTransparent);
        Matrix.invokeActivity(activity, intent, new PayCallback(cb));
    }

    @Override
    public String getId() {
        return "qihu";
    }

    @Override
    public void logout(Activity activity) {
        Intent intent = getQuitIntent(activity, mCfgLandscape);
        Matrix.invokeActivity(activity, intent, new IDispatcherCallback() {
            @Override
            public void onFinished(String s) {
                if (mAccountActionListener != null) {
                    mAccountActionListener.onAccountLogout();
                }
                mUserInfo = null;
            }
        });
    }

    @Override
    public boolean isSupportSwitchAccount() {
        return true;
    }

    @Override
    public boolean switchAccount(Activity activity, final IDispatcherCb cb) {
        Intent intent = getSwitchAccountIntent(activity, mCfgLandscape, mCfgBGTransparent);
        Matrix.invokeActivity(activity, intent, new LoginDispatcherCallback(cb, false, mChannel));
        return true;
    }

    @Override
    public void createToolBar(Activity activity, int position) {

    }

    @Override
    public void showFloatBar(Activity activity, boolean visible) {
        // don't support 360 float bar
    }

    @Override
    public void destroyToolBar(Activity activity) {
        // don't support 360 float bar
    }

    @Override
    public void onResume(Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {

            @Override
            public void run() {
                if (cb != null) {
                    cb.onFinished(0, null);
                }
            }
        });
    }


    @Override
    public void antiAddiction(final Activity activity, final IDispatcherCb cb) {
        Intent intent = getAntiAddiction(activity, mUserInfo.mUid, mUserInfo.mSession);
        Matrix.execute(activity, intent, new IDispatcherCallback() {

            @Override
            public void onFinished(String s) {
                try {
                    JSONObject result = new JSONObject(s);
                    int errCode = result.getInt("error_code");
                    if (errCode == 0) {
                        JSONObject contentData = result.getJSONObject("content");
                        JSONArray retData = contentData.getJSONArray("ret");
                        Log.d(Constants.TAG, "ret data = " + retData);
                        int status = retData.getJSONObject(0).getInt("status");
                        Log.d(Constants.TAG, "status = " + status);
                        int flag = 0;
                        if (status == 0) {
                            flag = Constants.ANTI_ADDICTION_UNKNOWN;
                        } else if (status == 1) {
                            flag = Constants.ANTI_ADDICTION_CHILD;
                        } else if (status == 2) {
                            flag = Constants.ANTI_ADDICTION_ADULT;
                        }
                        if (flag != Constants.ANTI_ADDICTION_ADULT) {
                            Bundle bundle = new Bundle();
                            bundle.putBoolean(ProtocolKeys.IS_SCREEN_ORIENTATION_LANDSCAPE, mCfgLandscape);
                            bundle.putString(ProtocolKeys.QIHOO_USER_ID, mUserInfo.mUid);
                            bundle.putInt(ProtocolKeys.FUNCTION_CODE, ProtocolConfigs.FUNC_CODE_REAL_NAME_REGISTER);
                            Intent intent = new Intent(activity, ContainerActivity.class);
                            intent.putExtras(bundle);
                            Matrix.invokeActivity(activity, intent, new IDispatcherCallback() {
                                @Override
                                public void onFinished(String data) {
                                    JSONObject ret = new JSONObject();
                                    try {
                                        ret.put("flag", Constants.ANTI_ADDICTION_ADULT);
                                        cb.onFinished(0, ret);
                                    } catch (JSONException e) {
                                        cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                                    }
                                }
                            });
                        } else {
                            JSONObject ret = new JSONObject();
                            ret.put("flag", Constants.ANTI_ADDICTION_ADULT);
                            cb.onFinished(0, ret);
                        }
                    } else {
                        cb.onFinished(errCode, null);
                    }
                } catch (JSONException e) {
                    Log.e(Constants.TAG, "fail to fetch anti addiction info", e);
                    cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                }
            }
        });
    }

    @Override
    public boolean runProtocol(Activity activity, String protocol, String message, IDispatcherCb cb) {
        return false;
    }


    @Override
    public String getUid() {
        if (!isLogined()) {
            return "";
        }
        return mUserInfo.mUid;
    }

    @Override
    public String getToken() {
        if (!isLogined()) {
            return "";
        }
        return mUserInfo.mSession;
    }

    @Override
    public boolean isLogined() {
        return mUserInfo != null;
    }


    @Override
    public void onDestroy(Activity activity) {
        Matrix.destroy(activity);
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

    private Intent getLoginIntent(Activity activity, boolean isLandScape, boolean isBGTransparent) {
        Bundle bundle = new Bundle();
        bundle.putBoolean(ProtocolKeys.IS_LOGIN_BG_TRANSPARENT, isBGTransparent);
        bundle.putBoolean(ProtocolKeys.IS_SCREEN_ORIENTATION_LANDSCAPE, isLandScape);
        bundle.putString(ProtocolKeys.RESPONSE_TYPE, RESPONSE_TYPE_CODE);
        bundle.putInt(ProtocolKeys.FUNCTION_CODE, ProtocolConfigs.FUNC_CODE_LOGIN);
        Intent intent = new Intent(activity, ContainerActivity.class);
        intent.putExtras(bundle);
        return intent;
    }

    private Intent getSwitchAccountIntent(Activity activity,
                                          boolean isLandScape,
                                          boolean isBGTransparent) {
        Bundle bundle = new Bundle();
        bundle.putBoolean(ProtocolKeys.IS_LOGIN_BG_TRANSPARENT, isBGTransparent);
        bundle.putBoolean(ProtocolKeys.IS_SCREEN_ORIENTATION_LANDSCAPE, isLandScape);
        bundle.putString(ProtocolKeys.RESPONSE_TYPE, RESPONSE_TYPE_CODE);
        bundle.putInt(ProtocolKeys.FUNCTION_CODE, ProtocolConfigs.FUNC_CODE_SWITCH_ACCOUNT);
        Intent intent = new Intent(activity, ContainerActivity.class);
        intent.putExtras(bundle);
        return intent;
    }

    protected void doSdkLogin(Activity activity,
                              boolean isLandScape,
                              boolean isBGTransparent,
                              final IDispatcherCb cb,
                              boolean isFromGuestMethod) {
        Log.d(Constants.TAG, "qihu do login");
        Intent intent = getLoginIntent(activity, isLandScape, isBGTransparent);
        Matrix.invokeActivity(activity, intent, new LoginDispatcherCallback(cb, isFromGuestMethod, mChannel));
    }

/*
    private Intent getToolbarIntent(Activity activity, boolean isLandScape) {
        Bundle bundle = new Bundle();
        // 界面相关参数,360SDK 界面是否以横屏显示。
        bundle.putBoolean(ProtocolKeys.IS_SCREEN_ORIENTATION_LANDSCAPE, isLandScape);
        bundle.putInt(ProtocolKeys.FUNCTION_CODE, ProtocolConfigs.FUNC_CODE_SETTINGS);
        Intent intent = new Intent(activity, ContainerActivity.class);
        intent.putExtras(bundle);
        return intent;
    }
*/
    private Intent getAntiAddiction(Activity activity, String qihooUserId, String accessToken) {
        Bundle bundle = new Bundle();
        // 必需参数,用户 access token,要使用注意过期和刷新问题,最大 64 字符。
        bundle.putString(ProtocolKeys.ACCESS_TOKEN, accessToken);
        // 必需参数,360 账号 id,整数。
        bundle.putString(ProtocolKeys.QIHOO_USER_ID, qihooUserId);
        // 必需参数,使用 360SDK 的防沉迷查询模块。
        bundle.putInt(ProtocolKeys.FUNCTION_CODE, ProtocolConfigs.FUNC_CODE_ANTI_ADDICTION_QUERY);
        Intent intent = new Intent(activity, ContainerActivity.class);
        intent.putExtras(bundle);
        return intent;
    }

    /***
     * 生成调用 360SDK 退出接口的 Intent *
     * @param isLandScape screen orientation
     * @return Intent
     */
    private Intent getQuitIntent(Activity activity, boolean isLandScape) {
        Bundle bundle = new Bundle();
        // 界面相关参数,360SDK 界面是否以横屏显示。
        bundle.putBoolean(ProtocolKeys.IS_SCREEN_ORIENTATION_LANDSCAPE, isLandScape);
        // 必需参数,使用 360SDK 的退出模块。
        bundle.putInt(ProtocolKeys.FUNCTION_CODE, ProtocolConfigs.FUNC_CODE_QUIT);
        Intent intent = new Intent(activity, ContainerActivity.class);
        intent.putExtras(bundle);
        return intent;
    }

    private Intent getBuyIntent(Activity activity,
                                String orderId,
                                String uid,
                                String token,
                                String appUid,
                                String appUserName,
                                String productId,
                                String productName,
                                int productCount,
                                int realPayMoney) {
        Bundle bundle = new Bundle();
        // 界面相关参数,360SDK 界面是否以横屏显示。
        bundle.putBoolean(ProtocolKeys.IS_SCREEN_ORIENTATION_LANDSCAPE, mCfgLandscape);
        // *** 以下非界面相关参数 ***

        // 设置 QihooPay 中的参数。
        // 必需参数,用户 access token,要使用注意过期和刷新问题,最大 64 字符。
        bundle.putString(ProtocolKeys.ACCESS_TOKEN, token);
        // 必需参数,360 账号 id,整数。
        bundle.putString(ProtocolKeys.QIHOO_USER_ID, uid);
        // 必需参数,所购买商品金额, 以分为单位。金额大于等于 100 分,360SDK 运行定额支付流程; 金额数为 0,360SDK 运行不定额支付流程。
        bundle.putString(ProtocolKeys.AMOUNT, String.valueOf(realPayMoney));

        // 必需参数,人民币与游戏充值币的默认比例,例如 2,代表 1 元人民币可以兑换 2 个游戏币,整数。
        int exchangeRate = productCount * 100 / realPayMoney;
        bundle.putString(ProtocolKeys.RATE, String.valueOf(exchangeRate));
        // 必需参数,所购买商品名称,应用指定,建议中文,最大 10 个中文字。
        bundle.putString(ProtocolKeys.PRODUCT_NAME, productName);
        // 必需参数,购买商品的商品 id,应用指定,最大 16 字符。
        bundle.putString(ProtocolKeys.PRODUCT_ID, productId);
        // 必需参数,应用方提供的支付结果通知 uri,最大 255 字符。360 服务器将把支付接口回调给该 uri,具体协议请查 看文档中,支付结果通知接口–应用服务器提供接口。
        bundle.putString(ProtocolKeys.NOTIFY_URI, mCfgUri);
        // 必需参数,游戏或应用名称,最大 16 中文字。
        bundle.putString(ProtocolKeys.APP_NAME, mCfgAppName);
        // 必需参数,应用内的用户名,如游戏角色名。 若应用内绑定 360 账号和应用账号,则可用 360 用户名,最大 16 中 文字。(充值不分区服,
        // 充到统一的用户账户,各区服角色均可使用)。
        bundle.putString(ProtocolKeys.APP_USER_NAME, appUserName);
        // 必需参数,应用内的用户 id。
        // 若应用内绑定 360 账号和应用账号,充值不分区服,充到统一的用户账户,各区服角色均可使用,则可用 360 用户 ID 最大 32 字符。
        bundle.putString(ProtocolKeys.APP_USER_ID, appUid);
        // 可选参数,应用扩展信息 1,原样返回,最大 255 字符。
        bundle.putString(ProtocolKeys.APP_EXT_1, mChannel);
        bundle.putString(ProtocolKeys.APP_EXT_2, String.valueOf(productCount));
        // 可选参数,应用订单号,应用内必须唯一,最大 32 字符。
        bundle.putString(ProtocolKeys.APP_ORDER_ID, orderId);

        Intent intent = new Intent(activity, ContainerActivity.class);
        intent.putExtras(bundle);
        return intent;

    }

    private Intent getChargeIntent(Activity activity,
                                   String orderId,
                                   String uid,
                                   String token,
                                   String appUid,
                                   String appUserName,
                                   String currencyName,
                                   int rate,
                                   int realPayMoney) {
        Bundle bundle = new Bundle();
        // 界面相关参数,360SDK 界面是否以横屏显示。
        bundle.putBoolean(ProtocolKeys.IS_SCREEN_ORIENTATION_LANDSCAPE, mCfgLandscape);
        // *** 以下非界面相关参数 ***

        // 设置 QihooPay 中的参数。
        // 必需参数,用户 access token,要使用注意过期和刷新问题,最大 64 字符。
        bundle.putString(ProtocolKeys.ACCESS_TOKEN, token);
        // 必需参数,360 账号 id,整数。
        bundle.putString(ProtocolKeys.QIHOO_USER_ID, uid);
        bundle.putString(ProtocolKeys.AMOUNT, String.valueOf(realPayMoney));

        // 必需参数,人民币与游戏充值币的默认比例,例如 2,代表 1 元人民币可以兑换 2 个游戏币,整数。
        bundle.putString(ProtocolKeys.RATE, String.valueOf(rate));
        // 必需参数,所购买商品名称,应用指定,建议中文,最大 10 个中文字。
        bundle.putString(ProtocolKeys.PRODUCT_NAME, currencyName);
        // 必需参数,购买商品的商品 id,应用指定,最大 16 字符。
        bundle.putString(ProtocolKeys.PRODUCT_ID, "currency");
        // 必需参数,应用方提供的支付结果通知 uri,最大 255 字符。360 服务器将把支付接口回调给该 uri,具体协议请查 看文档中,支付结果通知接口–应用服务器提供接口。
        bundle.putString(ProtocolKeys.NOTIFY_URI, mCfgUri);
        // 必需参数,游戏或应用名称,最大 16 中文字。
        bundle.putString(ProtocolKeys.APP_NAME, mCfgAppName);
        // 必需参数,应用内的用户名,如游戏角色名。 若应用内绑定 360 账号和应用账号,则可用 360 用户名,最大 16 中 文字。(充值不分区服,
        // 充到统一的用户账户,各区服角色均可使用)。
        bundle.putString(ProtocolKeys.APP_USER_NAME, appUserName);
        // 必需参数,应用内的用户 id。
        // 若应用内绑定 360 账号和应用账号,充值不分区服,充到统一的用户账户,各区服角色均可使用,则可用 360 用户 ID 最大 32 字符。
        bundle.putString(ProtocolKeys.APP_USER_ID, appUid);
        // 可选参数,应用扩展信息 1,原样返回,最大 255 字符。
        bundle.putString(ProtocolKeys.APP_EXT_1, mChannel);
        bundle.putString(ProtocolKeys.APP_EXT_2, String.valueOf(rate));
        // 可选参数,应用订单号,应用内必须唯一,最大 32 字符。
        bundle.putString(ProtocolKeys.APP_ORDER_ID, orderId);

        Intent intent = new Intent(activity, ContainerActivity.class);
        intent.putExtras(bundle);
        return intent;
    }

    private int mapBuyErrorCode(int code) {
        switch (code) {
            case 0:
                return Constants.ErrorCode.ERR_OK;
            case 1:
                return Constants.ErrorCode.ERR_PAY_FAIL;
            case -1:
                return Constants.ErrorCode.ERR_PAY_CANCEL;
            case -2:
                return Constants.ErrorCode.ERR_PAY_IN_PROGRESS;
            default:
                Log.w(Constants.TAG, "unknown code " + String.valueOf(code));
                return Constants.ErrorCode.ERR_INTERNAL;
        }
    }
}
