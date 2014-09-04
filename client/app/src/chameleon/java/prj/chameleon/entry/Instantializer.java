package prj.chameleon.entry;

import android.app.Activity;
import android.os.Bundle;

import java.lang.Override;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.test.TestChannelAPI;

class Instantializer {
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
