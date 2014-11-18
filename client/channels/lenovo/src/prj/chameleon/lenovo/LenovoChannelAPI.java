package prj.chameleon.lenovo;

import android.app.Activity;

import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

public final class LenovoChannelAPI extends SingleSDKChannelAPI.SingleSDK {

    @Override
    public void charge(Activity activity, String orderId, String uidInGame, String userNameInGame, String serverId, String currencyName, String payInfo, int rate, int realPayMoney, boolean allowUserChange, IDispatcherCb cb) {

    }

    @Override
    public void buy(Activity activity, String orderId, String uidInGame, String userNameInGame, String serverId, String productName, String productID, String payInfo, int productCount, int realPayMoney, IDispatcherCb cb) {

    }

    @Override
    public void login(Activity activity, IDispatcherCb cb, IAccountActionListener accountActionListener) {

    }

    @Override
    public void logout(Activity activity) {

    }

    @Override
    public String getUid() {
        return null;
    }

    @Override
    public String getToken() {
        return null;
    }

    @Override
    public boolean isLogined() {
        return false;
    }

    @Override
    public String getId() {
        return null;
    }

    @Override
    public void exit(Activity activity, IDispatcherCb cb) {

    }
}