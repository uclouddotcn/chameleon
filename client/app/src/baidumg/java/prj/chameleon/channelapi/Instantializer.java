package prj.chameleon.channelapi;

import android.os.Bundle;

import prj.chameleon.baidumg.BaidumgChannelAPI;

public class Instantializer implements IInstantializer{
    @Override
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "baidumg";
        commCfg.mIsLandscape = false;
        commCfg.mIsDebug = true;
        ChannelInterface.setChannelName(commCfg.mChannel);
        initBaidumgChannelAPI(commCfg);
    }

    private void initBaidumgChannelAPI(ApiCommonCfg commCfg) {
        Bundle bundle = new Bundle();
        bundle.putBoolean("landscape", false);
        bundle.putLong("appId", 3531341);
        bundle.putString("appKey", "2jkTbPGpBU1qhO0oChUc0W2l");
        BaidumgChannelAPI api = new BaidumgChannelAPI();
        api.initCfg(commCfg, bundle);
        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
