package prj.chameleon.test;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.widget.RadioGroup;

/**
 * Activity which displays a login screen to the user, offering registration as
 * well.
 */
public class LoginActivity extends Activity {
    private RadioGroup mGroup;
    private String mLoginUser = "test_0";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_login);

        mGroup = (RadioGroup) findViewById(R.id.prj_chameleon_test_user);
        mGroup.setOnCheckedChangeListener(new RadioGroup.OnCheckedChangeListener() {

            @Override
            public void onCheckedChanged(RadioGroup radioGroup, int i) {
                if (radioGroup.getCheckedRadioButtonId() == R.id.prj_chameleon_test_user_0) {
                    mLoginUser = "test_0";
                } else if (radioGroup.getCheckedRadioButtonId() == R.id.prj_chameleon_test_user_1) {
                    mLoginUser = "test_1";
                } else {
                    mLoginUser = "test_2";
                }
            }
        });
        findViewById(R.id.prj_chameleon_test_signin_btn).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                UserAccount.getInstance().onLogin(mLoginUser);
                finish();
            }
        });
    }
}
