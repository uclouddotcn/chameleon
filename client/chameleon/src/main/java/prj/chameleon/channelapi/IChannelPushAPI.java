package prj.chameleon.channelapi;

import android.app.Activity;

import org.json.JSONObject;

import java.util.List;

public interface IChannelPushAPI extends IAPIBase {

    //push

    /**
     * enable push
     * @param activity
     */
    public void enablePush(Activity activity);

    /**
     * disable push
     * @param activity
     */
    public void disablePush(Activity activity);

    /**
     * resume push
     * @param activity
     */
    public void resumePush(Activity activity);


    //tags

    /**
     * set tags
     * @param activity activity
     * @param tags Tags list to be set
     * @param cb callback
     */
    public void setTags(Activity activity, List<String> tags, IDispatcherCb cb);

    /**
     * get tags
     * @param activity activity
     * @param cb callback
     */
    public void getTags(Activity activity, IDispatcherCb cb);

    /**
     * delete tags
     * @param activity activity
     * @param tags Tags list to be delete
     * @param cb callback
     */
    public void delTags(Activity activity, List<String> tags, IDispatcherCb cb);


    /**
     * enable debug Mode
     * @param debugEnable whether to enable debug mode
     */
    public void enableDebugMode(boolean debugEnable);

    /**
     * set no disturb mode
     * @param startHour start hour
     * @param startMinute start minute
     * @param endHour end hour
     * @param endMinute end minute
     */
    public void setNoDisturbMode(int startHour, int startMinute, int endHour, int endMinute);

}
