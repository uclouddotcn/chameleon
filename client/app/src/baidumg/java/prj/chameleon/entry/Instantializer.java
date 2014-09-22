package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.baidumg.BaidumgChannelAPI;
import prj.chameleon.channelapi.APIGroup;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IInstantializer;

class Instantializer implements IInstantializer{
    @Override
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "baidumg";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;

        Bundle bundle = new Bundle();
        bundle.putBoolean("landscape", true);
        bundle.putString("appId", "3327133");
        bundle.putString("appKey", "Xlmj6pfw3URIGDWhhkl7V83A");
        BaidumgChannelAPI api = new BaidumgChannelAPI();
        api.initCfg(commCfg, bundle);

        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
