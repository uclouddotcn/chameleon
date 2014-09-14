package prj.chameleon.channelapi;

import android.os.Bundle;

import prj.chameleon.test.TestChannelAPI;


public class DummyChannelAPI  {

    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<TestChannelAPI> {

        public ChannelAPIImp(TestChannelAPI imp) {
            super(imp);
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            bundle.putBoolean("landscape", false);
            bundle.putString("channelName", getChannelName());
            return bundle;
        }

        @Override
        public String getChannelName() {
            return "test";
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new TestChannelAPI());
    }
}
