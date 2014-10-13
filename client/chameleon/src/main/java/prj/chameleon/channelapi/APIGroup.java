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

    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        mApi.onActivityResult(requestCode, resultCode, data);
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
}
