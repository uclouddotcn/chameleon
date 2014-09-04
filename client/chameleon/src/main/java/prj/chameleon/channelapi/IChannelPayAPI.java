package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Created by wushauk on 6/26/14.
 */
public interface IChannelPayAPI {

    /**
     * init the config of this channel
     * @param cfg config of this channel
     */
    public abstract void initCfg(Bundle cfg);

    /**
     * init the SDK
     * @param activity the activity to give the real SDK
     * @param isDebug whether set it in debug mode
     * @param cb callback function when the request is finished, the JSON object is null
     */
    public abstract void init(android.app.Activity activity,
                              boolean isDebug,
                              IDispatcherCb cb);
    /**
     * user charge the currency in the game
     * @param activity
     * @param orderId the order id from server
     * @param uidInGame player id in the game
     * @param userNameInGame  player name in the game
     * @param serverId  current server id
     * @param currencyName the currency name
     * @param payInfo the additional pay info from chameleon server
     * @param rate the rate of the game currency to RMB, e.g. ￥1.0 can buy 10 game currency, then
     *             rate = 10
     * @param realPayMoney the real money to pay
     * @param allowUserChange can user change the amnout he paid
     * @param cb JSON object will be null
     */
    public abstract void charge(Activity activity,
                                String orderId,
                                String uidInGame,
                                String userNameInGame,
                                String serverId,
                                String currencyName,
                                String payInfo,
                                int rate,
                                int realPayMoney,
                                boolean allowUserChange,
                                IDispatcherCb cb);

    /**
     *  user buy a product
     * @param activity the activity to give the real SDK
     * @param orderId the order id from server
     * @param uidInGame player id in the game
     * @param userNameInGame player name in the game
     * @param serverId  current server id
     * @param productName the name of the product
     * @param productID the id of the product
     * @param productCount the count of product
     * @param payInfo the additional pay info from chameleon server
     * @param realPayMoney the real money to pay
     * @param cb JSON object will be null
     */
    public abstract void buy(Activity activity,
                             String orderId,
                             String uidInGame,
                             String userNameInGame,
                             String serverId,
                             String productName,
                             String productID,
                             String payInfo,
                             int productCount,
                             int realPayMoney,
                             IDispatcherCb cb);

    /**
     * destroy the sdk instance
     * @param activity
     */
    public abstract void exit(Activity activity, IDispatcherCb cb);

    /**
     * on activity result, the parameter is the same as Activity.onActivityResult
     * @param requestCode
     * @param resultCode
     * @param data
     */
    public void onActivityResult(int requestCode, int resultCode, Intent data);


    /**
     * get token for pay
     * @return the token for payment
     */
    public abstract String getPayToken();

    /**
     *
     * @param event refer to Constants.ApplicationEvent
     * @param arguments the var-arguments for this event
     */
    public void onApplicationEvent(int event, Object... arguments);

}
