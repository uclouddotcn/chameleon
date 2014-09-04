package prj.chameleon.channelapi;

import org.json.JSONObject;

public interface IDispatcherCb {
    /**
     *
     * @param retCode refer to ErrorCode definition in Constants
     * @param data data structure differs in different method, refer to the doc in IChannelUserAPI
     */
	public abstract void onFinished(int retCode, JSONObject data);
}