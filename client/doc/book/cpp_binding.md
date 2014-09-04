# Chameleon SDK c++ binding
Chameleon的SDK的C++ binding包括三个部分，分别为JNI layer，Chameleon的API类，以及事件回调的处理接口

## JNI Layer
JNI Layer包括两个部分：一部分是为了适应C++的接口增加的Java部分的代码；另外一部分是native C的实现函数
由于在C++代码里面没法拿到当前的activity，所以Chameleon C++ binding需要在初始化时候注册一个activity，并且之后都会使用这个activity作为渠道SDK的Context。另外在Cocos2d-x这种游戏引擎内，一般会使用一个专门的gl线程来运行C++代码，因此在初始化时候还可以注册一个GLSurfaceView的实例，所有回调都会在这个实例的线程内运行。
例如在Cocos2d-x中，可以在主Activity的onCreateView中加入初始化函数
```java
    public Cocos2dxGLSurfaceView onCreateView() {
    	Cocos2dxGLSurfaceView glSurfaceView =
    	    new Cocos2dxGLSurfaceView(this);
    	// chameleon_cc2d should create stencil buffer
    	glSurfaceView.setEGLConfigChooser(5, 6, 5, 0, 16, 8);

        CPlatformInterface.init(this, glSurfaceView, true);

    	return glSurfaceView;
    }


```
## Chameleon的API类

游戏可以通过这一层API调用chameleon的java接口。所有请求的回调都会通过注册的回调接口的实例来完成。
因为这些请求大多是异步的，为了在回调时候区分不同的请求，所有异步请求的接口都会带有id这个字段，用来当做请求命令的标识，当异步请求完成，调用回调接口时候，也会将这个id传入回调接口。

chameleoncb/ChameleonPlatformAPI.h

```C++
namespace Chameleon {
namespace ChameleonPlatformAPI{
    /**
     * 设置Java的虚拟机实例
     */
    void setJavaVM(JavaVM * vm);

    /**
     * 释放设置的java的虚拟机实例
     */
    void releaseJavaVM(JavaVM * vm);

    /**
     * 注册事件的回调实例
     */
    void registCallback(CPlatformAPICallbackInf * callbackImp);

    /**
     * 发起游客登录，有些平台不支持游客登录或者平台一些登录策略，也有可能
     * 会发起正式的登录
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int loginGuest(int id);

    /**
     * 如果是游客登录, 那么通过这个函数可以发起正式注册的请求
     * @param {int} id, 标识该请求的id
     * @param {std::string} tips, 有些平台可以在注册页面显示一段提供的tips
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int registGuest(int id, const std::string & tips);

    /**
     * 发起平台登录请求
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int login(int id);

    /**
     * 如果游戏使用了二级货币，那么可以通过这个函数发起充值的请求
     * @param {int} id, 标识该请求的id
     * @param {std::string} orderId, 此次购买的ID
     * @param {std::string} uid, 平台的用户ID
     * @param {std::string} accessToken, 此次登录的session
     * @param {std::string} uidInGame, 玩家在游戏中的id
     * @param {std::string} userNameInGame, 玩家在游戏中的名字
     * @param {std::string} serverId, 玩家所在server的ID
     * @param {std::string} currencyName, 二级货币的名称
     * @param {int} rate, 二级货币的兑换比率，例如，如果1RMB可以兑换10二级货币，那么rate=10
     * @param {int} realPayMoney, 希望玩家支付的数量，如果允许玩家自己输入，那么这个param可能
     *                            会被忽略
     * @param {bool} allowUserChange, 是否允许玩家自己输入
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int charge(int id,
               const std::string & orderId,
               const std::string & uid,
               const std::string & accessToken,
               const std::string & uidInGame,
               const std::string & userNameInGame,
               const std::string & serverId,
               const std::string & currencyName,
               int rate,
               int realPayMoney,
               bool allowUserChange);

    /**
     * 如果游戏使用了购买道具的功能，那么可以通过这个函数发起购买的请求
     * @param {int} id, 标识该请求的id
     * @param {std::string} orderId, 此次购买的ID
     * @param {std::string} uid, 平台的用户ID
     * @param {std::string} accessToken, 此次登录的session
     * @param {std::string} uidInGame, 玩家在游戏中的id
     * @param {std::string} userNameInGame, 玩家在游戏中的名字
     * @param {std::string} serverId, 玩家所在server的ID
     * @param {std::string} productName, 道具的名称
     * @param {std::string} productId, 产品的ID
     * @param {int} productCount, 购买的数量
     * @param {int} realPayMoney, 希望玩家支付的数量，如果允许玩家自己输入，那么这个param可能
     *                            会被忽略
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int buy(int id,
            const std::string & orderId,
            const std::string & uid,
            const std::string & accessToken,
            const std::string & uidInGame,
            const std::string & userNameInGame,
            const std::string & serverId,
            const std::string & productName,
            const std::string & productId,
            int productCount,
            int realPayMoney);

    /**
     * 该平台是否支持账号切换
     * @return {bool}, 是否支持账号切换
     */
    bool isSupportSwtichAccount();

    /**
     * 发起切换账户的请求
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int switchAccount(int id);

    /**
     * 创建并且显示平台的工具条
     * @param {int} id, 标识该请求的id
     * @param {int} x, 显示的X轴坐标
     * @param {int} y, 显示的Y轴坐标
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int createAndShowToolbar(int id, int x, int y);

    /**
     * 显示或者隐藏工具条
     * @param {int} x, 显示的X轴坐标
     * @param {int} y, 显示的Y轴坐标
     * @param {bool} isVisible, 显示或者隐藏
     */
    void showToolbar(int x, int y, bool isVisible);

    /**
     * 销毁工具条
     */
    void destroyToolbar();

    /**
     * 调用平台的onPause事件
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int onPause(int id);

    /**
     * 调用平台的onPause事件
     * @param {int} id, 标识该请求的id
     * @param {std::string} uid, 标识该请求的id
     * @param {std::string} accessToken, 当前的session
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int antiAddiction(int id,
                      const std::string & uid,
                      const std::string & accessToken);
    /**
     * 销毁SDK的内容
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int destroy(int id);

    /**
     * 获取平台的名字
     * @return {string}
     */
    std::string getPlatformName();
}
}
```

## 事件回调的处理接口
这一部分是一个抽象基类。用于响应异步请求的回包或者是平台主动触发的一些消息。

chameleoncb/CPlatformAPICallback.h

```C++
namespace Chameleon {

struct UserLoginInfo {
    std::string token;
    std::string others;
    std::string platform;
};

class CPlatformAPICallbackInf {
public:
    virtual ~CPlatformAPICallbackInf() {}
    /**
     * 玩家将要进行切换账户，这个函数只会在玩家使用平台的activity时候由平台触发的
     * 回调, 一般在这个时候做一些玩家数据保存工作，当前玩家马上就要登出了
     */
    virtual void preAccountSwitch() = 0;
    /**
     * 玩家已经完成了账户切换
     * @param {int} code, 表示玩家是否已经登录了新的账户，如果是，那么loginInfo则为有效的数据
     * @param {UserLoginInfo} loginInfo, 如果登录了新的账户，那么这个是新账户的登录信息
     */
    virtual void afterAccountSwitch(int code, const UserLoginInfo * loginInfo) = 0;
    /**
     * 当前用户从平台退出的回调
     */
    virtual void onAccountLogout() = 0;
    /**
     * 如果当前玩家是游客登录，并且通过平台的activity注册或者登录了，那么
     * 会通过这个回调告诉游戏正式的玩家登录信息
     * @param {UserLoginInfo} loginInfo, 玩家的登录信息
     */
    virtual void onGuestBind(const UserLoginInfo & loginInfo) = 0;

    /**
     * 由Chameleon SDK主动发起的登录流程，如果玩家是由游客身份登录，那么就会回调这个函数
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     */
    virtual void onLoginGuest(int id, int code) = 0;

    /**
     * 由Chameleon SDK主动发起的注册游客的请求的回调
     * @param {int} id, 对应请求的ID
     * @param {int} code, 注册或者登录成功与否
     * @param {UserLoginInfo} loginInfo, 玩家的登录信息
     */
    virtual void onRegistGuest(int id, int code, const UserLoginInfo * loginInfo) = 0;

    /**
     * 由Chameleon SDK主动发起的登录流程，如果玩家由平台正式用户登录, 则会回调这个函数
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     * @param {UserLoginInfo} loginInfo, 玩家的登录信息
     */
    virtual void onLogin(int id, int code, const UserLoginInfo * loginInfo) = 0;

    /**
     * 充值二级货币的请求的结果回调
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     */
    virtual void onCharge(int id, int code) = 0;

    /**
     * 购买道具的请求的结果回调
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     */
    virtual void onBuy(int id, int code) = 0;

    /**
     * 由Chameleon SDK主动发起的切换账户的请求的结果回调, 无论结果如何，最好当做当前的用户
     * 已经登出了
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     * @param {UserLoginInfo} loginInfo, 玩家的登录信息
     */
    virtual void onSwitchAccount(int id, int code, const UserLoginInfo * loginInfo) = 0;

    /**
     * 玩家通过点击平台的toolbar可能会切换到平台的activity中去，这个回调用于
     * 通知玩家进入或者退出了平台的activity
     * @param {int} flag, 参见ChameleonErrorCode.h中
     *                    CHAMELEON_SDK_UI_*
     */
    virtual void onToolbar(int flag) = 0;

    /**
     * 如果调用了PlatformAPI中的onPause函数，那么会进入平台的pause事件处理函数，
     * 当平台的pause事件处理完之后，会回调这个函数
     */
    virtual void onResume() = 0;

    /**
     * 防沉迷信息请求的结果回调
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     * @param {int} flag, 参见ChameleonErrorCode.h中
     *                    CHAMELEON_ANTIADDICTION_*
     */
    virtual void onAntiAddiction(int id, int code, int flag) = 0;

    /**
     * 调用销毁SDK实例的结果回调
     * @param {int} id, 对应请求的ID
     */
    virtual void onDestroy(int id) = 0;
};

}

```
