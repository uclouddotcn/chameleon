package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.APIGroup;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IInstantializer;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
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

        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }

}
