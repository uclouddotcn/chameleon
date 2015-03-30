/**
* Chameleon API for C.
**/

#ifndef __ChameleonChannelAPI_EXPORT_C_H_
#define __ChameleonChannelAPI_EXPORT_C_H_

#include "ChannelAPICallback.h"
#ifdef _cplusplus
extern "C"{
#endif
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
     * @param {char *} tips, 有些平台可以在注册页面显示一段提供的tips
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int registGuest(int id, const char * tips);

    /**
     * 发起平台登录请求
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int login(int id);

    /**
     * 退出登录
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int logout();

    /**
     * 如果游戏使用了二级货币，那么可以通过这个函数发起充值的请求
     * @param {int} id, 标识该请求的id
     * @param {char *} orderId, 此次购买的ID
     * @param {char *} uidInGame, 玩家在游戏中的id
     * @param {char *} userNameInGame, 玩家在游戏中的名字
     * @param {char *} serverId, 玩家所在server的ID
     * @param {char *} currencyName, 二级货币的名称
     * @param {char *} payInfo, 从chameleon server获得了额外支付信息
     * @param {int} rate, 二级货币的兑换比率，例如，如果1RMB可以兑换10二级货币，那么rate=10
     * @param {int} realPayMoney, 希望玩家支付的数量，如果允许玩家自己输入，那么这个param可能
     *                            会被忽略
     * @param {bool} allowUserChange, 是否允许玩家自己输入
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int charge(int id,
               const char * orderId,
               const char * uidInGame,
               const char * userNameInGame,
               const char * serverId,
               const char * currencyName,
               const char * payInfo,
               int rate,
               int realPayMoney,
               bool isAllowUserChange);

    /**
     * 如果游戏使用了购买道具的功能，那么可以通过这个函数发起购买的请求
     * @param {int} id, 标识该请求的id
     * @param {char *} orderId, 此次购买的ID
     * @param {char *} uidInGame, 玩家在游戏中的id
     * @param {char *} userNameInGame, 玩家在游戏中的名字
     * @param {char *} serverId, 玩家所在server的ID
     * @param {char *} productName, 道具的名称
     * @param {char *} productId, 产品的ID
     * @param {char *} payInfo, 从chameleon server获得了额外支付信息
     * @param {int} productCount, 购买的数量
     * @param {int} realPayMoney, 希望玩家支付的数量，如果允许玩家自己输入，那么这个param可能
     *                            会被忽略
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int buy(int id,
            const char * orderId,
            const char * uidInGame,
            const char * userNameInGame,
            const char * serverId,
            const char * productName,
            const char * productId,
            const char * payInfo,
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
     * @param {int} position, 位置参数
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int createAndShowToolbar(int position);

    /**
     * 显示或者隐藏工具条
     * @param {bool} isVisible, 显示或者隐藏
     */
    void showToolbar(bool isVisible);

    /**
     * 销毁工具条
     */
    void destroyToolbar();


    /**
     * 查询防沉迷信息
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int antiAddiction(int id);

    /**
     * 退出渠道SDK
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int exit();

    /**
     * 获取渠道的名字
     * @return {string}
     */
    int getChannelName(char * buffer, int length);

    /**
     * 获取玩家的id
     * @return {string}
     */
    int getUid(char * buffer, int length);

    /**
     * 获取玩家的token
     * @return {string}
     */
    int getToken(char * buffer, int length);

    /**
     * 获取玩家的pay token
     * @return {string}
     */
    int getPayToken(char * buffer, int length);

    /**
     * 响应从Chamemleon SDK服务器回来的信息
     * @param {string} loginRsp SDK服务器的回包
     * @return {int} 登陆是否验证登陆成功
     */
    bool onLoginRsp(const char * loginRsp);

    /**
     * 提交用户信息
     * @param roleId 用户在游戏中的ID
     * @param roleName 用户在游戏中的名
     * @param roleLevel 用户等级
     * @param zoneId zone id
     * @param zoneName zone的名称
     */
    int submitPlayerInfo(const char * roleId,
                          const char * roleName,
                          const char * roleLevel,
                          int zoneId,
                          const char * zoneName);
    /**
     * 是否登录
     */
    bool isLogined();

    bool isSupportProtocol(const char * protocl);
    int runProtocol(int id, const char * protocol, const char * message);




#ifdef _cplusplus
}
#endif

#endif // __ChameleonChannelAPI_EXPORT_C_H_



