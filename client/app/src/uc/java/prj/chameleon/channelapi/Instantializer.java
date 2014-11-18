package prj.chameleon.channelapi;

import android.os.Bundle;

import prj.chameleon.uc.UcChannelAPI;

public class Instantializer implements IInstantializer {
    @Override
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "uc";
        commCfg.mIsLandscape = false;
        commCfg.mIsDebug = true;

        Bundle bundle = new Bundle();
        bundle.putLong("cpId", 40901);
        bundle.putLong("gameId", 549059);
        UcChannelAPI api = new UcChannelAPI();
        api.initCfg(commCfg, bundle);

        ChannelInterface.setChannelName(commCfg.mChannel);
        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}