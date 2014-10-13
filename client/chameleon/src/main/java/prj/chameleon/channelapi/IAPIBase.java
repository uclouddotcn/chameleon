package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;


/**
 * Base class of all the APIs
 * including all of the android event callbacks
 */
public interface IAPIBase {

    /**
     *  when the app is activate from the background( refer to 91 doc, only required by 91)
     * @param activity the activity to give the real SDK
     * @param cb JSON object will be null
     */
    public void onResume(Activity activity, IDispatcherCb cb);

    /**
     *  when the app is stopped
     * @param activity the activity to give the real SDK
     */
    public void onPause(Activity activity);


    /**
     * init the SDK
     * @param activity the activity to give the real SDK
     * @param cb callback function when the request is finished, the JSON object is null
     */
    public void init(android.app.Activity activity, IDispatcherCb cb);

    /**
     * on activity result, the parameter is the same as Activity.onActivityResult
     * @param requestCode
     * @param resultCode
     * @param data
     */
    public void onActivityResult(int requestCode, int resultCode, Intent data);


    /**
     *
     * @param event refer to Constants.ApplicationEvent
     * @param arguments the var-arguments for this event
     */
    public void onApplicationEvent(int event, Object... arguments);

    /**
     * on the activity destroyed
     * @param activity the activity
     */
    public void onDestroy(Activity activity);

    /**
     * exit the sdk instance
     * @param activity
     */
    public void exit(Activity activity, IDispatcherCb cb);
}
