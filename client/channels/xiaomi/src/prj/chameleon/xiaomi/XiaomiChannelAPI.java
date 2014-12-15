package prj.chameleon.xiaomi;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.util.Log;

import com.xiaomi.gamecenter.sdk.GameInfoField;
import com.xiaomi.gamecenter.sdk.MiCommplatform;
import com.xiaomi.gamecenter.sdk.MiErrorCode;
import com.xiaomi.gamecenter.sdk.OnLoginProcessListener;
import com.xiaomi.gamecenter.sdk.OnPayProcessListener;
import com.xiaomi.gamecenter.sdk.entry.MiAccountInfo;
import com.xiaomi.gamecenter.sdk.entry.MiAppInfo;
import com.xiaomi.gamecenter.sdk.entry.MiBuyInfo;
import com.xiaomi.gamecenter.sdk.entry.ScreenOrientation;

import org.json.JSONObject;

import java.lang.ref.WeakReference;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;


public class XiaomiChannelAPI extends SingleSDKChannelAPI.SingleSDK {
    private static class UserInfo {
        public UserInfo(String uid, String session, String nick) {
            mUid = uid;
            mSession = session;
            mNick = nick;
        }
        public String mUid;
        public String mSession;
        public String mNick;
    }
    private static class UserGameInfo {
        public String mRoleID;
        public String mRoleName;
        public String mRoleLevel;
        public String mZoneName;
    }
    private UserInfo mUserInfo;
    private UserGameInfo mUserGameInfo;
    private class LoginProcessListener implements OnLoginProcessListener {
        private IDispatcherCb mCb;
        private WeakReference<Activity> mActivity;
        public LoginProcessListener (Activity activity, IDispatcherCb cb) {
            mActivity = new WeakReference<Activity>(activity);
            mCb = cb;
        }

        @Override
        public void finishLoginProcess(final int i, final MiAccountInfo miAccountInfo) {
            Activity activity = mActivity.get();
            if (activity != null) {
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (i == MiErrorCode.MI_XIAOMI_PAYMENT_SUCCESS) {
                            JSONObject loginInfo = JsonMaker.makeLoginResponse(miAccountInfo.getSessionId(),
                                    String.valueOf(miAccountInfo.getUid()), mChannel);
                            mUserInfo = new UserInfo(String.valueOf(miAccountInfo.getUid()), miAccountInfo.getSessionId(),
                                    miAccountInfo.getNikename());
                            mCb.onFinished(Constants.ErrorCode.ERR_OK, loginInfo);
                        } else if (i == MiErrorCode.MI_XIAOMI_PAYMENT_ERROR_ACTION_EXECUTED) {
                            mCb.onFinished(Constants.ErrorCode.ERR_LOGIN_IN_PROGRESS, null);
                        } else {
                            mCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        }
                    }
                });
            }
        }
    }

    private ScreenOrientation mScreenOrientation;
    private String mAppId;
    private String mAppKey;
    @Override
    public void charge(final Activity activity,
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
        MiBuyInfo miBuyInfo= new MiBuyInfo();
        miBuyInfo.setCpOrderId(orderId);//订单号唯一（不为空）
        miBuyInfo.setCpUserInfo(mChannel); //此参数在用户支付成功后会透传给CP的服务器
        miBuyInfo.setCount(realPayMoney/rate);
        miBuyInfo.setAmount(realPayMoney/100); //必须是大于1的整数，10代表10米币，即10元人民币（不为空）

//用户信息，网游必须设置、单机游戏或应用可选
        Bundle mBundle = new Bundle();
        mBundle.putString(GameInfoField.GAME_USER_ROLEID, uidInGame);    //角色id
        mBundle.putString(GameInfoField.GAME_USER_ROLE_NAME, userNameInGame);
        if (mUserGameInfo != null) {
            mBundle.putString(GameInfoField.GAME_USER_LV, mUserGameInfo.mRoleLevel);
            mBundle.putString(GameInfoField.GAME_USER_GAMER_VIP, "vip");
            mBundle.putString(GameInfoField.GAME_USER_PARTY_NAME, "");
            mBundle.putString(GameInfoField.GAME_USER_BALANCE, "0");
            mBundle.putString(GameInfoField.GAME_USER_SERVER_NAME, mUserGameInfo.mZoneName);
        }
        miBuyInfo.setExtraInfo(mBundle); //设置用户信息

        MiCommplatform.getInstance().miUniPay(activity, miBuyInfo,
                new OnPayProcessListener()
                {
                    @Override
                    public void finishPayProcess( final int code ) {
                        activity.runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                switch( code ) {
                                    case MiErrorCode.MI_XIAOMI_PAYMENT_SUCCESS:
                                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                                        break;
                                    case MiErrorCode.MI_XIAOMI_PAYMENT_ERROR_PAY_CANCEL:
                                        cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                                        //取消购买
                                        break;
                                    case MiErrorCode.MI_XIAOMI_PAYMENT_ERROR_PAY_FAILURE:
                                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                        //购买失败
                                        break;
                                    case  MiErrorCode.MI_XIAOMI_PAYMENT_ERROR_ACTION_EXECUTED:
                                        cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
                                        //操作正在进行中
                                        break;
                                    default:
                                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                        break;
                                }
                            }
                        });
                    }
                });
    }

    @Override
    public void buy(final Activity activity,
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
        final MiBuyInfo miBuyInfo = new MiBuyInfo();
        miBuyInfo.setCpOrderId(orderId);//订单号唯一（不为空）
        miBuyInfo.setProductCode(productID);//商品代码，开发者申请获得（不为空）
        miBuyInfo.setCount( productCount );//购买数量(商品数量最大9999，最小1)（不为空）
        miBuyInfo.setCpUserInfo(mChannel); //此参数在用户支付成功后会透传给CP的服务器
        Bundle mBundle = new Bundle();
        mBundle.putString(GameInfoField.GAME_USER_ROLEID, uidInGame);    //角色id
        mBundle.putString(GameInfoField.GAME_USER_ROLE_NAME, userNameInGame);
        if (mUserGameInfo != null) {
            mBundle.putString(GameInfoField.GAME_USER_LV, mUserGameInfo.mRoleLevel);
            mBundle.putString(GameInfoField.GAME_USER_GAMER_VIP, "vip");
            mBundle.putString(GameInfoField.GAME_USER_PARTY_NAME, "");
            mBundle.putString(GameInfoField.GAME_USER_BALANCE, "0");
            mBundle.putString(GameInfoField.GAME_USER_SERVER_NAME, mUserGameInfo.mZoneName);
        }
        miBuyInfo.setExtraInfo(mBundle); //设置用户信息

        MiCommplatform.getInstance().miUniPay(activity, miBuyInfo,
                new OnPayProcessListener() {
                    @Override
                    public void finishPayProcess(final int code) {
                        activity.runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                switch (code) {
                                    case MiErrorCode.MI_XIAOMI_PAYMENT_SUCCESS:
                                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                                        break;
                                    case MiErrorCode.MI_XIAOMI_PAYMENT_ERROR_PAY_CANCEL:
                                        cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                                        //取消购买
                                        break;
                                    case MiErrorCode.MI_XIAOMI_PAYMENT_ERROR_PAY_FAILURE:
                                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                        //购买失败
                                        break;
                                    case MiErrorCode.MI_XIAOMI_PAYMENT_ERROR_ACTION_EXECUTED:
                                        cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
                                        //操作正在进行中
                                        break;
                                    default:
                                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                        break;
                                }
                            }
                        });
                    }
                });
    }

    @Override
    public String getId() {
        return "xiaomi";
    }

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mAppId = cfg.getString("appId");
        mAppKey = cfg.getString("appKey");
        mScreenOrientation = commCfg.mIsLandscape ? ScreenOrientation.horizontal :
                ScreenOrientation.vertical;
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {

        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void onApplicationEvent(int event, Object... arguments) {
        switch (event) {
            case Constants.ApplicationEvent.AFTER_ON_CREATE:
                Application app = (Application) arguments[0];
                MiAppInfo appInfo = new MiAppInfo();
                appInfo.setAppId(mAppId);
                appInfo.setAppKey(mAppKey);
                appInfo.setOrientation(mScreenOrientation); //横竖屏
                MiCommplatform.Init(app, appInfo);
                Log.d(Constants.TAG, "current package name " + app.getPackageName());
                Log.d(Constants.TAG, "after on create event");
                break;
        }
    }

    @Override
    public boolean registGuest(Activity activity, String tips, IDispatcherCb cb) {
        return false;
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        MiCommplatform.getInstance().miLogin( activity, new LoginProcessListener(activity, cb));
    }

    @Override
    public void logout(Activity activity) {
        mUserInfo = null;
    }

    @Override
    public boolean runProtocol(Activity activity, String protocol, String message, IDispatcherCb cb) {
        return false;
    }

 
   @Override
    public String getUid() {
       if (mUserInfo != null) {
           return mUserInfo.mUid;
       } else {
           return "";
       }
    }

    @Override
    public String getToken() {
        if (mUserInfo != null) {
            return mUserInfo.mSession;
        } else {
            return "";
        }
    }

    @Override
    public boolean isLogined() {
        return mUserInfo != null;
    }

    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        mUserInfo = null;
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_LOGIN_GAME_EXIT_NOCARE, null);
            }
        });
    }


    @Override
    public void submitPlayerInfo(Activity activity,
                                 String roleId,
                                 String roleName,
                                 String roleLevel,
                                 int zoneId,
                                 String zoneName) {
        if (mUserGameInfo == null) {
            mUserGameInfo = new UserGameInfo();
        }
        mUserGameInfo.mRoleID = roleId;
        mUserGameInfo.mRoleName = roleName;
        mUserGameInfo.mRoleLevel = roleLevel;
        mUserGameInfo.mZoneName = zoneName;
    }
}
