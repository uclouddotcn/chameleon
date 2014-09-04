# Chameleon SDK

##API设计
###回调接口的设计
IDispatcherCb是所有接口的通用回调接口。retCode是操作的错误码，data则是一个json的object，内容在不同接口里面有不同的定义。

```java
public interface IDispatcherCb {
	public abstract void onFinished(int retCode, JSONObject data);
}
```
###账号行为监听接口
不少平台都会有由平台组件触发的账号行为，例如切换账号，退出登录等。这部分由于不是有开发者的APP发起的，所以一般需要注册一个回调接口来响应这些事件。
这个接口需要实现四个回调函数，对应不同的账号变化事件。

 * preAccountSwitch: 用户即将开始切换账号，此时登录态已然是正常的，一般应用可以在这里保存一些玩家数据
 * afterAccountSwitch: 之前用户已经登出，之后的用户可能登录完成，也可能取消登录了
 * onAccountLogout: 用户已经退出登录
 * onGuestBind: 如果应用支持游客账户登录，那么这个接口可以监听到游客已经完成了注册或者关联了一个现有的账号

```
public interface IAccountActionListener {
    /**
     *  called just before the user switch the account, the uin and session is still valid here
     *  APP can save the user data here
     */
    public void preAccountSwitch();

    /**
     * Previous user has logged out, and maybe has logged in here
     * @param code ERR_OK means the another account has logged in, otherwise the no one
     *             has logged in APP maybe need to show the login activity again
     * @param newUserInfo if another account has logged in, then the user info is passed
     *                    here, the structure is same as PlatformInterface.login
     */
    public void afterAccountSwitch(int code, JSONObject newUserInfo);

    /**
     * callback when the user has logged out
     */
    public void onAccountLogout();

    /**
     * if the user logged in as a guest and later an account is bound to this guest,
     * this callback will be fired with the new account info.
     * @param newUserInfo the bound account info. The structure is same as PlatformInterface.login
     */
    public void onGuestBind(JSONObject newUserInfo);
}
```

###PlatformInterface的静态函数

####初始化（必选）
在创建activity之后，可以调用此接口初始化整个SDK

```java
	/**
     * init the SDK
     * @param activity the activity to give the real SDK
     * @param cb callback function when the request is finished, the JSON object is null
     */
	public static void init(Activity activity, IDispatcherCb cb)
```
输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|cb|异步操作的回调|

这个函数的回调中得JSON object为null

| 参数名 | 类型 | 重要性 | 说明 |
|:---:|:---:|:---:|:---:|
||||

例如
```java
PlatformInterface.init(this, true, new IDispatcherCb() {

            @Override
            public void onFinished(int retCode, JSONObject data) {
                // do something after initialization
            }

        });
```

####游客登录(可选)
如果游戏希望玩家可以使用游客身份快速开始游戏，那么可以调用此接口。不过不是所有平台都支持游客登录，所以在不支持游客登录的平台，这个函数还是会发起正常的登录流程。因此这个函数的回调里面需要判断是否是游客登录还是正常账户登录。
 ```
    /**
     * login as a guest
     * @param activity the activity to give the real SDK
     * @param loginCallback callback when login guest if finished ,JSON object
     *					     will have one or three fields
     *                      guest : if this is non-zero, then the user login as a guest,
     *							     following two fields will not exists
     *                      token : the access token from the platform
     *                      others: a segment of json string for SDK server
     * @param accountActionListener listener of the user account actions,
     * 								 refer to the interface definition
     */
    public static void loginGuest(Activity activity,
                                  IDispatcherCb loginCallback,
                                  IAccountActionListener accountActionListener)
```

输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|loginCallback|异步操作的回调|
|accountActionListener|这个session的账号活动监听|

这个函数的回调中得JSON类型有

| 参数名 | 类型 | 重要性 | 说明 |
|:---:|:---:|:---:|:---:|
|guest| int| 必须| 0表示不是游客登录，应该走整成的登录流程。1表示是游客登录|
|loginInfo| object| 可选| 如果不是游客登录，那么这个object是登录用户的信息，结构同login接口的返回参数|


例如
```java
    PlatformInterface.loginGuest(this,
        new IDispatcherCb() {

        @Override
        public void onFinished(int retCode, final JSONObject data) {
            int guest = data.getInt("guest");
            if (guest != 0) {
                // 用户以游客身份登录，做相关的处理
            } else {
                // 用户正常登录, 走登录的鉴权流程
            }
        }
    });
```

#### 登陆（必选）

```
  /**
     * user login to platform
     * @param activity the activity to give the real SDK
     * @param cb JSON object will have two fields
     *           token : the access token from the platform
     *           others: a segment of json string for SDK server
     */
    public static void login(Activity activity, IDispatcherCb cb)
```
输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|cb|异步操作的回调|
|accountActionListener|这个session的账号活动监听|

这个函数的回调中得JSON类型有

| 参数名 | 类型 | 重要性 | 说明 |
|:---:|:---:|:---:|:---:|
|token| String| 必须 | 平台给出的会话session的token|
|others| String | 必须 | SDK的透传字段，验证账号时候需要APP的服务器传给SDK服务器|

####提示游客注册
APP可以通过这个接口主动发起游客绑定的流程

```
    /**
     * register guest, if the user is not login as a guest, this function does nothing
     * @param activity  the activity to give the real SDK
     * @param tips the tips for the register, not all platform support customize the tips
     * @param cb callback of the binding request
     *
     * @return boolean, true when user login as a guest
     *					 and the register can continue, otherwise false
     */
    public static boolean registGuest(Activity activity, String tips, IDispatcherCb cb)
```
输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|cb|异步操作的回调|
|accountActionListener|这个session的账号活动监听|

返回值

true表示已经开始发起，false表示当前用户不是游客，无法发起这个请求

这个函数的回调中得JSON类型同登录接口


####充值虚拟货币(依据支付类型可选）

```
   /**
     * user charge the currency in the game
     * @param activity
     * @param orderId the order id from server
     * @param uid the user id of the platform
     * @param accessToken the session token of the platform
     * @param uidInGame player id in the game
     * @param userNameInGame  player name in the game
     * @param serverId  current server id
     * @param currencyName the currency name
     * @param rate the rate of the game currency to RMB,
     *				e.g. ￥1.0 can buy 10 game currency, then rate = 10
     * @param realPayMoney the real money to pay
     * @param allowUserChange can user change the amnout he paid
     * @param cb JSON object will be null
     */
    public static void charge(Activity activity,
                              String orderId,
                              String uid,
                              String accessToken,
                              String uidInGame,
                              String userNameInGame,
                              String serverId,
                              String currencyName,
                              int rate,
                              int realPayMoney,
                              boolean allowUserChange,
                              IDispatcherCb cb)
```

输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|orderId|购买的订单ID|
|uid|平台的用户id|
|accessToken|平台下发的token|
|appUid|app中的用户ID|
|appUserName|app中得用户昵称|
|serverId|server的id|
|currencyName|虚拟货币的名称|
|rate|虚拟货币和RMB之间兑换的汇率，例如￥1.0可以买10个虚拟货币的话,那么这里就填10|
|realPayMoney|实际支付的RMB,单位: 分|
|allowUserChange|是否允许玩家修改|
|cb|异步操作的回调|



这个函数的回调中得JSON object是NULL

| 参数名 | 类型 | 重要性 | 说明 |
|:---:|:---:|:---:|:---:|
|| |||

####购买道具(依据支付类型可选)


```
   /**
     *  user buy a product
     * @param activity the activity to give the real SDK
     * @param orderId the order id from server
     * @param uid the user id of the platform
     * @param accessToken the session token of the platform
     * @param uidInGame player id in the game
     * @param userNameInGame player name in the game
     * @param serverId  current server id
     * @param productName the name of the product
     * @param productID the id of the product
     * @param productCount the count of product
     * @param realPayMoney the real money to pay
     * @param cb JSON object will be null
     */
    public static void buy(android.app.Activity activity,
                           String orderId,
                           String uid,
                           String accessToken,
                           String uidInGame,
                           String userNameInGame,
                           int serverId,
                           String productName,
                           String productID,
                           int productCount,
                           int realPayMoney,
                           IDispatcherCb cb)
```
输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|orderId|购买的订单ID|
|uid|平台的用户id|
|accessToken|平台下发的token|
|appUid|app中的用户ID|
|appUserName|app中得用户昵称|
|serverId|server的id|
|productName|道具的名称|
|productID|道具的ID|
|productCount|道具的数量|
|realPayMoney|真是需要支付的RMB，单位: 分|
|cb|异步操作的回调|


这个函数的回调中得JSON object是NULL

| 参数名 | 类型 | 重要性 | 说明 |
|:---:|:---:|:---:|:---:|
|| |||


#### 登出(必须)

```
  /**
     * user logout
     * @param activity the activity to give the real SDK
     * @param cb can be null, JSON object will be null
     */
    public static void logout(Activity activity, IDispatcherCb cb)
```
输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|cb|异步操作的回调|

这个函数的回调中得JSON object是NULL

| 参数名 | 类型 | 重要性 | 说明 |
|:---:|:---:|:---:|:---:|
| | | | |

#### 切换账号(可选)

```
   /**
     * for user to switch the account, to many platform it performs logout then login
     * @param activity the activity to give the real SDK
     * @param cb JSON object is the same as the login callback
     */
    public static void switchAccount(Activity activity, IDispatcherCb cb)
```
输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|cb|异步操作的回调|

这个函数的回调中得JSON情况同__登陆__




####创建浮动按钮(可选)

```
   /**
     * create the float tool bar ( required by 91, UC)
     * @param activity the activity to give the real SDK
     * @param cb JSON object will contain a flag:
     *           SDK_UI_OPEN indicates the SDK UI is opend
     *           SDK_UI_CLOSE indicates the SDK UI is closed
     */
    public static void createToolBar(Activity activity, IDispatcherCb cb)
```

创建浮动按钮，但是不显示这个按钮，需要主动调用显示函数来显示它。

输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|cb|异步操作的回调|

回调的接口用来响应SDK界面打开和关闭的事件，这个函数的回调中得JSON类型有

| 参数名 | 类型 | 重要性 | 说明 |
|:---:|:---:|:---:|:---:|
|flag| int| 必须 | SDK_UI_OPEN表示SDK界面将要打开的事件，SDK_UI_CLOSE表示SDK界面关闭的事件|


####显示或者隐藏浮动按钮(可选)


```
  /**
     *  show or hide the float tool bar (required by 91, UC)
     * @param activity the activity to give the real SDK
     * @param x the width parameter, locate in x%
     * @param y the height parameter, locate in y%
     * @param visible true for show, false for hide
     */
    public static void showFloatBar(Activity activity, int x, int y, boolean visible)
```
输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|x|按钮位置参数，表示在x轴上得x%的位置|
|y|按钮位置参数，表示在y轴上得y%的位置|
|visible|true表示显示，false表示隐藏|



####销毁移动按钮(可选)

```
  /**
     *  destroy the tool bar
     * @param activity the activity to give the real SDK
     */
    public static void destroyToolBar(Activity activity)
```
输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|


#### 暂停(可选)


```
  /**
     *  when the app is activate from the background( refer to 91 doc, only required by 91)
     * @param activity the activity to give the real SDK
     * @param cb JSON object will be null
     */
    public static void onPause(Activity activity, IDispatcherCb cb)
```

输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|cb|异步操作的回调|

这个函数的回调中得JSON object是null

| 参数名 | 类型 | 重要性 | 说明 |
|:---:|:---:|:---:|:---:|
|

#### 防沉迷查询(可选)


```
  /**
     *  check if the user is adult, if the platform doesn't provide this interface, user will be
     *  treated as adult
     * @param activity the activity to give the real SDK
     * @param uid platform user id
     * @param accessToken access token
     * @param cb JSON object will receive flag:
     *           ANTI_ADDITION_ADULT
     *           ANTI_ADDITION_CHILD
     *           ANTI_ADDITION_UNKNOWN
     */
    public static void antiAddiction(Activity activity,
                                     String uid,
                                     String accessToken,
                                     IDispatcherCb cb)
```
检查防沉迷信息，如果平台无这种接口，一定会返回成人

输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|uid|平台的user id|
|accessToken|平台下发的token|
|cb|异步操作的回调|

这个函数的回调中得JSON类型有

| 参数名 | 类型 | 重要性 | 说明 |
|:---:|:---:|:---:|:---:|
|flag| int| 必须 | ANTI_ADDITION_ADULT表示成人，ANTI_ADDITION_CHILD表示小孩，ANTI_ADDITION_UNKNOWN表示没有信息|


####销毁(必须)


```
 /**
     * destroy the sdk instance
     * @param activity
     * @param cb can be null, otherwise it will called when the sdk is desctoryed, JSON will be null
     */
    public static void destroy(Activity activity, IDispatcherCb cb)
```
输入的参数

| 参数名 |说明 |
|:---:|:---:|
|activity|就是activity了|
|cb|异步操作的回调|

这个函数的回调中得JSON object是null

| 参数名 | 类型 | 重要性 | 说明 |
|:---:|:---:|:---:|:---:|



