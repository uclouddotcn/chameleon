package prj.chameleon.p_getui;
import android.app.Activity;

import com.igexin.sdk.PushConsts;
import com.igexin.sdk.PushManager;
import com.igexin.sdk.Tag;

import java.util.List;

import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class P_getuiChannelAPI extends SingleSDKChannelAPI.SinglePushSDK {

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        PushManager.getInstance().initialize(activity);
    }

    @Override
    public void enablePush(Activity activity) {
        PushManager.getInstance().turnOnPush(activity);
    }

    @Override
    public void disablePush(Activity activity) {
        PushManager.getInstance().turnOffPush(activity);
    }

    @Override
    public void resumePush(Activity activity) {
        PushManager.getInstance().turnOnPush(activity);
    }

    @Override
    public void addAlias(Activity activity, String alias, IDispatcherCb cb) {

    }

    @Override
    public void removeAlias(Activity activity, String alias, IDispatcherCb cb) {

    }

    @Override
    public void setTags(Activity activity, List<String> tags, IDispatcherCb cb) {
        Tag[] tagParam = new Tag[tags.size()];
        for (int i = 0; i < tags.size(); i++) {
            Tag t = new Tag();
            t.setName(tags.get(i));
            tagParam[i] = t;
        }
        int i = PushManager.getInstance().setTag(activity, tagParam);
        if (i == PushConsts.SETTAG_SUCCESS){
            cb.onFinished(Constants.ErrorCode.ERR_OK, null);
        }else {
            cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
        }
    }

    @Override
    public void getTags(Activity activity, IDispatcherCb cb) {

    }

    @Override
    public void delTags(Activity activity, List<String> tags, IDispatcherCb cb) {

    }

    @Override
    public void enableDebugMode(Activity activity, boolean debugEnable) {

    }

    @Override
    public void setNoDisturbMode(Activity activity, int startHour, int startMinute, int endHour, int endMinute) {
        int duration = 0 ;
        if (endHour >= startHour)
            duration = endHour - startHour;
        PushManager.getInstance().setSilentTime(activity, startHour, duration);
    }

}