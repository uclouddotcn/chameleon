package prj.chameleon.entry;

import android.os.Bundle;

import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.qihu.QihuChannelAPI;

class Instantializer {
    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<QihuChannelAPI> {

        public ChannelAPIImp(QihuChannelAPI imp) {
            super(imp);
        }

        @Override
        protected Bundle getConfigBundle() {
            Bundle bundle = new Bundle();
            bundle.putBoolean("landscape", false);
            bundle.putBoolean("bgTransparent", false);
            bundle.putString("uri", "http://localhost/");
            bundle.putString("channelName", "qihu");
            bundle.putString("appName", "testexample");
            return bundle;
        }

        @Override
        public String getChannelName() {
            return "nd91";
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new QihuChannelAPI());
    }
}
