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


    //Alias

    /**
     * add alias
     * @param alias
     * @param type
     */
    public void addAlias(Activity activity, String alias,IDispatcherCb cb);

    /**
     * remove alias
     * @param alias
     * @param type
     */
    public void removeAlias(Activity activity, String alias, IDispatcherCb cb);

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
    public void enableDebugMode(Activity activity, boolean debugEnable);

    /**
     * set no disturb mode
     * @param startHour start hour scope[0-23]
     * @param startMinute start minute scope[0-59]
     * @param endHour end hour scope[0-23] End time is greater than the start time
     * @param endMinute end minute scope[0-59]
     */
    public void setNoDisturbMode(Activity activity, int startHour, int startMinute, int endHour, int endMinute);

}
