package prj.chameleon.channelapi;

import android.os.Bundle;

import prj.chameleon.xiaomi.XiaomiChannelAPI;

public class Instantializer implements IInstantializer {
    @Override
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "wandoujia";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;

        Bundle bundle = new Bundle();
        bundle.putString("appId", "2882303761517248672");
        bundle.putString("appKey", "5931724856672");
        XiaomiChannelAPI api = new XiaomiChannelAPI();
        api.initCfg(commCfg, bundle);

        ChannelInterface.setChannelName(commCfg.mChannel);
        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
