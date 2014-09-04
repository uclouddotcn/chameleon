package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.xiaomi.XiaomiChannelAPI;

class Instantializer {
    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<XiaomiChannelAPI> {
        public ChannelAPIImp(XiaomiChannelAPI imp) {
            super(imp);
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            bundle.putBoolean("landscape", true);
            bundle.putString("appId", "2882303761517248672");
            bundle.putString("appKey", "5931724856672");
            return bundle;
        }

        @Override
        public String getChannelName() {
            return "xiaomi";
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new XiaomiChannelAPI());
    }
}
