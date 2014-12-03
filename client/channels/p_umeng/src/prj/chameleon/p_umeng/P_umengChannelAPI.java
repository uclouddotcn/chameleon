package prj.chameleon.p_umeng;
import android.app.Activity;

import com.umeng.message.ALIAS_TYPE;
import com.umeng.message.PushAgent;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;

import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class P_umengChannelAPI extends SingleSDKChannelAPI.SinglePushSDK {

    @Override
    public void init(Activity activity, IDispatcherCb cb) {

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
    public void resumePush(Activity activity) {
        PushAgent.getInstance(activity).enable();
    }

    @Override
    public void addAlias(Activity activity, String alias, IDispatcherCb cb) {
        try {
            PushAgent.getInstance(activity).addAlias(alias, "chameleon");
            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
        } catch (JSONException e) {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
    }

    @Override
    public void removeAlias(Activity activity, String alias, IDispatcherCb cb) {
        try {
            PushAgent.getInstance(activity).removeAlias(alias, "chameleon");
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
    public void enableDebugMode(Activity activity, boolean debugEnable) {
        PushAgent.getInstance(activity).setDebugMode(debugEnable);
    }

    @Override
    public void setNoDisturbMode(Activity activity, int startHour, int startMinute, int endHour, int endMinute) {
        PushAgent.getInstance(activity).setNoDisturbMode(startHour, startMinute, endHour, endMinute);
    }

}