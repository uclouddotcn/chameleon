import string

SINGLE_API_TEMPLATE = string.Template("""
package prj.chameleon.entry;

import android.app.Activity;
import android.os.Bundle;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.$channel.$channelImp;

class Instantializer {
    public static class ChannelAPIImp extends ChannelAPI {
        $channelImp mChannelImp;
        @Override
        public void init(Activity activity, boolean isDebug, IDispatcherCb cb) {
            mChannelImp = new $channelImp();
            Bundle bundle = new Bundle();
            $setBundle
            bundle.putString("channelName", getChannelName());
            mChannelImp.init(activity, bundle, isDebug, cb);
            mPayAPI = mChannelImp;
            mUserAPI = mChannelImp;
        }

        @Override
        public void exit(Activity activity, IDispatcherCb cb) {
            mChannelImp.exit(activity, cb);
        }

        @Override
        public String getChannelName() {
            return "$channelName";
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp();
    }
}
""")

LIB_PROJECT_PROPERTY = string.Template("""
#proguard.config=$${sdk.dir}/tools/proguard/proguard-android.txt:proguard-project.txt

# Project target.
android.library=true
$android_library
""")



