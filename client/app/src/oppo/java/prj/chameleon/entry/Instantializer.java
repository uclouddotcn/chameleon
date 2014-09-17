package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.oppo.OppoChannelAPI;

class Instantializer {
    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<OppoChannelAPI> {
        public ChannelAPIImp(OppoChannelAPI imp) {
            super(imp);
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            bundle.putBoolean("landscape", true);
            bundle.putString("appKey", "c5217trjnrmU6gO5jG8VvUFU0");
            bundle.putString("appSecret", "e2eCa732422245E8891F6555e999878B");
            bundle.putString("payCallback", "http://localhost");
            bundle.putBoolean("allowSwitchAccount", true);
            bundle.putBoolean("debug", true);
            return bundle;
        }

        @Override
        public String getChannelName() {
            return "oppo";
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new OppoChannelAPI());
    }
}
