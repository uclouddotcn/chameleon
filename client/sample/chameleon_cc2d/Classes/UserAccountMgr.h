#ifndef __UserAccountMgr_H_
#define __UserAccountMgr_H_

#include "chameleoncb/ChannelAPICallback.h"
#include "EventEmitter.h"
#include "cocos-ext.h"
#include "JsonHttpClient.h"
#include <string>
#include <vector>
#include <map>
#include <memory>
USING_NS_CC_EXT;

class UserAccountMgr : public Chameleon::ChannelAPICallbackInf {
public:
    enum Event {
        EVENT_LOGOUT = 0,
        EVENT_LOGINED,
        EVENT_LOGIN_GUEST,
        EVENT_CHARGING,
        EVENT_BUYING,
        EVENT_CHARGED,
        EVENT_BOUGHT,
        EVENT_ANTI_ADDICTION_INFO,
        EVENT_SWITCH_ACCOUNT,
        EVENT_COUNT
    };

    enum {
        LOGIN_STATUS_LOGOUT,
        LOGIN_STATUS_LOGINED,
        LOGIN_STATUS_LOGINGUEST
    };

    struct ChargeResult {
        int status;
        int amount;
        std::string orderId;
        int total;
    };

    struct BuyResult {
        int status;
        int amount;
        int total;
        std::string productId;
        std::string orderId;
    };

    struct ChargeInfo {
        std::string orderId;
        std::string uidInGame;
        std::string userNameInGame;
        std::string serverId;
        std::string currencyName;
        std::string payInfo;
        int currencyCount;
        int realPayMoney;
        int code;
        int rate;
        bool allowUserChange;
    };

    struct BuyInfo {
        std::string orderId;
        std::string uidInGame;
        std::string userNameInGame;
        std::string serverId;
        std::string productName;
        std::string productId;
        std::string payInfo;
        int amount;
        int realPayMoney;
        int code;
    };

public:
    UserAccountMgr();
    ~UserAccountMgr();

    // APIs
    int AddListener(int eventType, EventEmitter::CallbackFunctor_t & func) {
        return mEventEmitter.AddListener(eventType, func);
    }
    void RemoveListener(int eventType, int handle) {
        return mEventEmitter.RemoveListener(eventType, handle);
    }
    int HeartBeat();
    int Login();
    int LoginGuest();
    int RegistGuest();
    int Charge(int amount);
    int Buy(const std::string & productId, int num);
    bool IsSupportSwitchAccount();
    int SwitchAccount();
    void ShowToolBar();
    void HideToolBar();
    void GetAntiAddictionInfo();
    void Logout();
    std::string GetUserInfo();

    const std::string & GetUin() const {
        return mUid;
    }

    const std::string & GetSession() const  {
        return mSession;
    }

    int GetLoginStatus() const {
        switch (mLoginStatus) {
        case GUEST_LOGINED:
            return LOGIN_STATUS_LOGINGUEST;
        case LOGINED:
            return LOGIN_STATUS_LOGINED;
        default:
            return LOGIN_STATUS_LOGOUT;
        }
    }

    // chameleon callback inf imp
    virtual void preAccountSwitch();
    virtual void afterAccountSwitch(int code, 
        const std::string * loginInfo);
    virtual void onAccountLogout();
    virtual void onGuestBind(const std::string & loginInfo);

    virtual void onLoginGuest(int id, int code);
    virtual void onRegistGuest(int id, int code, const std::string * loginInfo);
    virtual void onLogin(int id, int code, const std::string * loginInfo);
    virtual void onCharge(int id, int code);
    virtual void onBuy(int id, int code);
    virtual void onSwitchAccount(int id, int code, const std::string * loginInfo);
    virtual void onToolbar(int flag);
    virtual void onResume();
    virtual void onAntiAddiction(int id, int code, int flag);
    virtual void onDestroy(int id);
private:
    void onCharge(int status,
                  const std::string & orderId, 
                  int amount, 
                  int total);

    void onBought( int status,
                   const std::string & orderId, 
                   const std::string & productId,
                   int amount,
                   int total);
    void verifyLogin(const std::string & loginInfo);
    void setInVerifying() {
        mLoginStatus = IN_VERIFYING;
    }
    void setLogined() {
        mLoginStatus = LOGINED;
    }
    void setGuestLogined() {
        mLoginStatus = GUEST_LOGINED;
        mEventEmitter.FireEvent(EVENT_LOGIN_GUEST, this);
    }
    void setLogout();
    void onVerifyLogin(int code, rapidjson::Value * valueRoot, JsonHttpClient * client, const std::string & body);
    void onGetChargeInfo(int code, rapidjson::Value * valueRoot, JsonHttpClient * client, const std::string & body);
    void onGetBuyInfo(int code, rapidjson::Value * valueRoot, JsonHttpClient * client, const std::string & body);

    void onHeartBeat(int code, rapidjson::Value * valueRoot, JsonHttpClient * client, const std::string & body);
    void RespondsToEvents(const std::string& event, 
                          rapidjson::Value & body);
    
    void RemoveClient(JsonHttpClient * client);
    int GetHttpWrapperIdx(JsonHttpClient * client);
    void AddPendingChargeOrder(int cmdSeq, ChargeInfo* info);
    void AddPendingBuyOrder(int cmdSeq, BuyInfo* info);
    void sendSDKCharge(ChargeInfo* info);
    void sendSDKBuy(BuyInfo* info);
    void onRespondChargeEvent(rapidjson::Value& value);
    void onRespondBuyEvent(rapidjson::Value& value);
private:
    enum LoginStatus {
        LOGOUT,
        LOGIN_REQEUST,
        IN_VERIFYING,
        GUEST_LOGINED,
        LOGINED
    };

    std::string mUid;
    std::string mSession;
    LoginStatus mLoginStatus;
    EventEmitter mEventEmitter;
    std::string mChannel;
    std::string mAvartar;
    std::string mName;
    std::string mAppUid;
    int mExpiresIn;
    std::string mOthers;
    int mCmdSeq;
    bool mIsToolbarCreated;
    std::vector<JsonHttpClientWrapper> mHttpClients;
    std::map<int, std::unique_ptr<ChargeInfo> > mPendingChargeInfos;
    std::map<int, std::unique_ptr<BuyInfo> > mPendingBuyInfos;
    std::map<std::string, std::function<void(rapidjson::Value&)> > mPlayerEventHandlers;
};

extern UserAccountMgr g_userAccountMgr;
#endif // __UserAccountMgr_H_

