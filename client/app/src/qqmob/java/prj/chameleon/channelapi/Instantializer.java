package prj.chameleon.channelapi;

import android.os.Bundle;

import prj.chameleon.qqmob.QqmobChannelAPI;

public class Instantializer implements IInstantializer {
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "qqmob";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;

        QqmobChannelAPI api = new QqmobChannelAPI();
        Bundle bundle = new Bundle();
        bundle.putBoolean("landscape", false);
        bundle.putBoolean("forceUpdate", false);
        bundle.putString("appId", "1101320656");
        api.initCfg(commCfg, bundle);

        ChannelInterface.setChannelName(commCfg.mChannel);
        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }

}
