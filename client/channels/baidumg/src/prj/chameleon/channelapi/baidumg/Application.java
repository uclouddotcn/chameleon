package prj.chameleon.channelapi.baidumg;

import android.content.Context;
import android.util.Log;

import com.baidu.gamesdk.BDGameApplication;

import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IInstantializer;

public class Application extends BDGameApplication {
    private void loadInit() {
        try {
            Class<?> cls = Class.forName("prj.chameleon.channelapi.Instantializer");
            IInstantializer inst = (IInstantializer)cls.newInstance();
            inst.initChameleon();
        } catch (Exception e) {
            Log.e(Constants.TAG, "Fail to find Instantializer, use test channel instead", e);
            //DummyChannelAPI.init();
        }
    }

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        loadInit();
        ChannelInterface.onApplicationEvent(Constants.ApplicationEvent.ON_BIND_CONTEXT, this, base);
    }


    @Override
    public void onCreate() {
        ChannelInterface.onApplicationEvent(Constants.ApplicationEvent.BEFORE_ON_CREATE, this);
        super.onCreate();
        ChannelInterface.onApplicationEvent(Constants.ApplicationEvent.AFTER_ON_CREATE, this);
    }
}
