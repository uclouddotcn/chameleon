package prj.chameleon.channelapi.cbinding;

/**
 * Created by wushauk on 4/21/14.
 */
public class ChannelAPINative {
    static native void init(boolean isDebug, byte[] platformName);

    // functions for account action listener
    static native void preAccountSwitch();
    static native void afterAccountSwitch(int code, byte[] loginInfo);
    static native void onAccountLogout();
    static native void onGuestBind(byte[] loginInfo);

    // functions for request callbacks
    static native void onLoginGuest(int id, int retCode);
    static native void onLogin(int id, int errOk, byte[] loginInfo);
    static native void onRegistGuest(int id, int retCode, byte[] loginInfo);
    static native void onCharge(int id, int retCode);
    static native void onBuy(int id, int retCode);
    static native void onSwitchAccount(int id, int retCode, byte[] loginInfo);
    static native void onPause();
    static native void onAntiAddiction(int id, int retCode, int flag);
    static native void onProtocolDone(int id, int code, byte[] protocol, byte[] message);
    static native void onExit();


}
