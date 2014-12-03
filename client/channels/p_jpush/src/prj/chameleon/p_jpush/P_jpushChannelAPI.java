package prj.chameleon.p_jpush;
import android.app.Activity;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import cn.jpush.android.api.JPushInterface;
import cn.jpush.android.api.TagAliasCallback;
import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class P_jpushChannelAPI extends SingleSDKChannelAPI.SinglePushSDK {

    @Override
    public void init(Activity activity, IDispatcherCb cb) {
        JPushInterface.init(activity);     		// 初始化 JPush
        JPushInterface.stopPush(activity);      //默认启动  这里把它关闭掉
    }

    @Override
    public void enablePush(Activity activity) {
        JPushInterface.resumePush(activity.getApplicationContext());
    }

    @Override
    public void disablePush(Activity activity) {
        JPushInterface.stopPush(activity.getApplicationContext());
    }

    @Override
    public void resumePush(Activity activity) {
        JPushInterface.resumePush(activity.getApplicationContext());
    }

    @Override
    public void addAlias(Activity activity, String alias, final IDispatcherCb cb) {
        JPushInterface.setAlias(activity.getApplicationContext(), alias, new TagAliasCallback(){
            @Override
            public void gotResult(int code, String s, Set<String> strings) {
                if (code == 0){
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                } else {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }
        });
    }

    @Override
    public void removeAlias(Activity activity, String alias, IDispatcherCb cb) {

    }

    @Override
    public void setTags(Activity activity, List<String> tags, final IDispatcherCb cb) {
        Set<String> tagSet = new LinkedHashSet<String>();
        for (String sTagItme : tags) {
            if (!isValidTagAndAlias(sTagItme)) {
                return;
            }
            tagSet.add(sTagItme);
        }
        Set<String> tagSetFilter = JPushInterface.filterValidTags(tagSet);
        JPushInterface.setTags(activity.getApplicationContext(), tagSetFilter, new TagAliasCallback() {
            @Override
            public void gotResult(int code, String s, Set<String> strings) {
                if (code == 0){
                    cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                } else {
                    cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                }
            }});
    }

    @Override
    public void getTags(Activity activity, IDispatcherCb cb) {

    }

    @Override
    public void delTags(Activity activity, List<String> tags, IDispatcherCb cb) {

    }

    @Override
    public void enableDebugMode(Activity activity, boolean debugEnable) {
        JPushInterface.setDebugMode(debugEnable); 	// 设置开启日志,发布时请关闭日志
    }

    @Override
    public void setNoDisturbMode(Activity activity, int startHour, int startMinute, int endHour, int endMinute) {
        JPushInterface.setSilenceTime(activity.getApplicationContext(), startHour, startMinute, endHour, endMinute);
    }

    // 校验Tag Alias 只能是数字,英文字母和中文
    public static boolean isValidTagAndAlias(String s) {
        Pattern p = Pattern.compile("^[\u4E00-\u9FA50-9a-zA-Z_-]{0,}$");
        Matcher m = p.matcher(s);
        return m.matches();
    }
}