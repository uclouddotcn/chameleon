package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;

import org.json.JSONObject;

/**
 * Created by Administrator on 2015/3/10.
 */
public class ActivityInterface {

    public static void startSplash(Activity activity){
        int flags = activity.getIntent().getFlags();
        if ((flags & Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT) == 0) {
            Intent intent = new Intent(activity, SplashScreenActivity.class);
            activity.startActivity(intent);
        }
    }

    public static void onCreate(Activity activity) {
        prj.chameleon.channelapi.ChannelInterface.init(activity, true, new IDispatcherCb() {
            @Override
            public void onFinished(int retCode, JSONObject data) {
                callback.onInitFinished(retCode);
            }
        });
    }

    /**
     * notify the platform we are coming back from a pause
     */
    public static void onResume(final Activity activity) {
        prj.chameleon.channelapi.ChannelInterface.onResume(activity, new IDispatcherCb() {
            @Override
            public void onFinished(int retCode, JSONObject data) {
                callback.onResumeFinished(retCode);
            }
        });
    }

    /**
     * notify the platform we are paused
     */
    public static void onPause(Activity activity) {
        prj.chameleon.channelapi.ChannelInterface.onPause(activity);
    }

    /**
     * notify the platform we are destroyed
     */
    public static void onDestroy(Activity activity) {
        prj.chameleon.channelapi.ChannelInterface.onDestroy(activity);
    }

    public static void onActivityResult(final Activity activity, final int requestCode, final int resultCode, final Intent data) {
        prj.chameleon.channelapi.ChannelInterface.onActivityResult(activity, requestCode, resultCode, data);
    }


    public static void onStart(Activity activity) {
        prj.chameleon.channelapi.ChannelInterface.onStart(activity);
    }

    public static void onStop(Activity activity) {
        prj.chameleon.channelapi.ChannelInterface.onStop(activity);
    }

    public static void onNewIntent(Activity activity, Intent intent) {
        prj.chameleon.channelapi.ChannelInterface.onNewIntent(activity, intent);
    }

    public interface Callback {
        public void onInitFinished(int retCode);
        public void onResumeFinished(int retCode);
    }

    private static Callback callback = null;

    /**
     * 开放给下层使用注册callback
     * @param cb
     */
    public static void registerCallback(Callback cb){
        callback = cb;
    }
}
