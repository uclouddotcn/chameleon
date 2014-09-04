package com.example.testwrapper;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import com.loopj.android.http.JsonHttpResponseHandler;
import com.loopj.android.http.RequestParams;

import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;

import org.json.JSONException;
import org.json.JSONObject;


public class MainActivity extends Activity implements IAccountActionListener {

    /**
     *  login callback
     */
    private final static class LoginCallback implements IDispatcherCb {
        LoginCallback(MainActivity activity) {
            mActivity = activity;
        }

        @Override
        public void onFinished(int retCode, final JSONObject data) {
            if (retCode != Constants.ErrorCode.ERR_OK) {
                mActivity.setText("login failed with code " + Integer.valueOf(retCode));
                return;
            }
            Log.d("TEST", "mlogin data is: " + data);
            RequestParams req = new RequestParams();

            try {
                req.put("others", (String) data.get("others"));
                req.put("token", (String) data.get("token"));
                req.put("channel", (String) data.get("channel"));
                PlatformAPIRestClient.get("/sdkapi/login",
                        req,
                        new JsonHttpResponseHandler() {
                            @Override
                            public void onSuccess(final JSONObject ret) {
                                mActivity.runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        mActivity.onGotAuthroizationCode(ret);
                                    }
                                });
                            }
                            @Override
                            public void onFailure(java.lang.Throwable e, org.json.JSONArray errorResponse) {
                                if (errorResponse != null) {
                                    Log.e("TEST", errorResponse.toString(), e);
                                }

                            }
                            @Override
                            public void onFailure(java.lang.Throwable e, org.json.JSONObject errorResponse) {
                                if (errorResponse != null) {
                                    Log.e("TEST", errorResponse.toString(), e);

                                }
                                                            }
                        }
                );

            } catch (JSONException e) {
                Log.e("TEST", "fail to parse json", e);
            }

        }
        private MainActivity mActivity;
    }


    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        ChannelInterface.onActivityResult(requestCode, resultCode, data);
    }

    /**
     * callback for login guest method
     */
    private final static class LoginGuestCallback implements IDispatcherCb {
        LoginGuestCallback(MainActivity activity) {
            mActivity = activity;
        }

        @Override
        public void onFinished(int retCode, final JSONObject data) {
            Log.d("TEST", "mlogin data is: " + data);
            RequestParams req = new RequestParams();

            try {
                int guest = data.getInt("guest");
                if (guest != 0) {
                    mActivity.setText("login as a guest");
                } else {
                    JSONObject loginInfo =  data.getJSONObject("loginInfo");
                    req.put("others", (String) loginInfo.get("others"));
                    req.put("token", (String) loginInfo.get("token"));
                    req.put("platform", (String) loginInfo.get("platform"));
                    PlatformAPIRestClient.get("/sdkapi/login",
                            req,
                            new JsonHttpResponseHandler() {
                                @Override
                                public void onSuccess(final JSONObject ret) {
                                    mActivity.runOnUiThread(new Runnable() {
                                        @Override
                                        public void run() {
                                            mActivity.onGotAuthroizationCode(ret);
                                        }
                                    });
                                }
                            }
                    );
                }



            } catch (JSONException e) {
                Log.e("TEST", "fail to parse json", e);
            }

        }
        private MainActivity mActivity;
    }

    /**
     * callback for charge and buy methods
     */
    private final static class BuyCb implements IDispatcherCb {
        BuyCb(MainActivity activity) {
            mActivity = activity;
        }

        @Override
        public void onFinished(int retCode, final JSONObject data) {
            Log.d("TEST", "mbuy data is: " + data);
            RequestParams req = new RequestParams();
            mActivity.printData(retCode, data);
        }
        private MainActivity mActivity;
    }


    private boolean mHasCreateToolbar = false;
    private boolean mShowToolbar = false;
    private IDispatcherCb mLoginCallback = new LoginCallback(this);
    private IDispatcherCb mBuyCallback = new BuyCb(this);

    // implementation of the IAccountListener interface
    @Override
    public void preAccountSwitch() {
        setText("before the account switch");
    }

    @Override
    public void afterAccountSwitch(int code, JSONObject newUserInfo) {
        LoginCallback cb = new LoginCallback(this);
        cb.onFinished(Constants.ErrorCode.ERR_OK, newUserInfo);
    }

    @Override
    public void onAccountLogout() {
        setText("user logout");
    }

    @Override
    public void onGuestBind(JSONObject newUserInfo) {
        LoginCallback cb = new LoginCallback(this);
        cb.onFinished(Constants.ErrorCode.ERR_OK, newUserInfo);
    }
    ////////////////////////////////////////////////////////////////////


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        ChannelInterface.init(this, true, new IDispatcherCb() {

            @Override
            public void onFinished(int retCode, JSONObject data) {

            }

        });
        if (!ChannelInterface.isSupportSwitchAccount()) {
            Button view = (Button) this.findViewById(R.id.switch_btn);
            view.setEnabled(false);
        }
    }

	protected void onGotAuthroizationCode(final JSONObject authorization) {
		final TextView textView = (TextView) this.findViewById(R.id.textView1);
        String t = authorization.toString();
        Log.d("TEST", t);
        textView.setText(t);
        try {
            ChannelInterface.onLoginRsp(authorization.toString());
            setText("user login as uid: " + ChannelInterface.getUin() + ", token: " +  ChannelInterface.getToken());
        } catch (Exception e) {
            Log.e("TEST", "fail to get param", e);
        }
	}

	private static final String AUTH_CODE = "code"; 
    protected String parseAuthorizationCode(JSONObject data) {
    	String authorizationCode = null;           
    			int errCode = data.optInt("errno", -1); 
    			if (errCode == 0) {
    				JSONObject content = data.optJSONObject("data"); 
    				authorizationCode = content.optString(AUTH_CODE);                 
    			}

        Log.d("TEST", "parseAuthorizationCode=" + authorizationCode);
        return authorizationCode;
	}


	@Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.main, menu);
        return true;
    }

    @Override
    public void onPause() {
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
    }

    public void sendMessage(View view) {
    		Log.d("TEST", "1111");
    		doLogin(false);
    }

    public void onClickSwitch(View view) {
        switchAccount();
    }

    public void onClickAddiction(View view) {
        getAddiction();
    }

    public void onClickToggleToolbar(View view) {
        if (!mHasCreateToolbar) {
            final Activity activity = this;
            ChannelInterface.createToolBar(this, Constants.TOOLBAR_BOTTOM_LEFT);
            setText("success to create toolbar");
            mHasCreateToolbar = true;
            ChannelInterface.showFloatBar(activity, !mShowToolbar);
            mShowToolbar = !mShowToolbar;
        } else {
            ChannelInterface.showFloatBar(this, !mShowToolbar);
            mShowToolbar = !mShowToolbar;
        }


    }

    public void onClickLoginGuest(View view) {
        doLogin(true);
    }

    public void onClickLogout(View view) {
        ChannelInterface.logout(this);
    }

    public void onClickRegistGuest(View view) {
        boolean t = ChannelInterface.registGuest(this, "please register", new LoginCallback(this));
        if (!t) {
            setText("current is not guest. " + "uid: " + ChannelInterface.getUin() + "session: " + ChannelInterface.getToken());
        }
    }

    public void onClickBuy(View view) {
        RequestParams params = new RequestParams();
        params.put("channel", ChannelInterface.getChannelName());
        params.put("token", ChannelInterface.getPayToken());
        params.put("productId", "xxxx");
        params.put("uid", ChannelInterface.getUin());
        params.put("count", "1");
        params.put("productName", "testproduct");
        params.put("productDesc", "the test product ");
        final Activity activity = this;
        PlatformAPIRestClient.post("/sdkapi/buy", params, new JsonHttpResponseHandler(){
                @Override
                public void onSuccess(JSONObject ret) {
                    try {
                        if (ret.getInt("code") == 0) {
                            String payInfo = null;
                            if (ret.has("payInfo")) {
                                payInfo = ret.getString("payInfo");
                            }
                            ChannelInterface.buy(activity, ret.getString("orderId"), ret.getString("appUid"),
                                    "usernameinapp", ret.getString("serverId"), "xxxx",
                                    "xxxx", payInfo, ret.getInt("productCount"), ret.getInt("realPayMoney"), mBuyCallback);
                        } else {
                            Log.e("TEST", "wrong code " + String.valueOf(ret.getInt("code")));
                        }
                    } catch (JSONException e) {
                        Log.e("TEST", "wrong json", e);
                    }
                }
        });
    }

    public void onClickExit(View view) {
        ChannelInterface.exit(this, new IDispatcherCb() {
            @Override
            public void onFinished(int retCode, JSONObject data) {
                if (retCode == Constants.ErrorCode.ERR_OK) {
                    MainActivity.this.finish();
                }
            }
        });
    }

    public void onClickCharge(View view) {
        RequestParams params = new RequestParams();
        params.put("channel", ChannelInterface.getChannelName());
        params.put("uid", ChannelInterface.getUin());
        params.put("count", "10");
        params.put("token", ChannelInterface.getPayToken());

        final Activity activity = this;
        PlatformAPIRestClient.post("/sdkapi/charge", params, new JsonHttpResponseHandler(){
            @Override
            public void onSuccess(JSONObject ret) {
                try {
                    if (ret.getInt("code") == 0) {
                        String payInfo = null;
                        if (ret.has("payInfo")) {
                            payInfo = ret.getString("payInfo");
                        }
                        ChannelInterface.charge(activity, ret.getString("orderId"), ret.getString("appUid"),
                                "usernameinapp", ret.getString("serverId"),
                                "xxxxx", payInfo, ret.getInt("ratio"), ret.getInt("realPayMoney"), true,
                                mBuyCallback);
                    } else {
                        Log.e("TEST", "wrong code " + String.valueOf(ret.getInt("code")));
                    }
                } catch (JSONException e) {
                    Log.e("TEST", "wrong json", e);
                }
            }
        });
    }

    private void getAddiction() {
        final Activity activity = this;
        ChannelInterface.antiAddiction(this, new IDispatcherCb() {
            @Override
            public void onFinished(int retCode, JSONObject data) {
                if (retCode != 0) {
                    Log.e("TEST", "fail to get anti addiction info");
                    return;
                }
                try {
                    int flag = data.getInt("flag");
                    String text = null;
                    switch (flag) {
                        case Constants.ANTI_ADDICTION_ADULT:
                            text = "adult";
                            break;
                        case Constants.ANTI_ADDICTION_CHILD:
                            text = "child";
                            break;
                        case Constants.ANTI_ADDICTION_UNKNOWN:
                            text = "unknown";
                            break;
                    }
                    setText(text);
                } catch (JSONException e) {
                    Log.e("TEST", "fail to get anti addiction info", e);
                }
            }
        });
    }

    private void setText(String text) {
        TextView view = (TextView) this.findViewById(R.id.textView1);
        view.setText(text);
    }
    private void switchAccount() {
        ChannelInterface.switchAccount(this, mLoginCallback);
    }

    protected void doLogin(boolean isGuest) {
        if (isGuest) {
            ChannelInterface.loginGuest(this, new LoginGuestCallback(this), this);
        } else {
            ChannelInterface.login(this, mLoginCallback, this);
        }
	}

	@Override
    protected void onDestroy() {
        // call destroy when this activity is being destroyed to release the resource used by sdk
    	super.onDestroy();
    }

    public void printData(int code, final JSONObject s) {
        TextView view = (TextView)this.findViewById(R.id.textView1);
        view.setText("finish buy. Return code is " + String.valueOf(code) + "\n");
    }
}
