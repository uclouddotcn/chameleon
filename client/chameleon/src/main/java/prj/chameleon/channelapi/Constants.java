package prj.chameleon.channelapi;

/**
 * Created by wushauk on 3/24/14.
 */
public class Constants {
    public static String TAG = "chameleon";

    // anti addition flag constants
    public final static int ANTI_ADDICTION_UNKNOWN = 0;
    public final static int ANTI_ADDICTION_CHILD = 1;
    public final static int ANTI_ADDICTION_ADULT = 2;

    // toolbar position
    public final static int TOOLBAR_TOP_LEFT = 1;
    public final static int TOOLBAR_TOP_RIGHT = 2;
    public final static int TOOLBAR_MID_LEFT = 3;
    public final static int TOOLBAR_MID_RIGHT = 4;
    public final static int TOOLBAR_BOTTOM_LEFT = 5;
    public final static int TOOLBAR_BOTTOM_RIGHT = 6;

    // SDK UI Open Flag
    public final static int SDK_UI_OPEN = 0;
    public final static int SDK_UI_CLOSE = 1;

    public final static class ErrorCode {
        public final static int ERR_INTERNAL = -1; // some internal error happened...
        public final static int ERR_OK = 0; // OK
        public final static int ERR_CANCEL = 1;
        public final static int ERR_UNKNOWN = 2;
        public final static int ERR_ILL_PARAMS = 3;
        public final static int ERR_FAIL = 4;
        public final static int ERR_NO_LOGIN = 5;
        public final static int ERR_SERVER_BUSY = 6;

        // pay action erros 11~ 20
        public final static int ERR_PAY_FAIL = 11; // fail to pay
        public final static int ERR_PAY_CANCEL = 12; // user cancel the payment
        public final static int ERR_PAY_IN_PROGRESS = 13; // payment is in progress..
        public final static int ERR_PAY_SESSION_INVALID = 14; // the pay token is expired
        public final static int ERR_PAY_UNKNOWN = 15; // 支付结果未定，有些支付渠道无法实时到账
        // 如果返回这个错误码，可能是托管的二级货币余额不足，引导了用户充值之后
        // 可以提示用户重新进行购买
        public final static int ERR_PAY_RETRY = 16;

        // login action errors 21~30
        public final static int ERR_LOGIN_IN_PROGRESS = 21;
        public final static int ERR_LOGIN_IN_QQ_NON_INSTALLED = 22;
        public final static int ERR_LOGIN_IN_WX_NON_INSTALLED = 23;
        public final static int ERR_LOGIN_GAME_EXIT_NOCARE = 24; // 渠道不关心退出游戏的事件
        public final static int ERR_LOGIN_MSDK_PLAT_NO_SPEC = 25; // MSDK login callback
    }

    public final static class ApplicationEvent {
        public final static int BEFORE_ON_CREATE = 1;
        public final static int AFTER_ON_CREATE = 2;
        public final static int ON_BIND_CONTEXT = 3;
    }

    public static class PluginType {
        public final static int USER_API = 1;
        public final static int PAY_API = 2;
        public final static int PUSH_API = 4;
        public final static int SHARE_API = 8;
        public final static int DATA_ANALYSIS_API = 16;
        public final static int AD_API = 32;
    }

}
