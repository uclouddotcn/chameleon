#include "UserAccountMgr.h"

#include "chameleoncb/ChameleonErrorCode.h"
#include "chameleoncb/ChameleonChannelAPI.h"
#include "cocos2d.h"
#include <stdlib.h>
#include <string>

USING_NS_CC;
using namespace std;
using namespace Chameleon;

template <typename T> 
T GetJsonValue(rapidjson::Value & obj, const char * name);

template <typename T> 
T GetJsonValueDefault(rapidjson::Value & obj, const char * name, const T & d);

class JsonException {
public:
    JsonException(const char * name, const char * reason) {
        mErrMsg.reserve(1024);
        mErrMsg += "Fail to handle field ";
        mErrMsg += name;
        mErrMsg += ", ";
        mErrMsg += reason;
    }
    std::string mErrMsg;
};

template <> 
int GetJsonValue<int>(rapidjson::Value & obj, const char * name) {
    rapidjson::Value & m = obj[name];
    if (!m.IsInt()) {
        throw JsonException(name, "not int");
    }
    return m.GetInt();
}

template <> 
const char * GetJsonValue<const char*>(rapidjson::Value & obj, const char * name) {
    rapidjson::Value &  m = obj[name];
    CCLog("get name %s", name);
    if (!m.IsString()) {
        throw JsonException(name, "not string");
    }
    return m.GetString();
}

template <> 
rapidjson::Value & GetJsonValue<rapidjson::Value&>(rapidjson::Value & obj, const char * name) {
    rapidjson::Value &  m = obj[name];
    if (!m.IsObject() && !m.IsArray()) {
        throw JsonException(name, "not object");
    }
    return m;
}

template <> 
int GetJsonValueDefault<int>(rapidjson::Value & obj, const char * name, const int & d) {
    rapidjson::Value & m = obj[name];
    if (m.IsNull()) {
        return d;
    }
    if (!m.IsInt()) {
        throw JsonException(name, "not int");
    }
    return m.GetInt();
}

template <> 
const char * GetJsonValueDefault<const char*>(rapidjson::Value & obj, 
                                              const char * name,
                                              const char * const & d) {
    rapidjson::Value & m = obj[name];
    if (m.IsNull()) {
        return d;
    }
    if (!m.IsString()) {
        throw JsonException(name, "not string");
    }
    return m.GetString();
}


UserAccountMgr g_userAccountMgr;
const string DEV_URL("http://118.192.73.182:7900/");
//const string DEV_URL("http://172.16.9.43:7900/");

UserAccountMgr::UserAccountMgr():
mLoginStatus(LOGOUT), mIsToolbarCreated(false) {
    mEventEmitter.Init(EVENT_COUNT);
    ChameleonChannelAPI::registCallback(this);
    mCmdSeq = rand() % 10000;
    mPlayerEventHandlers["charge"] = 
      std::bind(&UserAccountMgr::onRespondChargeEvent, 
                this, 
                std::placeholders::_1);
    mPlayerEventHandlers["buy"] = 
      std::bind(&UserAccountMgr::onRespondBuyEvent, 
                this, 
                std::placeholders::_1);
}

UserAccountMgr::~UserAccountMgr() {
    ChameleonChannelAPI::registCallback(NULL);
}

void UserAccountMgr::onRespondChargeEvent(rapidjson::Value& value) {
    int amount = GetJsonValue<int>(value, "amount");
    std::string orderId = GetJsonValue<const char*>(value, "orderId");
    int total = GetJsonValue<int>(value, "total");
    int status = GetJsonValue<int>(value, "status");
    onCharge(status, orderId, amount, total);
}

void UserAccountMgr::onRespondBuyEvent(rapidjson::Value& value) {
    int amount = GetJsonValue<int>(value, "amount");
    std::string orderId = GetJsonValue<const char*>(value, "orderId");
    int total = GetJsonValue<int>(value, "total");
    int status = GetJsonValue<int>(value, "status");
    std::string productId = GetJsonValue<const char*>(value, "productId");
    onBought(status, orderId, productId, amount, total);
}

void UserAccountMgr::preAccountSwitch() {
    // save user data here
    setLogout();
}

void UserAccountMgr::afterAccountSwitch(int code, const std::string * loginInfo) {
    if (code != CHAMELEON_ERR_OK) {
        // redo login
        Login();
        return;
    }
    verifyLogin(*loginInfo);
}

void UserAccountMgr::onAccountLogout() {
    CCLog("on user log out");
    setLogout();
}

void UserAccountMgr::onGuestBind(const std::string & loginInfo) {
    if (mLoginStatus != GUEST_LOGINED) {
        CCLog("guest bind while not in guest mode...");
        return;
    }
    verifyLogin(loginInfo);
}

void UserAccountMgr::onLoginGuest(int id, int code) {
    if (code != CHAMELEON_ERR_OK) {
        Login();
        return;
    }
    if (mLoginStatus != LOGOUT) {
        return;
    }
    setGuestLogined();
}

void UserAccountMgr::onRegistGuest(int id, int code, const std::string * loginInfo) {
    if (code != CHAMELEON_ERR_OK) {
        Login();
        return;
    }
    verifyLogin(*loginInfo);
}

void UserAccountMgr::onLogin(int id, int code, const std::string * loginInfo) {
    if (code != CHAMELEON_ERR_OK) {
        Login();
        return;
    }
    verifyLogin(*loginInfo);
}

void UserAccountMgr::onCharge(int id, int code) {
    // we can record a charge information here
}

void UserAccountMgr::onCharge(int status,
                              const std::string & orderId, 
                              int amount, 
                              int total) {
    ChargeResult result;
    result.status = status;
    result.orderId = orderId;
    result.amount = amount;
    result.total = total;
    mEventEmitter.FireEvent(EVENT_CHARGED, &result);
}

void UserAccountMgr::onBought(int status,
                              const std::string & orderId, 
                              const std::string & productId,
                              int amount,
                              int total) {
    BuyResult result;
    result.status = status;
    result.orderId = orderId;
    result.productId = productId;
    result.amount = amount;
    result.total = total;
    mEventEmitter.FireEvent(EVENT_BOUGHT, &result);
}

void UserAccountMgr::onBuy(int id, int code) {
}

void UserAccountMgr::onSwitchAccount(int id, int code, const std::string * loginInfo) {
    if (code != CHAMELEON_ERR_OK) {
        CCLog("receive switch account %d", code);
        setLogined();
        return;
    }
    mEventEmitter.FireEvent(EVENT_SWITCH_ACCOUNT, &code);
    verifyLogin(*loginInfo);
}

void UserAccountMgr::onToolbar(int flag) {
}

void UserAccountMgr::onResume() {
    CCLog("on resume");
}

void UserAccountMgr::onAntiAddiction(int id, int code, int flag) {
    mEventEmitter.FireEvent(EVENT_ANTI_ADDICTION_INFO, &flag);
}

void UserAccountMgr::onDestroy(int id) {
    // save user data if needed
    setLogout();
}

int UserAccountMgr::Login() {
    if (mLoginStatus != LOGOUT) {
        return -1;
    }
    mLoginStatus = LOGIN_REQEUST;
    return ChameleonChannelAPI::login(0);
}

int UserAccountMgr::LoginGuest() {
    if (mLoginStatus != LOGOUT) {
        return -1;
    }
    mLoginStatus = LOGIN_REQEUST;
    ChameleonChannelAPI::loginGuest(0);
    return 0;
}

int UserAccountMgr::Charge(int amount) {
    std::unique_ptr<ChargeInfo> info(new ChargeInfo);
    info->uidInGame = mAppUid;
    info->userNameInGame = "test123";
    info->serverId = "1";
    info->currencyName = "撸币";
    info->allowUserChange = false;
    if (amount == 0) {
        info->allowUserChange = true;
    }
    info->currencyCount = amount;
    int cmdSeq = mCmdSeq++;

    JsonHttpClientWrapper client;
    char tmp[32];
    JsonHttpClient::ReqParams reqParams;
    reqParams.push_back(
      JsonHttpClient::RequestParam("session", mSession.c_str()));
    reqParams.push_back(
      JsonHttpClient::RequestParam("appuid", info->uidInGame.c_str()));
    snprintf(tmp, 32, "%d", info->currencyCount);
    reqParams.push_back(
      JsonHttpClient::RequestParam("amount", tmp));
    reqParams.push_back(
      JsonHttpClient::RequestParam("payToken", ChameleonChannelAPI::getPayToken().c_str()));
    int ret = client.Client()->post(
                (DEV_URL + "/v1/charging").c_str(),
                &reqParams,
                NULL,
                std::bind(&UserAccountMgr::onGetChargeInfo, 
                          this, 
                          std::placeholders::_1, 
                          std::placeholders::_2, 
                          std::placeholders::_3, 
                          std::placeholders::_4));
    if (ret == 0) {
        client.SetData(info.release(), 
            JsonHttpClientWrapper::DestroyFunc(
                &JsonHttpClientWrapper::Destroy<ChargeInfo>));
        mHttpClients.push_back(std::move(client));
    }
    return ret;
}

int UserAccountMgr::HeartBeat() {
    CCLog("send heart beat");
    JsonHttpClientWrapper client;
    char tmp[32];
    JsonHttpClient::ReqParams reqParams;
    reqParams.push_back(
      JsonHttpClient::RequestParam("appUid", mAppUid.c_str()));
    reqParams.push_back(
      JsonHttpClient::RequestParam("session", mSession.c_str()));
    int ret = client.Client()->post(
                (DEV_URL + "/v1/heartbeat").c_str(),
                &reqParams,
                NULL,
                std::bind(&UserAccountMgr::onHeartBeat, 
                          this, 
                          std::placeholders::_1, 
                          std::placeholders::_2, 
                          std::placeholders::_3, 
                          std::placeholders::_4));
    if (ret == 0) {
        mHttpClients.push_back(std::move(client));
    }
    return 0;
}

int UserAccountMgr::Buy(const std::string & productId, 
                        int num) {

    auto info = std::unique_ptr<UserAccountMgr::BuyInfo>(new BuyInfo);
    info->uidInGame = mAppUid;
    info->userNameInGame = "12345678";
    info->productName = "尼玛";
    info->productId = productId;
    info->amount = num;

    JsonHttpClientWrapper client;
    char tmp[32];
    JsonHttpClient::ReqParams reqParams;
    reqParams.push_back(
      JsonHttpClient::RequestParam("session", mSession.c_str()));
    reqParams.push_back(
      JsonHttpClient::RequestParam("appuid", mAppUid.c_str()));
    reqParams.push_back(
      JsonHttpClient::RequestParam("productId", info->productId.c_str()));
    snprintf(tmp, 32, "%d", info->amount);
    reqParams.push_back(
      JsonHttpClient::RequestParam("amount", tmp));
    reqParams.push_back(
      JsonHttpClient::RequestParam("payToken", ChameleonChannelAPI::getPayToken().c_str()));

    int ret = client.Client()->post(
                (DEV_URL + "/v1/buying").c_str(),
                &reqParams,
                NULL,
                std::bind(&UserAccountMgr::onGetBuyInfo, 
                          this, 
                          std::placeholders::_1, 
                          std::placeholders::_2, 
                          std::placeholders::_3, 
                          std::placeholders::_4));
    if (ret == 0) {
        client.SetData(info.release(), 
            JsonHttpClientWrapper::DestroyFunc(
                &JsonHttpClientWrapper::Destroy<BuyInfo>));
        mHttpClients.push_back(std::move(client));
    }
    return ret;
}

int UserAccountMgr::SwitchAccount() {
    if (mLoginStatus != LOGINED) {
        return -1;
    }
    if (ChameleonChannelAPI::switchAccount(0) == 0) {
        mLoginStatus = LOGIN_REQEUST;
        return 0;
    } else {
        return -1;
    }
}

int UserAccountMgr::RegistGuest() {
    return ChameleonChannelAPI::registGuest(0, "");
}

void UserAccountMgr::verifyLogin(const std::string & loginInfo) {
    CCLog("fire the events");
    CCLog("login info is  %s", loginInfo.c_str());
    setLogined();
    JsonHttpClientWrapper client;
    std::vector<std::string> customHeader;
    customHeader.push_back("Content-Type: application/json");
    client.Client()->post((DEV_URL + "/v1/login").c_str(),
                loginInfo,
                &customHeader,
                std::bind(&UserAccountMgr::onVerifyLogin, 
                          this, 
                          std::placeholders::_1, 
                          std::placeholders::_2,
                          std::placeholders::_3,
                          std::placeholders::_4));
    mHttpClients.push_back(std::move(client));
}

bool UserAccountMgr::IsSupportSwitchAccount() {
    return ChameleonChannelAPI::isSupportSwtichAccount();
}

void UserAccountMgr::ShowToolBar() {
    if (mIsToolbarCreated) {
        ChameleonChannelAPI::showToolbar(true);
    } else {
        int ret = ChameleonChannelAPI::createAndShowToolbar(0);
        if (ret != 0) {
            CCLog("Fail to create tool bar %d", ret);
            return;
        }
        mIsToolbarCreated = true;
    }
}

void UserAccountMgr::HideToolBar() {
    if (!mIsToolbarCreated) {
        return;
    }
    ChameleonChannelAPI::destroyToolbar();
}

void UserAccountMgr::GetAntiAddictionInfo() {
    ChameleonChannelAPI::antiAddiction(0);
}

void UserAccountMgr::Logout() {
    setLogout(); 
}

void UserAccountMgr::setLogout() {
    mLoginStatus = LOGOUT;
    mUid.clear();
    mSession.clear();
    mEventEmitter.FireEvent(EVENT_LOGOUT, NULL);
}

std::string UserAccountMgr::GetUserInfo() {
    char tmp[4096];
    snprintf(tmp, 4096, "uin = %s, token = %s, platform = %s, name = %s, avatar = %s, expire = %d", 
      mUid.c_str(), mSession.c_str(), mChannel.c_str(), 
      mName.c_str(), mAvartar.c_str(), mExpiresIn);
    return tmp;
}

void UserAccountMgr::onHeartBeat(int code, 
                                 rapidjson::Value * valueRoot, 
                                 JsonHttpClient * client ,
                                 const std::string & body) {
    if (code != 200) {
        CCLog("Fail to verify_login");
        return;
    }
    try {
        int code = GetJsonValue<int>(*valueRoot, "code");
        if (code != 0) {
            CCLog("Fail to login %d", code);
            return;
        }
        rapidjson::Value & heartBeatInfo = 
          GetJsonValue<rapidjson::Value&>(*valueRoot, "body");
        mSession = GetJsonValue<const char *>(heartBeatInfo, "session");
        rapidjson::Value & events = 
          GetJsonValue<rapidjson::Value&>(heartBeatInfo, "events");
        if (!events.IsArray()) {
            throw JsonException("events", "is not array");
        }
        for (size_t i = 0; i < events.Size(); ++i) {
            std::string event = GetJsonValue<const char*>(events[i], "event");
            rapidjson::Value & info = 
                GetJsonValue<rapidjson::Value&>(events[i], "info");
            RespondsToEvents(event, info);
        }
    } catch (JsonException & e) {
        CCLog("%s", e.mErrMsg.c_str());
    }
    RemoveClient(client);
}

void UserAccountMgr::RespondsToEvents(const std::string& event, 
                                      rapidjson::Value & body) {
    auto it = mPlayerEventHandlers.find(event);
    if (it == mPlayerEventHandlers.end()) {
        CCLog("unknown event %s", event.c_str());
        return;
    }
    it->second(body);
}

void UserAccountMgr::onVerifyLogin(int code, 
                                   rapidjson::Value * valueRoot, 
                                   JsonHttpClient * client, 
                                   const std::string & body) {
    CCLog("on verify login");
    if (code != 200) {
        CCLog("Fail to verify_login");
        setLogout();
        return;
    }
    try {
        int code = GetJsonValue<int>(*valueRoot, "code");
        if (code != 0) {
            CCLog("Fail to login %d", code);
            mEventEmitter.FireEvent(EVENT_LOGOUT, &code);
            return;
        }
        rapidjson::Value & loginInfo = 
          GetJsonValue<rapidjson::Value&>(*valueRoot, "body");
        mUid = GetJsonValue<const char *>(loginInfo, "uid");
        mSession = GetJsonValue<const char *>(loginInfo, "session");
        mChannel = GetJsonValue<const char *>(loginInfo, "channel");
        mName = GetJsonValueDefault<const char *>(loginInfo, "name", "nil");
        mAppUid = GetJsonValue<const char *>(loginInfo, "appUid");
        mAvartar = GetJsonValueDefault<const char *>(loginInfo, "avatar", "nil");
        std::string rsp = GetJsonValue<const char *>(loginInfo, "rsp");
        mExpiresIn = GetJsonValueDefault<int>(loginInfo, "expire_in", -1);
        if (!ChameleonChannelAPI::onLoginRsp(rsp)) {
            CCLog("Fail to rsp rsp");
        }
        mEventEmitter.FireEvent(EVENT_LOGINED, NULL);
    } catch (JsonException & e) {
        CCLog("exception %s", e.mErrMsg.c_str());
    }
    RemoveClient(client);
}

void UserAccountMgr::RemoveClient(JsonHttpClient * client) {
    for (size_t i = 0; i < mHttpClients.size(); ++i) {
        if (mHttpClients[i].Client() == client) {
            mHttpClients.erase(mHttpClients.begin()+i);
            break;
        }
    }
}

void UserAccountMgr::onGetChargeInfo(int code, rapidjson::Value * valueRoot, JsonHttpClient * client, const std::string & body) {
    int idx = GetHttpWrapperIdx(client);
    if (idx < 0) {
        CCLog("Fail to find wrapper");
        return;
    }
    ChargeInfo * info = mHttpClients[idx].Data<ChargeInfo>();
    if (info == NULL) {
        CCLog("charge info is NULL");
        return;
    }
    if (code != 200) {
        CCLog("Fail to get charge info");
        info->code = code;
        mEventEmitter.FireEvent(EVENT_CHARGING, info);
        return;
    }
    try {
        do {
            int flag = GetJsonValue<int>(*valueRoot, "code");
            if (flag != 0) {
                info->code = flag;
                break;
            }
            rapidjson::Value & body = 
              GetJsonValue<rapidjson::Value&>(*valueRoot, "body");
            flag = GetJsonValue<int>(body, "code");
            if (flag != 0) {
                info->code = flag;
                break;
            }
            rapidjson::Value & chargeInfo = 
              GetJsonValue<rapidjson::Value&>(body, "chargeInfo");
            info->code = flag;
            info->rate = GetJsonValue<int>(chargeInfo, "ratio");
            info->realPayMoney = GetJsonValue<int>(chargeInfo, "realPayMoney");
            info->serverId = GetJsonValue<const char*>(chargeInfo, "serverId");
            info->orderId = GetJsonValue<const char*>(chargeInfo, "orderId");
            info->payInfo = GetJsonValueDefault<const char*>(chargeInfo, "payInfo", "");
            sendSDKCharge(info);
            mHttpClients[idx].ResetData();
        } while (0);
        mEventEmitter.FireEvent(EVENT_CHARGING, info);
    } catch (JsonException & e) {
        CCLog("%s", e.mErrMsg.c_str());
        info->code = -1;
    }
    mEventEmitter.FireEvent(EVENT_CHARGING, info);
    RemoveClient(client);
}

void UserAccountMgr::onGetBuyInfo(int code, rapidjson::Value * valueRoot, JsonHttpClient * client, const std::string & body) {
    int idx = GetHttpWrapperIdx(client);
    if (idx < 0) {
        CCLog("Fail to find wrapper");
        return;
    }
    BuyInfo * info = mHttpClients[idx].Data<BuyInfo>();
    if (code != 200) {
        CCLog("Fail to get charge info");
        info->code = -1;
        mEventEmitter.FireEvent(EVENT_BUYING, info);
        return;
    }
    try {
        do {
            int flag = GetJsonValue<int>(*valueRoot, "code");
            if (flag != 0) {
                info->code = flag;
                break;
            }
            rapidjson::Value & body = 
                GetJsonValue<rapidjson::Value&>(*valueRoot, "body");
            flag = GetJsonValue<int>(body, "code");
            if (flag != 0) {
                info->code = flag;
                break;
            }
            rapidjson::Value & buyInfo = 
                GetJsonValue<rapidjson::Value&>(body, "buyinfo");
            info->realPayMoney = GetJsonValue<int>(buyInfo, "realPayMoney");
            info->serverId = GetJsonValue<const char*>(buyInfo, "serverId");
            info->orderId = GetJsonValue<const char*>(buyInfo, "orderId");
            info->payInfo = GetJsonValueDefault<const char*>(buyInfo, "payInfo", "");
            sendSDKBuy(info);
            mHttpClients[idx].ResetData();
        } while (0);
        mEventEmitter.FireEvent(EVENT_BUYING, info);
    } catch (JsonException & e) {
        CCLog("%s", e.mErrMsg.c_str());
    }
    RemoveClient(client);
}


int UserAccountMgr::GetHttpWrapperIdx(JsonHttpClient * client) {
    for (size_t i = 0; i < mHttpClients.size(); ++i) {
        if (mHttpClients[i].Client() == client) {
            return i;
        }
    }
    return -1;
}

void UserAccountMgr::sendSDKCharge(UserAccountMgr::ChargeInfo* info) {
    int cmdSeq = mCmdSeq++;
    int ret = ChameleonChannelAPI::charge(cmdSeq,
      info->orderId, info->uidInGame, 
      info->userNameInGame, info->serverId,
      info->currencyName, info->payInfo, info->rate, info->realPayMoney, 
      info->allowUserChange);
    if (ret == 0) {
        AddPendingChargeOrder(cmdSeq, info);
    } else {
        CCLog("Fail to request buy %d", ret);
        return;
    }
}

void UserAccountMgr::AddPendingChargeOrder(int cmdSeq, 
                                           UserAccountMgr::ChargeInfo* info) {
    mPendingChargeInfos[cmdSeq] = std::unique_ptr<ChargeInfo>(info);
}

void UserAccountMgr::AddPendingBuyOrder(int cmdSeq, 
                                           UserAccountMgr::BuyInfo* info) {
    mPendingBuyInfos[cmdSeq] = std::unique_ptr<BuyInfo>(info);
}


void UserAccountMgr::sendSDKBuy(UserAccountMgr::BuyInfo* info) {
    int cmdSeq = mCmdSeq++;
    int ret = ChameleonChannelAPI::buy(cmdSeq, 
      info->orderId, info->uidInGame, info->userNameInGame, 
      info->serverId, info->productName, info->productId, info->payInfo,
      info->amount, info->realPayMoney);
    if (ret == 0) {
        AddPendingBuyOrder(cmdSeq, info);
    } else {
        CCLog("Fail to request buy %d", ret);
        return;
    }
}




