package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.qqmob.QqmobChannelAPI;

class Instantializer {
    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<QqmobChannelAPI> {

        public ChannelAPIImp(QqmobChannelAPI imp) {
            super(imp);
        }

        @Override
        public String getChannelName() {
            return "qqmob";
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            bundle.putBoolean("landscape", false);
            bundle.putBoolean("forceUpdate", false);
            bundle.putString("appId", "1101320656");
            mChannelImp.setChannel(getChannelName());
            return bundle;
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new QqmobChannelAPI());
    }
}
