package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.APIGroup;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IInstantializer;
import prj.chameleon.wandoujia.WandoujiaChannelAPI;

class Instantializer implements IInstantializer {
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

        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
