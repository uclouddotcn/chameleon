package prj.chameleon.entry;

import android.app.Activity;
import android.os.Bundle;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.uc.UcChannelAPI;

class Instantializer {
    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<UcChannelAPI> {
        public ChannelAPIImp(UcChannelAPI imp) {
            super(imp);
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            bundle.putBoolean("landscape", true);
            bundle.putBoolean("forceUpdate", false);
            bundle.putLong("cpId", 20087);
            bundle.putLong("gameId", 119474);
            return bundle;
        }

        @Override
        public String getChannelName() {
            return "uc";
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new UcChannelAPI());
    }
}
