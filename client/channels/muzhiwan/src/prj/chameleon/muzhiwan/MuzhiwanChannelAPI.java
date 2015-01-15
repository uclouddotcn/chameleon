package prj.chameleon.muzhiwan;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import com.muzhiwan.sdk.login.MzwApiCallback;
import com.muzhiwan.sdk.login.MzwApiFactory;
import com.muzhiwan.sdk.pay.domain.Order;
import com.muzhiwan.sdk.utils.CallbackCode;


import org.json.JSONObject;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.JsonTools;
import prj.chameleon.channelapi.SingleSDKChannelAPI;



public final class MuzhiwanChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private String mChannel;
    private boolean mIsLandscape;
    private int mScreenOrientation;
    private String mUserId;
    private String mUserSession;

    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        mChannel = commCfg.mChannel;
        mIsLandscape = commCfg.mIsLandscape;
        if (mIsLandscape){
            mScreenOrientation = MzwApiFactory.ORIENTATION_HORIZONTAL;
        }else{
            mScreenOrientation = MzwApiFactory.ORIENTATION_VERTICAL;
        }
    }


    @Override
    public void init(Activity activity, final IDispatcherCb cb) {
        MzwApiFactory.getInstance().init(activity, mScreenOrientation, new MzwApiCallback() {
            @Override
            public void onResult(int code, Object arg1) {
                if (code == 1) {
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                } else {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }
        });
    }

    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {

        MzwApiFactory.getInstance().doLogin(activity, new MzwApiCallback() {
            @Override
            public void onResult(final int code, final Object data) {
                Log.e("mzw_net_modify", "data:" + data);
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (code == CallbackCode.SUCCESS) {
                            mUserSession = String.valueOf(data);    //获取token
                            //这里需要跟服务器通信，获取用户其他信息。
                            cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse(mUserSession, null, mChannel));
                        } else if (code == CallbackCode.ERROR) {
                            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        } else if (code == CallbackCode.CANCEL) {
                            cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                        }
                    }
                });
            }
        });
    }

    @Override
    public boolean onLoginRsp(String loginRsp) {
        JSONObject jsonObject = JsonTools.getJsonObject(loginRsp);
        JSONObject loginInfo = JsonTools.getJsonObject(jsonObject, "loginInfo");
        mUserId = JsonTools.getStringByKey(loginInfo, "uid");
        return super.onLoginRsp(loginRsp);
    }

    @Override
    public void logout(final Activity activity) {
        MzwApiFactory.getInstance().doLogout(activity);
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
        doPay(activity, realPayMoney/100, payInfo, cb);
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
        doPay(activity, realPayMoney/100, payInfo, cb);
    }

    private void doPay(final Activity activity, int money, String payInfo, final IDispatcherCb cb){

        Order order = new Order();
        order.setMoney(money);
        JSONObject jsonObject = JsonTools.getJsonObject(payInfo);
        order.setProductid(JsonTools.getStringByKey(jsonObject, "productId"));
        order.setProductname(JsonTools.getStringByKey(jsonObject, "productName"));
        order.setProductdesc(JsonTools.getStringByKey(jsonObject, "productDesc"));
        order.setExtern(JsonTools.getStringByKey(jsonObject, "extern"));

        MzwApiFactory.getInstance().doPay(activity, order, new MzwApiCallback() {
            @Override
            public void onResult(final int code, final Object data) {
                if(activity == null)
                    return;
                activity.runOnUiThread(new Runnable() {
                    public void run() {
                        if (code == CallbackCode.SUCCESS) {
                            final Order order = (Order) data;
                            Log.e("mzw_sdk_pay", "order:" + order.getProductname());
                            activity.runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    if (cb != null){
                                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                                    }
                                }
                            });
                        } else if (code == CallbackCode.PROCESSING) {
                            cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
                        }else if (code == CallbackCode.CANCEL) {
                            cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                        }else {
                            cb.onFinished(Constants.ErrorCode.ERR_PAY_UNKNOWN, null);
                        }
                    }
                });
            }
        });
    }

    @Override
    public String getUid() {
        if (mUserId == null) {
            return "";
        } else {
            return mUserId;
        }
    }

    @Override
    public String getToken() {
        if (mUserSession == null) {
            return "";
        } else {
            return mUserSession;
        }
    }

    @Override
    public boolean isLogined() {
        return mUserSession != null;
    }

    @Override
    public String getId() {
        return "4399";
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

}

