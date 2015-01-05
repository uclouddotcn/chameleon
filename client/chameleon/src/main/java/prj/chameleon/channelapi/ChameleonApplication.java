package prj.chameleon.channelapi;

import android.app.Application;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Iterator;

public class ChameleonApplication extends Application {
    private void loadInit() {
        try {
            loadConfig();
        } catch (Exception e) {
            Log.e(Constants.TAG, "Fail to find api, use test channel instead", e);
            DummyChannelAPI.init();
        }
    }

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        loadInit();
        ChannelInterface.onApplicationEvent(Constants.ApplicationEvent.ON_BIND_CONTEXT, this, base);
    }


    @Override
    public void onCreate() {
        ChannelInterface.onApplicationEvent(Constants.ApplicationEvent.BEFORE_ON_CREATE, this);
        super.onCreate();
        ChannelInterface.onApplicationEvent(Constants.ApplicationEvent.AFTER_ON_CREATE, this);
    }

    //load config from assert
    private void loadConfig() throws Exception{
        String config = JsonTools.getFromAssets(this, "chameleon/config.json");
        JSONObject jsonObject = JsonTools.getJsonObject(config);
        Log.e(Constants.TAG, jsonObject.toString());

        //init Chameleon common config
        JSONObject cfgJson = JsonTools.getJsonObject(jsonObject, "cfg");
        ApiCommonCfg commCfg = new ApiCommonCfg();
        commCfg.mAppName = JsonTools.getStringByKey(cfgJson, "appName");
        commCfg.mChannel = JsonTools.getStringByKey(cfgJson, "channel");
        commCfg.mIsLandscape = JsonTools.getBooleanByKey(cfgJson, "isLandscape");
        commCfg.mIsDebug = JsonTools.getBooleanByKey(cfgJson, "isDebug");
        ChannelInterface.setChannelName(commCfg.mChannel);

        //init sdk config
        JSONArray sdkArray = JsonTools.getJsonArray(jsonObject, "sdks");

        for (int i=0; i < sdkArray.length(); i++){
            JSONObject sdkObject = JsonTools.getJsonObject(sdkArray, i);

            String apiName = JsonTools.getStringByKey(sdkObject, "apiName");
            Class<?> cls = Class.forName("prj.chameleon." + commCfg.mChannel + "." + apiName);
            IAPIBase api = (IAPIBase) cls.newInstance();

            JSONObject sdkCfg = JsonTools.getJsonObject(sdkObject, "sdkCfg");
            Iterator<?> keys = sdkCfg.keys();
            Bundle bundle = new Bundle();
            while( keys.hasNext() ){
                String key = (String)keys.next();
                bundle.putString(key, JsonTools.getStringByKey(sdkCfg, key));
            }
            api.initCfg(commCfg, bundle);

            int type = JsonTools.getIntByKey(sdkObject, "type");
            ChannelInterface.addApiGroup(new APIGroup(type, api));
        }

    }
}
