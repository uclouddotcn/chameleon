package prj.chameleon.ewan;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import com.cw.platform.open.CwCallbackListener;
import com.cw.platform.open.CwErrorCode;
import com.cw.platform.open.CwFloatPlace;
import com.cw.platform.open.CwLogin;
import com.cw.platform.open.CwLoginListener;
import com.cw.platform.open.CwPlatform;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class EwanChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static class UserInfo {
        public String mUserId;
        public String mUserToken;
    }

    private static class Config {
        public String mAppId;
        public String mPacketid;
        public String mSignkey;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IAccountActionListener mAccountActionListener;
    private int mDebugModel = 1;
    private IDispatcherCb mLoginCb;
    private IDispatcherCb mPayCb;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mAppId = cfg.getString("appId");
        mCfg.mPacketid = cfg.getString("packetId");
        mCfg.mSignkey = cfg.getString("signKey");
        mChannel = commCfg.mChannel;
        if (commCfg.mIsDebug) {
            mDebugModel = 0;//0：调试模式(测试环境) 1：正式模式
        }
    }

    @Override
    public void init(Activity activity, final IDispatcherCb cb) {
        activation(activity, cb);
    }

    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        CwPlatform.getInstance().cwLoginView(activity);
        mLoginCb = cb;
        mAccountActionListener = accountActionListener;
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
                       String currencyName,//货币名称
                       String payInfo,
                       int rate,//单价
                       int realPayMoney,//总价
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
        if (mPayCb != null)
            return;
        CwPlatform.getInstance().enterPayCenterView(activity,
                Integer.valueOf(serverId),//充值服务器标识
                orderId,//游戏方自定义字段，一般为CP的订单号
                realPayMoney,//充值金额，单位元
                currencyName);//游戏道具金额名称（如为可变金额时此参数无效，传空字串即可）
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
        if (mPayCb != null)
            return;
        CwPlatform.getInstance().enterPayCenterView(activity,
                Integer.valueOf(serverId),//充值服务器标识
                orderId,//游戏方自定义字段，一般为CP的订单号
                realPayMoney,//充值金额，单位元
                "");//游戏道具金额名称（如为可变金额时此参数无效，传空字串即可）
        mPayCb = cb;
    }

    @Override
    public void createToolBar(Activity activity, int position) {
        CwFloatPlace realPostion = null;
        switch (position) {
            case Constants.TOOLBAR_BOTTOM_LEFT:
                realPostion = CwFloatPlace.left_bottom;
                break;
            case Constants.TOOLBAR_BOTTOM_RIGHT:
                realPostion = CwFloatPlace.right_bottom;
                break;
            case Constants.TOOLBAR_MID_LEFT:
                realPostion = CwFloatPlace.left_mid;
                break;
            case Constants.TOOLBAR_MID_RIGHT:
                realPostion = CwFloatPlace.right_mid;
                break;
            case Constants.TOOLBAR_TOP_LEFT:
                realPostion = CwFloatPlace.left_top;
                break;
            case Constants.TOOLBAR_TOP_RIGHT:
                realPostion = CwFloatPlace.right_top;
                break;
        }
        CwPlatform.getInstance().cwShowFloat(activity, realPostion);
    }

    @Override
    public void showFloatBar(Activity activity, boolean visible) {
        if (visible){
            CwPlatform.getInstance().cwHideFloat();
        }
    }

    @Override
    public void destroyToolBar(Activity activity) {
        CwPlatform.getInstance().cwRecycleFloat();
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
        return "ewan";
    }

    @Override
    public void exit(final Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CwPlatform.getInstance().releaseRes(activity, new CwCallbackListener() {
                    @Override
                    public void callback(int code) {
                        //游戏退出相关操作处理
                        cb.onFinished(Constants.ErrorCode.ERR_LOGIN_GAME_EXIT_NOCARE, null);
                    }
                });
            }
        });
    }

    /**
     * 初始化数据<BR>
     * [功能详细描述]
     */
    private void activation(final Activity activity, final IDispatcherCb cb) {
        /*
         * 初始化数据
         * @param appId
         * @param signkey　
         * @param debugModel 0:测试，1:正式
         * @param packetid 包ID
         */
        CwPlatform.getInstance().initSDK(activity,
                mCfg.mAppId,
                mCfg.mSignkey,
                mDebugModel,
                mCfg.mPacketid,
                new CwCallbackListener() {
                    @Override
                    public void callback(int code) {
                        Log.e("ewan init callback", "code = " + String.valueOf(code));
                        switch (code) {
                            case CwErrorCode.CW_SUCCESS://成功
                                //监听登录成功返回信息
                                CwPlatform.getInstance()
                                        .setLoginListener(new CwLoginListener() {
                                            @Override
                                            public void callback(CwLogin cwLogin) {
                                                if (mLoginCb == null) {
                                                    return;
                                                }
                                                //登录成功后返回token数据
                                                mUserInfo = new UserInfo();
                                                mUserInfo.mUserId = cwLogin.getOpenId();
                                                mUserInfo.mUserToken = cwLogin.getToken();
                                                mLoginCb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(cwLogin.getToken(), cwLogin.getOpenId(), mChannel));
                                            }
                                        });

                                //监听用户取消登录返回
                                CwPlatform.getInstance()
                                        .setCancelLogListener(new CwCallbackListener() {
                                            @Override
                                            public void callback(int code) {
                                                if (CwErrorCode.CW_CANCEL_LOGIN == code) {
                                                    if (mLoginCb == null) {
                                                        return;
                                                    }
                                                    mLoginCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                                }
                                            }
                                        });
                                //监听用户注销账号返回
                                CwPlatform.getInstance()
                                        .setLogoutListener(new CwCallbackListener() {

                                            @Override
                                            public void callback(int code) {
                                                //账号已退出登录 接收到该通知游戏重新启动
                                                CwPlatform.getInstance().releaseRes(activity, new CwCallbackListener() {
                                                    @Override
                                                    public void callback(int arg0) {
                                                        // 自动生成的方法存根
                                                        if (mAccountActionListener != null) {
                                                            mAccountActionListener.onAccountLogout();
                                                        }
                                                        mUserInfo = null;
                                                    }
                                                });

                                            }
                                        });

                                //充值操作回调监听
                                CwPlatform.getInstance()
                                        .setPayResultListener(new CwCallbackListener() {

                                            @Override
                                            public void callback(int code) {
                                                if (mPayCb == null)
                                                    return;
                                                switch (code) {
                                                    case CwErrorCode.CW_CANCEL_PAY://取消充值
                                                        mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                                                        break;
                                                    case CwErrorCode.CW_PAY_FINISH://完成充值（此处是前端流程完成，具体充值成功与否以后台数据同步为准）
                                                        mPayCb.onFinished(Constants.ErrorCode.ERR_OK, null);
                                                        break;
                                                    default:
                                                        mPayCb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                                                        break;
                                                }

                                            }
                                        });
                                break;
                            case CwErrorCode.CW_OAUTH_FAIL://授权失败
                                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                break;
                            case CwErrorCode.CW_SERVER_BUSY://服务器繁忙
                                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                break;
                            case CwErrorCode.CW_NETWORK_ERROR:
                                //网络异常
                                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                break;
                            default:
                                cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                                break;
                        }
                    }
                });

    }
}