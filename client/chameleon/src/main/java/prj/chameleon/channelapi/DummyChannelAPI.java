package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

import java.util.TreeMap;

/**
 * Created by wushauk on 3/24/14.
 * A dummy implementation of the platform API, if there are not implementation is specified, this one
 * will be used( can be used during development)
 */

public class DummyChannelAPI  {

    private static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<DummyChannelAPIImp> {

        public ChannelAPIImp(DummyChannelAPIImp imp) {
            super(imp);
        }

        @Override
        public String getChannelName() {
            return "prj.chameleon.dummy";
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            return bundle;
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new DummyChannelAPIImp());
    }

    public static class DummyChannelAPIImp extends SingleSDKChannelAPI.SingleSDK{
        private IAccountActionListener mAccountActionListener;
        private String mUin;
        private String mToken;
        private boolean mIsGuest = false;

        @Override
        public void initCfg(Bundle cfg) {

        }

        @Override
        public void init(Activity activity, boolean isDebug, final IDispatcherCb cb) {
            if (activity.getApplicationInfo().metaData != null) {
                mUin = activity.getApplicationInfo().metaData.getString("dummyUin");
                mToken = activity.getApplicationInfo().metaData.getString("dummyToken");
                if (mUin == null) {
                    mUin = "12345678";
                    mToken = "87654321";
                }
            } else {
                mUin = "12345678";
                mToken = "87654321";
            }
            activity.runOnUiThread(new Runnable() {

                @Override
                public void run() {
                    cb.onFinished(0, null);
                }
            });
        }

        @Override
        public void loginGuest(Activity activity,
                               final IDispatcherCb loginCallback,
                               IAccountActionListener accountActionListener) {
            activity.runOnUiThread(new Runnable() {

                @Override
                public void run() {
                    loginCallback.onFinished(0,
                            JsonMaker.makeLoginGuestResponse(true, null));
                    mIsGuest = true;
                }
            });

        }

        @Override
        public boolean registGuest(Activity activity, String tips, final IDispatcherCb cb) {
            if (!mIsGuest) {
                return false;
            }
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    cb.onFinished(Constants.ErrorCode.ERR_OK,
                            JsonMaker.makeLoginResponse(mToken,
                                    String.format("{\"uin\":\"%s\"}", mUin), "dummy"));
                }
            });
            return true;
        }

        @Override
        public void login(Activity activity,
                          final IDispatcherCb cb,
                          IAccountActionListener accountActionListener) {
            activity.runOnUiThread(new Runnable() {

                @Override
                public void run() {
                    cb.onFinished(0,
                            JsonMaker.makeLoginResponse(mToken, String.format("{\"uin\":\"%s\"}", mUin), "dumy"));

                }
            });
        }

        @Override
        public boolean onLoginRsp(String loginRsp) {
            return false;
        }

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
            activity.runOnUiThread(new Runnable() {

                @Override
                public void run() {
                    cb.onFinished(0, null);
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
            activity.runOnUiThread(new Runnable() {

                @Override
                public void run() {
                    cb.onFinished(0, null);
                }
            });
        }

        @Override
        public void logout(Activity activity) {
            activity.runOnUiThread(new Runnable() {

                @Override
                public void run() {
                    if (mAccountActionListener != null) {
                        mAccountActionListener.onAccountLogout();
                    }
                }
            });
        }

        @Override
        public boolean isSupportSwitchAccount() {
            return false;
        }

        @Override
        public boolean switchAccount(Activity activity, final IDispatcherCb cb) {
            activity.runOnUiThread(new Runnable() {

                @Override
                public void run() {
                    if (mAccountActionListener != null) {
                        cb.onFinished(Constants.ErrorCode.ERR_OK, JsonMaker.makeLoginResponse("ucloud-token", "UCLOUD", "{\"uid\": 987654321}"));
                    }
                }
            });
            return true;
        }

        @Override
        public void createToolBar(Activity activity, int position) {

        }

        @Override
        public void showFloatBar(Activity activity, boolean visible) {

        }

        @Override
        public void destroyToolBar(Activity activity) {

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
        public void onPause(Activity activity) {

        }

        @Override
        public void antiAddiction(Activity activity, final IDispatcherCb cb) {
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
        public boolean runProtocol(Activity activity, String protocol, String message, IDispatcherCb cb) {
            return false;
        }

        @Override
        public void onActivityResult(int requestCode, int resultCode, Intent data) {

        }

        @Override
        public String getUid() {
            return null;
        }

        @Override
        public String getToken() {
            return null;
        }

        @Override
        public boolean isLogined() {
            return false;
        }

        @Override
        public void onApplicationEvent(int event, Object... arguments) {

        }

        @Override
        public String getPayToken() {
            return null;
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


}
