package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.APIGroup;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IInstantializer;
import prj.chameleon.nd91.Nd91ChannelAPI;


class Instantializer implements IInstantializer {

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

        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
