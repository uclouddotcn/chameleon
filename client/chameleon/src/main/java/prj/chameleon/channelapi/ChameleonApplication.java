package prj.chameleon.channelapi;

import android.app.Application;
import android.content.Context;


public class ChameleonApplication extends Application {
    @Override
    protected void attachBaseContext(Context base) {
        ChannelInterface.loadChannelImp();
        ChannelInterface.onApplicationEvent(Constants.ApplicationEvent.ON_BIND_CONTEXT, this, base);
        super.attachBaseContext(base);
    }


    @Override
    public void onCreate() {
        ChannelInterface.onApplicationEvent(Constants.ApplicationEvent.BEFORE_ON_CREATE, this);
        super.onCreate();
        ChannelInterface.onApplicationEvent(Constants.ApplicationEvent.AFTER_ON_CREATE, this);
    }
}
