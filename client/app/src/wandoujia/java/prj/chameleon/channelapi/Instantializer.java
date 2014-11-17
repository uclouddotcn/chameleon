package prj.chameleon.channelapi;

import android.os.Bundle;

import prj.chameleon.wandoujia.WandoujiaChannelAPI;

public class Instantializer implements IInstantializer {
    @Override
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "wandoujia";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;

        Bundle bundle = new Bundle();
        bundle.putLong("appId", 100012000);
        bundle.putString("appKey", "ed5bcac197c55de1a06cf31bd91a1fc4");
        WandoujiaChannelAPI api = new WandoujiaChannelAPI();
        api.initCfg(commCfg, bundle);

        ChannelInterface.setChannelName(commCfg.mChannel);
        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
