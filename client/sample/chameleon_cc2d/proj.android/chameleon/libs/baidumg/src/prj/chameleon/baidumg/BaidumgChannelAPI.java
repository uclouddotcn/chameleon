package prj.chameleon.baidumg;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.duoku.platform.DkErrorCode;
import com.duoku.platform.DkPlatform;
import com.duoku.platform.DkPlatformSettings;
import com.duoku.platform.DkProtocolConfig;
import com.duoku.platform.DkProtocolKeys;
import com.duoku.platform.IDKSDKCallBack;
import com.duoku.platform.ui.DKContainerActivity;
import com.duoku.platform.ui.DKPaycenterActivity;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public class BaidumgChannelAPI extends SingleSDKChannelAPI.SingleSDK {
    private IAccountActionListener mAccountListener;
    private static class UserInfo {
        public String mUserId;
        public String mUserSession;
    }
    private static class Cfg {
        public String mAppID;
        public String mAppKey;
        public int mScreenOrientation;
    }

    private UserInfo mUserInfo;
    private Cfg mCfg;
    @Override
    public void charge(Activity activity,
                       String orderId,
                       String uidInGame,
                       String userNameInGame,
                       String serverId,
                       String currencyName,
                       String payInfo,
                       int rate,
                       int realPayMoney,
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
        if (realPayMoney > 99999) {
            Log.e(Constants.TAG, "baidumg: excceeds money limit");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            return;
        }
        Bundle bundle = new Bundle();
        bundle.putInt(DkProtocolKeys.FUNCTION_CODE, DkProtocolConfig.FUNCTION_Pay);
        if (allowUserChange) {
            bundle.putString(DkProtocolKeys.FUNCTION_AMOUNT, String.valueOf(realPayMoney/100));
        } else {
            bundle.putString(DkProtocolKeys.FUNCTION_AMOUNT, "0");
        }
        bundle.putString(DkProtocolKeys.FUNCTION_EXCHANGE_RATIO, String.valueOf(rate));
        bundle.putString(DkProtocolKeys.FUNCTION_ORDER_ID, orderId);
        bundle.putString(DkProtocolKeys.FUNCTION_GAMEBI_NAME, currencyName);
        bundle.putString(DkProtocolKeys.FUNCTION_PAY_DESC, composePayExt(null));

        Intent intent = new Intent(activity, DKPaycenterActivity.class);
        intent.putExtras(bundle);
        DkPlatform.invokeActivity(activity, intent, new IDKSDKCallBack() {
            @Override
            public void onResponse(String s) {
                try {
                    JSONObject jsonObj = new JSONObject(s);
                    int stateCode = jsonObj.getInt(DkProtocolKeys.FUNCTION_STATE_CODE);
                    if (stateCode == DkErrorCode.DK_ORDER_NEED_CHECK) {
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    } else {
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                    }
                } catch (JSONException e) {
                    Log.e(Constants.TAG, "Fail to parse pay result", e);
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
                    int productCount,
                    int realPayMoney,
                    final IDispatcherCb cb) {
        if (realPayMoney > 99999) {
            Log.e(Constants.TAG, "baidumg: excceeds money limit");
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
            return;
        }
        Bundle bundle = new Bundle();
        bundle.putInt(DkProtocolKeys.FUNCTION_CODE, DkProtocolConfig.FUNCTION_Pay);
        bundle.putString(DkProtocolKeys.FUNCTION_AMOUNT, String.valueOf(realPayMoney/100));
        bundle.putString(DkProtocolKeys.FUNCTION_EXCHANGE_RATIO, String.valueOf(realPayMoney/productCount));
        bundle.putString(DkProtocolKeys.FUNCTION_ORDER_ID, orderId);
        bundle.putString(DkProtocolKeys.FUNCTION_GAMEBI_NAME, productName);
        bundle.putString(DkProtocolKeys.FUNCTION_PAY_DESC, composePayExt(productID));
        Intent intent = new Intent(activity, DKPaycenterActivity.class);
        intent.putExtras(bundle);
        DkPlatform.invokeActivity(activity, intent, new IDKSDKCallBack() {
            @Override
            public void onResponse(String s) {
                try {
                    JSONObject jsonObj = new JSONObject(s);
                    int stateCode = jsonObj.getInt(DkProtocolKeys.FUNCTION_STATE_CODE);
                    if (stateCode == DkErrorCode.DK_ORDER_NEED_CHECK) {
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    } else {
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                    }
                } catch (JSONException e) {
                    Log.e(Constants.TAG, "Fail to parse pay result", e);
                }
            }
        });
    }

    @Override
    public String getId() {
        return "baidumg";
    }

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Cfg();
        mCfg.mAppID = cfg.getString("appId");
        mCfg.mAppKey = cfg.getString("appKey");
        mCfg.mScreenOrientation = commCfg.mIsLandscape ? DkPlatformSettings.SCREEN_ORIENTATION_LANDSCAPE:
                DkPlatformSettings.SCREEN_ORIENTATION_PORTRAIT;
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        DkPlatformSettings appInfo = new DkPlatformSettings();
        appInfo.setAppid(mCfg.mAppID);
        appInfo.setAppkey(mCfg.mAppKey);
        appInfo.setOrient(mCfg.mScreenOrientation);
        appInfo.setGameCategory(DkPlatformSettings.GameCategory.ONLINE_Game);
        DkPlatform.init(activity, appInfo);
        DkPlatform.setDKSuspendWindowCallBack(new IDKSDKCallBack() {
            @Override
            public void onResponse(String s) {
                int _statuscode = 0;
                try {
                    JSONObject _jsonObj = new JSONObject(s);
                    _statuscode = _jsonObj.getInt(DkProtocolKeys.FUNCTION_STATE_CODE);
                } catch (JSONException e) {
                    Log.e(Constants.TAG, "Fail to parse the message", e);
                }
                if (_statuscode == DkErrorCode.DK_CHANGE_USER) {
                    if (mAccountListener != null) {
                        mAccountListener.onAccountLogout();
                    }
                }
            }
        });
    }


    @Override
    public void login(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        Bundle bundle = new Bundle();
        bundle.putInt(DkProtocolKeys.FUNCTION_CODE, DkProtocolConfig.FUNCTION_LOGIN);
        Intent intent = new Intent(activity, DKContainerActivity.class);
        intent.putExtras(bundle);
        mAccountListener = accountActionListener;
        DkPlatform.invokeActivity(activity, intent, new IDKSDKCallBack() {
            @Override
            public void onResponse(String s) {
                int _loginState;
                Log.d(Constants.TAG, "recv login rsp " + s);
                UserInfo userInfo = new UserInfo();
                JSONObject jsonObj;
                try {
                    jsonObj = new JSONObject(s);
                    _loginState = jsonObj.getInt(DkProtocolKeys.FUNCTION_STATE_CODE);
                    if (DkErrorCode.DK_LOGIN_SUCCESS == _loginState) {
                        userInfo.mUserId = jsonObj.getString(DkProtocolKeys.USER_ID);
                        userInfo.mUserSession = jsonObj.getString(DkProtocolKeys.USER_SESSIONID);
                        mUserInfo = userInfo;
                        cb.onFinished(Constants.ErrorCode.ERR_OK,
                                JsonMaker.makeLoginResponse(userInfo.mUserSession, userInfo.mUserId,
                                        mChannel));
                    } else if (DkErrorCode.DK_LOGIN_CANCELED == _loginState) {
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                    } else {
                        Log.e(Constants.TAG, String.format("unknown login rsp state from baidumg: %d", _loginState));
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                    }

                } catch (JSONException e) {
                    Log.e(Constants.TAG, "Fail to parse login info", e);
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }
        });
    }

    @Override
    public void logout(Activity activity) {
        DkPlatform.doDKUserLogout();
        mUserInfo = null;
    }


    @Override
    public void antiAddiction(Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                JSONObject ret = new JSONObject();
                try {
                    ret.put("flag", Constants.ANTI_ADDICTION_ADULT);
                    cb.onFinished(Constants.ErrorCode.ERR_OK, ret);
                } catch (JSONException e) {
                    cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                }

            }
        });
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
            return mUserInfo.mUserSession;
        }
    }

    @Override
    public boolean isLogined() {
        return mUserInfo == null;
    }

    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        DkPlatform.destroy(activity);
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
    }

    private String composePayExt(String productId) {
        StringBuilder builder = new StringBuilder();
        builder.append(mChannel);
        builder.append('|');
        builder.append(productId);
        return builder.toString();
    }
}
