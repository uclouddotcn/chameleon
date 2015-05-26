package prj.chameleon.channelapi.baidumg;

import android.content.Context;
import android.os.Bundle;
import android.util.Log;

import com.baidu.gamesdk.BDGameApplication;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Iterator;

import prj.chameleon.channelapi.APIGroup;
import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.ChannelInterface;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAPIBase;
import prj.chameleon.channelapi.JsonTools;

public class Application extends BDGameApplication {
    public static boolean isTest = true;

    private void loadInit() {
        try {
            loadConfig();
        } catch (Exception e) {
            Log.e(Constants.TAG, "Fail to find api, use test channel instead", e);
            ChannelInterface.addTestApiGroup();
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
        isTest = false;
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
            Class<?> cls = Class.forName(apiName);
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
