package prj.chameleon.test;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

/**
 * Created by wushauk on 7/17/14.
 */
public class UserAccount {
    public void login(Activity context, IActionCallback callback) {
        if (mLoginCallback != null) {
            Log.e("testchannel", "Login in progress");
            return;
        }
        Intent intent = new Intent();
        intent.setClass(context.getApplicationContext(), LoginActivity.class);
        context.startActivity(intent);
        mLoginCallback = callback;
    }

    public void onLogin(String userName) {
        if (userName.length() == 0) {
            mLoginCallback.onAction(-1, null);
        } else {
            mLoginCallback.onAction(0, userName);
        }
        clearLoginCallback();
    }

    public void clearLoginCallback() {
        mLoginCallback = null;
    }

    public static UserAccount getInstance() {
        return sUserAccount;
    }
    public static UserAccount sUserAccount = new UserAccount();
    private IActionCallback mLoginCallback;
}
