package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;

/**
 * Created by wushauk on 6/26/14.
 */
public abstract class ChannelAPI {
    public IChannelPayAPI getmPayAPI() {
        return mPayAPI;
    }

    public IChannelUserAPI getmUserAPI() {
        return mUserAPI;
    }

    public abstract void init(Activity activity,
                              boolean isDebug,
                              IDispatcherCb cb);

    public abstract void onApplicationEvent(int event, Object... arguments);

    public abstract void exit(Activity activity, IDispatcherCb iDispatcherCb);
    public abstract String getChannelName();

    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        mUserAPI.onActivityResult(requestCode, resultCode, data);
        if (mUserAPI != mPayAPI) {
            mPayAPI.onActivityResult(requestCode, resultCode, data);
        }
    }

    protected IChannelPayAPI mPayAPI;
    protected IChannelUserAPI mUserAPI;
}
