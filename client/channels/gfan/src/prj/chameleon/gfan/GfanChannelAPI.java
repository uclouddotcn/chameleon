package prj.chameleon.gfan;

import android.app.Activity;

import com.mappn.sdk.pay.GfanChargeCallback;
import com.mappn.sdk.pay.GfanConfirmOrderCallback;
import com.mappn.sdk.pay.GfanPay;
import com.mappn.sdk.pay.GfanPayCallback;
import com.mappn.sdk.pay.model.Order;
import com.mappn.sdk.uc.GfanUCCallback;
import com.mappn.sdk.uc.GfanUCenter;
import com.mappn.sdk.uc.User;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class GfanChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    private static String TAG = GfanChannelAPI.class.getSimpleName();

    private User muser = null;
    private IAccountActionListener mAccountActionListener = null;

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        GfanPay.getInstance(activity.getApplicationContext()).init();
        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void login(final Activity activity, final IDispatcherCb cb, final IAccountActionListener accountActionListener) {
        GfanUCenter.login(activity, new GfanUCCallback() {

            @Override
            public void onSuccess(User user, int loginType) {
                if (GfanUCenter.isOneKey(activity)){
                    GfanUCenter.modfiy(activity, new GfanUCCallback() {
                        @Override
                        public void onSuccess(User user, int returnType) {
                            if (GfanUCenter.RETURN_TYPE_MODFIY == returnType) {
                                muser = user;
                                JSONObject obj =
                                        JsonMaker.makeLoginResponse(user.getToken(),
                                                String.valueOf(user.getUid()), mChannel);
                                cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginGuestResponse(false, obj));
                                mAccountActionListener = accountActionListener;
                            }
                        }
                        @Override
                        public void onError(int returnType) {
                            if (GfanUCenter.RETURN_TYPE_MODFIY == returnType) {
                                cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginGuestResponse(true, null));
                            }
                        }
                    });
                } else {
                    muser = user;
                    cb.onFinished(Constants.ErrorCode.ERR_OK,
                            JsonMaker.makeLoginResponse(user.getToken(), String.valueOf(user.getUid()),
                                    mChannel));
                }
            }

            @Override
            public void onError(int loginType) {
                cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
            }
        });
    }

    @Override
    public void logout(Activity activity) {
        GfanUCenter.logout(activity);
        if (mAccountActionListener != null) {
            mAccountActionListener.onAccountLogout();
        }
        muser = null;
    }

    @Override
    public void charge(Activity activity, String orderId, String uidInGame, String userNameInGame, String serverId, String currencyName, String payInfo, int rate, int realPayMoney, boolean allowUserChange, final IDispatcherCb cb) {
        GfanPay.getInstance(activity).charge(
                new GfanChargeCallback() {
                    @Override
                    public void onSuccess(User user) {
                        if (user==null) {
                            return;
                        }
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    }

                    @Override
                    public void onError(User user) {
                        if (user != null) {
                            cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                        } else {
                            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
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
        Order morder = new Order(productName, payInfo, realPayMoney, orderId);
        GfanPay.getInstance(activity).pay(morder,
                new GfanPayCallback() {
                    @Override
                    public void onSuccess(User user, Order order) {
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                    }
                    @Override
                    public void onError(User user) {
                        if (user != null) {
                            cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                        } else {
                            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        }
                    }
                });

    }

    @Override
    public boolean isSupportProtocol(String protocol) {
        if (protocol.equals("gfan_confirmPay")){
            return true;
        }else {
            return false;
        }
    }

    @Override
    public boolean runProtocol(Activity activity, String protocol, String message, final IDispatcherCb cb) {
        if (protocol.equals("gfan_confirmPay")){
            GfanPay.getInstance(activity).confirmPay(new GfanConfirmOrderCallback() {
                @Override
                public void onExist(Order order) {
                    if (order != null) {
                        try {
                            JSONObject res = new JSONObject();
                            res.put("OrderID", order.getOrderID());
                            res.put("Money", order.getMoney());
                            res.put("Number", order.getNumber());
                            res.put("PayDesc", order.getPayDesc());
                            res.put("PayName", order.getPayName());
                            cb.onFinished(Constants.ErrorCode.ERR_OK, res);
                        } catch (JSONException e) {
                            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                        }
                    }else {
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                    }
                }
                @Override
                public void onNotExist() {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            });
            return true ;
        }else {
            return false;
        }
    }

    @Override
    public String getUid() {
        if (muser == null) {
            return "";
        } else {
            return String.valueOf(muser.getUid());
        }
    }

    @Override
    public String getToken() {
        if (muser == null) {
            return "";
        } else {
            return muser.getToken();
        }
    }

    @Override
    public boolean isLogined() {
        return muser != null;
    }

    @Override
    public String getId() {
        return "gfan";
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
}