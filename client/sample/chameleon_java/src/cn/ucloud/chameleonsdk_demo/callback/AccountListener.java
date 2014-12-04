package cn.ucloud.chameleonsdk_demo.callback;

import org.json.JSONObject;

import cn.ucloud.chameleonsdk_demo.MainActivity;

import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;

public class AccountListener implements IAccountActionListener {
	
	private MainActivity mainActivity;
	
	public AccountListener(MainActivity mainActivity){
		this.mainActivity = mainActivity;
	}
	
	@Override
    public void preAccountSwitch() {
		mainActivity.setUserInfo("before the account switch");
    }

    @Override
    public void afterAccountSwitch(int code, JSONObject newUserInfo) {
    	LoginCallBack cb = new LoginCallBack(mainActivity);
        cb.onFinished(Constants.ErrorCode.ERR_OK, newUserInfo);
    }

    @Override
    public void onAccountLogout() {
    	mainActivity.setUserInfo("user logout");
    }

    @Override
    public void onGuestBind(JSONObject newUserInfo) {
    	LoginCallBack cb = new LoginCallBack(mainActivity);
        cb.onFinished(Constants.ErrorCode.ERR_OK, newUserInfo);
    }
}
