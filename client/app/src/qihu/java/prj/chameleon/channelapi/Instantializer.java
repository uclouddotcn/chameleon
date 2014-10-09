package prj.chameleon.channelapi;

import android.os.Bundle;

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
        bundle.putString("uri", "http://118.192.73.182/ucloud/qihu/pay");
        bundle.putString("channelName", "qihu");
        bundle.putString("appName", "testexample");
        api.initCfg(commCfg, bundle);

        ChannelInterface.setChannelName(commCfg.mChannel);
        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }

}
