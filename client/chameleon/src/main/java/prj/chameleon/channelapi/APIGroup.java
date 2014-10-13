package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;

public class APIGroup {
    private int mApiType;
    private IAPIBase mApi;

    public APIGroup(int apiType, IAPIBase apiBase) {
        mApiType = apiType;
        mApi = apiBase;
    }

    public boolean testType(int apiType) {
        return (mApiType | apiType) == mApiType;
    }


    public void onResume(Activity activity, IDispatcherCb cb) {
        mApi.onResume(activity, cb);
    }

    public void onDestroy(Activity activity) {
        mApi.onDestroy(activity);
    }

    public void onPause(Activity activity) {
        mApi.onPause(activity);
    }

    public void init(Activity activity, IDispatcherCb cb) {
        mApi.init(activity, cb);
    }

    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        mApi.onActivityResult(activity, requestCode, resultCode, data);
    }

    public void onApplicationEvent(int event, Object... arguments) {
        mApi.onApplicationEvent(event, arguments);
    }

    public void exit(Activity activity, IDispatcherCb cb) {
        mApi.exit(activity, cb);
    }

    IAPIBase getApi() {
        return mApi;
    }

    public void onStart(Activity activity) {
        mApi.onStart(activity);
    }

    public void onStop(Activity activity) {
        mApi.onStop(activity);
    }

    public void onNewIntent(Activity activity, Intent intent) {
        mApi.onNewIntent(activity, intent);
    }
}
