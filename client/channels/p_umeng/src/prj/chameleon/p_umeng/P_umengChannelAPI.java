package prj.chameleon.p_umeng;
import android.app.Activity;
import android.app.Application;
import android.os.Bundle;

import com.umeng.message.ALIAS_TYPE;
import com.umeng.message.PushAgent;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;

import prj.chameleon.channelapi.ApiCommonCfg;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class P_umengChannelAPI extends SingleSDKChannelAPI.SinglePushSDK {

    private boolean debugEnable = false;
    public void initCfg(ApiCommonCfg commCfg, Bundle cfg) {
        debugEnable = cfg.getBoolean("debug");
    }

    @Override
    public void enablePush(Activity activity) {
        PushAgent.getInstance(activity).enable();
    }

    @Override
    public void disablePush(Activity activity) {
        PushAgent.getInstance(activity).disable();
    }

    @Override
    public void addAlias(Activity activity, String alias, String type, IDispatcherCb cb) {
        try {
            PushAgent.getInstance(activity).addAlias(alias, type);
            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
        } catch (JSONException e) {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
    }

    @Override
    public void removeAlias(Activity activity, String alias, String type, IDispatcherCb cb) {
        try {
            PushAgent.getInstance(activity).removeAlias(alias, type);
            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
        } catch (JSONException e) {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
    }

    @Override
    public void setTags(Activity activity, List<String> tags, IDispatcherCb cb) {
        String[] strTags = new String[tags.size()];
        tags.toArray(strTags);
        try {
            PushAgent.getInstance(activity).getTagManager().add(strTags);
            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
        } catch (Exception e) {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }

    }

    @Override
    public void getTags(Activity activity, IDispatcherCb cb) {
        try {
            List<String> list = PushAgent.getInstance(activity).getTagManager().list();
            JSONObject jsonObject = new JSONObject();
            jsonObject.put("list", list.toString());
            cb.onFinished(Constants.ErrorCode.ERR_OK, jsonObject);
        } catch (Exception e) {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
    }

    @Override
    public void delTags(Activity activity, List<String> tags, IDispatcherCb cb) {
        String[] strTags = new String[tags.size()];
        tags.toArray(strTags);
        try {
            PushAgent.getInstance(activity).getTagManager().delete(strTags);
            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
        } catch (Exception e) {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
    }

    @Override
    public void setNoDisturbMode(Activity activity, int startHour, int endHour) {
        PushAgent.getInstance(activity).setNoDisturbMode(startHour, 0, endHour, 0);
    }

    @Override
    public void onApplicationEvent(int event, Object... arguments) {
        switch (event) {
            case Constants.ApplicationEvent.AFTER_ON_CREATE:
                Application app = (Application) arguments[0];
                PushAgent.getInstance(app).setDebugMode(debugEnable);
                break;
        }

    }
}