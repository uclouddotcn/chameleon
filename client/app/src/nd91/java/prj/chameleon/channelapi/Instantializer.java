package prj.chameleon.channelapi;

import android.os.Bundle;

import prj.chameleon.nd91.Nd91ChannelAPI;


public class Instantializer implements IInstantializer {

    @Override
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "nd91";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;

        Bundle bundle = new Bundle();
        bundle.putBoolean("landscape", true);
        bundle.putBoolean("forceUpdate", false);
        bundle.putLong("appId", 113470);
        bundle.putString("appKey", "d13788e8d51baa268b8f65629d24b983509e3c992df79163");
        Nd91ChannelAPI api = new Nd91ChannelAPI();
        api.initCfg(commCfg, bundle);

        ChannelInterface.setChannelName(commCfg.mChannel);
        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
