package prj.chameleon.entry;
import android.os.Bundle;

import java.util.TreeMap;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.chinamob.ChinamobChannelAPI;



class Instantializer {
    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<ChinamobChannelAPI> {

        public ChannelAPIImp(ChinamobChannelAPI imp) {
            super(imp);
        }

        @Override
        public String getChannelName() {
            return "chinamob";
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            bundle.putSerializable("productMap", new TreeMap<String, String>());
            mChannelImp.setChannel(getChannelName());
            return bundle;
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new ChinamobChannelAPI());
    }
}
