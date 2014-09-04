package prj.chameleon.entry;

import android.app.Activity;
import android.os.Bundle;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.nd91.Nd91ChannelAPI;

class Instantializer {
    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<Nd91ChannelAPI> {
        public ChannelAPIImp(Nd91ChannelAPI imp) {
            super(imp);
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            bundle.putBoolean("landscape", true);
            bundle.putBoolean("forceUpdate", false);
            bundle.putLong("appId", 113470);
            bundle.putString("appKey", "d13788e8d51baa268b8f65629d24b983509e3c992df79163");
            return bundle;
        }

        @Override
        public String getChannelName() {
            return "nd91";
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new Nd91ChannelAPI());
    }
}
