package prj.chameleon.channelapi;

import prj.chameleon.test.TestChannelAPI;


public class DummyChannelAPI  {
    static void init() {
        TestChannelAPI api = new TestChannelAPI();
        ChannelInterface.addApiGroup(new APIGroup(Constants.PluginType.USER_API | Constants.PluginType.PAY_API,
                api));
    }
}
