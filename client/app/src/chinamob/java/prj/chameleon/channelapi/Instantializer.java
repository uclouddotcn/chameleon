package prj.chameleon.channelapi;

import android.os.Bundle;

import java.util.TreeMap;

import prj.chameleon.chinamob.ChinamobChannelAPI;


public class Instantializer implements IInstantializer {

    @Override
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "chinamob";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;

        Bundle bundle = new Bundle();
        bundle.putSerializable("productMap", new TreeMap<String, String>());
        ChinamobChannelAPI api = new ChinamobChannelAPI();
        api.initCfg(commCfg, bundle);

        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
