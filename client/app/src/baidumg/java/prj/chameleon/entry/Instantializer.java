package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.baidumg.BaidumgChannelAPI;

class Instantializer {
    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<BaidumgChannelAPI> {
        public ChannelAPIImp(BaidumgChannelAPI imp) {
            super(imp);
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            bundle.putBoolean("landscape", true);
            bundle.putString("appId", "3327133");
            bundle.putString("appKey", "Xlmj6pfw3URIGDWhhkl7V83A");
            return bundle;
        }

        @Override
        public String getChannelName() {
            return "baidumg";
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new BaidumgChannelAPI());
    }
}
