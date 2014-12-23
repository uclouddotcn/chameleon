
package prj.chameleon.channelapi;

import android.os.Bundle;

import prj.chameleon.qqmsdk.QqmsdkChannelAPI;

public class Instantializer implements IInstantializer{

    @Override
    public void initChameleon() {

        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = "ddd";
        commCfg.mChannel = "qqmsdk";
        commCfg.mIsLandscape = true;
        commCfg.mIsDebug = true;
        ChannelInterface.setChannelName("qqmsdk");
        ChannelInterface.setDebug(true);
        
        initQqmsdkChannelAPI(commCfg);
    }

    	private void initQqmsdkChannelAPI(ApiCommonCfg commCfg) {
Bundle bundle = new Bundle();
		bundle.putString("wxAppId", "wx7036e91070e73dea");
		bundle.putString("moneyIcon", "diamond48.png");
		bundle.putString("qqAppId", "1103377681");
		
		bundle.putBoolean("test", true);
		bundle.putString("appname", "ddd");
		bundle.putBoolean("landscape", true);
		bundle.putString("wxAppKey", "d605f086cfe3d6d44b09979d7f84ecef");
		bundle.putString("qqAppKey", "Jq4pXeOIscqa2iQ1");
		QqmsdkChannelAPI api = new QqmsdkChannelAPI();
		api.initCfg(commCfg, bundle);
		ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API|Constants.PluginType.PAY_API, api));
	}
}
