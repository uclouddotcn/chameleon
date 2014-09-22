package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.APIGroup;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IInstantializer;
import prj.chameleon.uc.UcChannelAPI;

class Instantializer implements IInstantializer {
    @Override
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "uc";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;

        Bundle bundle = new Bundle();
        bundle.putLong("cpId", 20087);
        bundle.putLong("gameId", 119474);
        UcChannelAPI api = new UcChannelAPI();
        api.initCfg(commCfg, bundle);

        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
