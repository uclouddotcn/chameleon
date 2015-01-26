package prj.chameleon.dianxin;

import android.app.Activity;
import android.os.Bundle;

import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

import cn.egame.terminal.paysdk.EgamePay;
import cn.egame.terminal.paysdk.EgamePayListener;
import cn.egame.terminal.sdk.log.EgameAgent;
import cn.play.dserv.CheckTool;
import cn.play.dserv.ExitCallBack;
import egame.terminal.usersdk.CallBackListener;
import egame.terminal.usersdk.EgameUser;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.JsonTools;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class DianxinChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static String TAG = "DianxinChannelAPI";

    private static class UserInfo {
        public String mUserId;
        public String mUserToken;
    }

    private static class Config {
        public int mClientId;
    }

    private Config mCfg;
    private UserInfo mUserInfo;
    private IAccountActionListener mAccountActionListener;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mCfg = new Config();
        mCfg.mClientId = Integer.valueOf(cfg.getString("clientId"));
        mChannel = commCfg.mChannel;
    }

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        EgamePay.init(activity);//初始化支付SDK
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        EgameUser.start(activity, mCfg.mClientId,
                new CallBackListener() {
                    @Override
                    public void onSuccess(String info) {
                        //游戏收到登陆返回成功标识
                        cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(info, null, mChannel));
                        mAccountActionListener = accountActionListener;
                    }

                    @Override
                    public void onFailed(int code) {
                        //登录失败,请检查网络设置
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                    }

                    @Override
                    public void onCancel() {
                        //取消登录
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                    }
                });
    }

    @Override
    public boolean onLoginRsp(String loginRsp) {
        mUserInfo = new UserInfo();
        JSONObject jsonObject = JsonTools.getJsonObject(loginRsp);
        JSONObject loginInfo = JsonTools.getJsonObject(jsonObject, "loginInfo");
        mUserInfo.mUserToken = JsonTools.getStringByKey(loginInfo, "uid");;
        mUserInfo.mUserId = JsonTools.getStringByKey(loginInfo, "token");;
        return super.onLoginRsp(loginRsp);
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
        startPay(activity,String.valueOf(realPayMoney),orderId,payInfo, cb);
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
        startPay(activity,String.valueOf(realPayMoney),orderId,payInfo, cb);
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
    public void onPause(Activity activity) {
        super.onPause(activity);
        EgameAgent.onPause(activity);
    }

    @Override
    public void exit(final Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CheckTool.exit(activity, new ExitCallBack() {

                    @Override
                    public void exit() {
                        //退出游戏操作
                        cb.onFinished(Constants.ErrorCode.ERR_LOGIN_GAME_EXIT_NOCARE, null);
                    }

                    @Override
                    public void cancel() {
                        //取消退出，返回游戏
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                    }
                });
            }
        });
    }

    private void startPay(final Activity activity, String price, String orderID, String payInfo, final IDispatcherCb cb) {
        HashMap<String, String> payParams=new HashMap<String, String>();
        payParams.put(EgamePay.PAY_PARAMS_KEY_TOOLS_PRICE, price);//道具价格（参数为必填）
        payParams.put(EgamePay.PAY_PARAMS_KEY_CP_PARAMS, orderID);//CP自定义交易号（参数为必填,32位以内string型，请勿包含特殊字符）
        payParams.put(EgamePay.PAY_PARAMS_KEY_TOOLS_DESC, payInfo);//道具描述（可选）
        payParams.put(EgamePay.PAY_PARAMS_KEY_PRIORITY, "other");//优先第三方支付
        EgamePay.pay(activity, payParams,new EgamePayListener() {
            @Override
            public void paySuccess(Map params) {
                //支付成功
                EgameAgent.onEvent(activity, "payment success");
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }

            @Override
            public void payFailed(Map params, int errorInt) {
                //支付失败：错误代码:errorInt
                HashMap values= new HashMap();
                values.put("errorInt",""+errorInt);
                EgameAgent.onEvent(activity, "errorInt",values);
                cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
            }

            @Override
            public void payCancel(Map params) {
                //支付已取消
                EgameAgent.onEvent(activity, "payment cancelled");
                cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
            }
        });
    }

}