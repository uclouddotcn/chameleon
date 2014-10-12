#ifndef __ChannelAPICallback_H_
#define __ChannelAPICallback_H_

#include <string>
namespace Chameleon {

class ChannelAPICallbackInf {
public:
    virtual ~ChannelAPICallbackInf() {}
    /**
     * 玩家将要进行切换账户，这个函数只会在玩家使用平台的activity时候由平台触发的
     * 回调, 一般在这个时候做一些玩家数据保存工作，当前玩家马上就要登出了
     */
    virtual void preAccountSwitch() {}
    /**
     * 玩家已经完成了账户切换
     * @param {int} code, 表示玩家是否已经登录了新的账户，如果是，那么loginInfo则为有效的数据
     * @param {string} loginInfo, 如果登录了新的账户，那么这个是新账户的登录信息
     */
    virtual void afterAccountSwitch(int code, const std::string * loginInfo) {}
    /**
     * 当前用户从平台退出的回调
     */
    virtual void onAccountLogout() {}
    /**
     * 如果当前玩家是游客登录，并且通过平台的activity注册或者登录了，那么
     * 会通过这个回调告诉游戏正式的玩家登录信息
     * @param {string} loginInfo, 玩家的登录信息
     */
    virtual void onGuestBind(const std::string & loginInfo) {}

    /**
     * 由Chameleon SDK主动发起的登录流程，如果玩家是由游客身份登录，那么就会回调这个函数
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     */
    virtual void onLoginGuest(int id, int code) {}

    /**
     * 由Chameleon SDK主动发起的注册游客的请求的回调
     * @param {int} id, 对应请求的ID
     * @param {int} code, 注册或者登录成功与否
     * @param {string} loginInfo, 玩家的登录信息
     */
    virtual void onRegistGuest(int id, int code, const std::string * loginInfo) {}

    /**
     * 由Chameleon SDK主动发起的登录流程，如果玩家由平台正式用户登录, 则会回调这个函数
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     * @param {string} loginInfo, 玩家的登录信息
     */
    virtual void onLogin(int id, int code, const std::string * loginInfo) {}

    /**
     * 充值二级货币的请求的结果回调
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     */
    virtual void onCharge(int id, int code) {}

    /**
     * 购买道具的请求的结果回调
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     */
    virtual void onBuy(int id, int code) {}

    /**
     * 由Chameleon SDK主动发起的切换账户的请求的结果回调, 无论结果如何，最好当做当前的用户
     * 已经登出了
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     * @param {string} loginInfo, 玩家的登录信息
     */
    virtual void onSwitchAccount(int id, int code, const std::string * loginInfo) {}

    /**
     * 玩家通过点击平台的toolbar可能会切换到平台的activity中去，这个回调用于
     * 通知玩家进入或者退出了平台的activity
     * @param {int} flag, 参见ChameleonErrorCode.h中
     *                    CHAMELEON_SDK_UI_*
     */
    virtual void onToolbar(int flag) {}

    /**
     * 如果调用了PlatformAPI中的onPause函数，那么会进入平台的pause事件处理函数，
     * 当平台的pause事件处理完之后，会回调这个函数
     */
    virtual void onResume() {}

    /**
     * 防沉迷信息请求的结果回调
     * @param {int} id, 对应请求的ID
     * @param {int} code, 登录成功或者失败
     * @param {int} flag, 参见ChameleonErrorCode.h中
     *                    CHAMELEON_ANTIADDICTION_*
     */
    virtual void onAntiAddiction(int id, int code, int flag) {}

    /**
     * 调用销毁SDK实例的结果回调
     * @param {int} id, 对应请求的ID
     */
    virtual void onExit() {}

    virtual void onRunProtocol(int id, int code, const std::string & protocol, 
      const std::string & message) {}
};

}

#endif // __ChannelAPICallback_H_


