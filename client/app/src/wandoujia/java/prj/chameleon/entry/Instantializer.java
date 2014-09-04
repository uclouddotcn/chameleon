package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.wandoujia.WandoujiaChannelAPI;

class Instantializer {
    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<WandoujiaChannelAPI> {
        public ChannelAPIImp(WandoujiaChannelAPI imp) {
            super(imp);
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            bundle.putBoolean("landscape", true);
            bundle.putLong("appId", 100012000);
            bundle.putString("appKey", "ed5bcac197c55de1a06cf31bd91a1fc4");
            return bundle;
        }

        @Override
        public String getChannelName() {
            return "wandoujia";
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new WandoujiaChannelAPI());
    }
}
