package prj.chameleon.test;

import android.app.ActionBar;
import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.ScrollView;

/**
 * Activity which displays a login screen to the user, offering registration as
 * well.
 */
public class LoginActivity extends Activity {
    private RadioGroup mGroup;
    private String mLoginUser = "test_0";

    private static final int prj_chameleon_test_user_0 = 1000;
    private static final int prj_chameleon_test_user_1 = 1001;
    private static final int prj_chameleon_test_user_2 = 1002;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ScrollView root = new ScrollView(this);
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        root.addView(rootLayout);

        mGroup = new RadioGroup(this);
        rootLayout.addView(mGroup);

        RadioButton btnUser1 = new RadioButton(this);
        btnUser1.setText("test_0 登录支付都成功");
        btnUser1.setId(prj_chameleon_test_user_0);
        mGroup.addView(btnUser1);

        RadioButton btnUser2 = new RadioButton(this);
        btnUser2.setText("test_1登录即失败");
        btnUser2.setId(prj_chameleon_test_user_1);
        mGroup.addView(btnUser2);

        RadioButton btnUser3 = new RadioButton(this);
        btnUser3.setText("test_2登录成功支付失败");
        btnUser3.setId(prj_chameleon_test_user_2);
        mGroup.addView(btnUser3);

        //setContentView(R.layout.activity_login);

        mGroup.setOnCheckedChangeListener(new RadioGroup.OnCheckedChangeListener() {

            @Override
            public void onCheckedChanged(RadioGroup radioGroup, int i) {
                if (radioGroup.getCheckedRadioButtonId() == prj_chameleon_test_user_0) {
                    mLoginUser = "test_0";
                } else if (radioGroup.getCheckedRadioButtonId() == prj_chameleon_test_user_1) {
                    mLoginUser = "test_1";
                } else {
                    mLoginUser = "test_2";
                }
            }
        });

        Button btn = new Button(this);
        btn.setText("登录");
        rootLayout.addView(btn);
        btn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                UserAccount.getInstance().onLogin(mLoginUser);
                finish();
            }
        });

        this.setContentView(root);
    }
}
