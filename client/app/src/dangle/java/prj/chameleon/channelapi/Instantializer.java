package prj.chameleon.channelapi;

import android.os.Bundle;

import prj.chameleon.dangle.DangleChannelAPI;

public class Instantializer implements IInstantializer {
    @Override
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "dangle";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;

        Bundle bundle = new Bundle();
        bundle.putString("merchantId", "101");
        bundle.putString("appId", "195");
        bundle.putString("serverSeqNum", "1");
        bundle.putString("appKey", "j5VEvxhc");
        DangleChannelAPI api = new DangleChannelAPI();
        api.initCfg(commCfg, bundle);

        ChannelInterface.setChannelName(commCfg.mChannel);
        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
