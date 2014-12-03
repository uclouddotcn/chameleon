package prj.chameleon.channelapi;

import android.app.Activity;

import org.json.JSONObject;

import java.util.List;

public interface IChannelPushAPI extends IAPIBase {

    //push

    /**
     * enable push 开启推送服务
     * @param activity
     */
    public void enablePush(Activity activity);

    /**
     * disable push 关闭推送服务
     * @param activity
     */
    public void disablePush(Activity activity);


    //Alias

    /**
     * add alias 设置别名
     * @param alias 别名
     * @param type 类型
     */
    public void addAlias(Activity activity, String alias, String type, IDispatcherCb cb);

    /**
     * remove alias 删除别名
     * @param alias 别名
     * @param type 类型
     */
    public void removeAlias(Activity activity, String alias, String type, IDispatcherCb cb);

    //tags

    /**
     * set tags 设置标签
     * @param activity activity
     * @param tags Tags list to be set 要设置的标签列表
     * @param cb callback 回调函数 是否成功
     */
    public void setTags(Activity activity, List<String> tags, IDispatcherCb cb);

    /**
     * get tags 获取标签
     * @param activity activity
     * @param cb callback 回调函数 如果成功则返回标签列表
     */
    public void getTags(Activity activity, IDispatcherCb cb);

    /**
     * delete tags 删除标签
     * @param activity activity
     * @param tags Tags list to be delete 要删除的标签列表
     * @param cb callback 回调函数 是否成功
     */
    public void delTags(Activity activity, List<String> tags, IDispatcherCb cb);

    /**
     * set no disturb mode 设置免打扰时间段
     * @param startHour start hour scope[0-23] 开始时间 范围：0-23 单位：小时
     * @param endHour end hour scope[0-23] End time is greater than the start time 结束时间  范围：0-23 单位：小时  并且要比开始时间大
     */
    public void setNoDisturbMode(Activity activity, int startHour, int endHour);

}
