package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.APIGroup;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IInstantializer;
import prj.chameleon.qihu.QihuChannelAPI;

public class Instantializer implements IInstantializer {
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "123";
        commCfg.mChannel = "qihu";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;

        QihuChannelAPI api = new QihuChannelAPI();
        Bundle bundle = new Bundle();
        bundle.putBoolean("landscape", false);
        bundle.putBoolean("bgTransparent", false);
        bundle.putString("uri", "http://localhost/");
        bundle.putString("channelName", "qihu");
        bundle.putString("appName", "testexample");
        api.initCfg(commCfg, bundle);

        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }

}
