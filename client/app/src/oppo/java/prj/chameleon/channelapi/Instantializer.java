package prj.chameleon.channelapi;

import android.os.Bundle;

import prj.chameleon.oppo.OppoChannelAPI;

public class Instantializer implements IInstantializer {
    public void initChameleon() {
        OppoChannelAPI api = new OppoChannelAPI();

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "oppo";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;
        Bundle bundle = new Bundle();
        bundle.putString("appKey", "c5217trjnrmU6gO5jG8VvUFU0");
        bundle.putString("appSecret", "e2eCa732422245E8891F6555e999878B");
        bundle.putString("payCallback", "http://localhost");
        bundle.putBoolean("allowSwitchAccount", true);
        api.initCfg(commCfg, bundle);

        ChannelInterface.setChannelName(commCfg.mChannel);
        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API|Constants.PluginType.PAY_API,
                api));
    }

}
