#include "chameleoncb/ChameleonChannelAPI.h"
#include "chameleoncb/ChannelAPICallbackC.h"
#include "JniHelper.h"



using namespace std;
#include<string>
#define CXXSTR2CPTR(CXXSTR) (CXXSTR == NULL?NULL:CXXSTR->c_str())
/**
Wrapper c implementation of the virtual functions by the C++ interface.
**/
class ChannelAPICallbackCWrapper : public Chameleon::ChannelAPICallbackInf{
    public:
        ChannelAPICallbackInf_C m_adapter;

        ~ChannelAPICallbackCWrapper()
        {
            m_adapter.DestroyChannelAPICallbackInf();
        }

        virtual void onInited(int ret, int isDebug)
        {
            m_adapter.onInited(ret, isDebug);
        }

        virtual void preAccountSwitch()
        {
            m_adapter.preAccountSwitch();
        }

        virtual void afterAccountSwitch(int code, const std::string * loginInfo)
        {
            m_adapter.afterAccountSwitch(code, CXXSTR2CPTR(loginInfo));
        } 
        virtual void onAccountLogout()
        {
            m_adapter.onAccountLogout();
        }

        virtual void onGuestBind(const std::string & loginInfo)
        {
            m_adapter.onGuestBind(loginInfo.c_str());
        }

        virtual void onLoginGuest(int id, int code)
        {
            m_adapter.onLoginGuest(id, code);
        }

        virtual void onRegistGuest(int id, int code, const std::string * loginInfo)
        {
            m_adapter.onRegistGuest(id, code, CXXSTR2CPTR(loginInfo));
        }

        virtual void onLogin(int id, int code, const std::string * loginInfo)
        {
            m_adapter.onLogin(id, code, CXXSTR2CPTR(loginInfo));
        }

        virtual void onCharge(int id, int code)
        {
            m_adapter.onCharge(id, code);
        }

        virtual void onBuy(int id, int code)
        {
            m_adapter.onBuy(id, code);
        }

        virtual void onSwitchAccount(int id, int code, const std::string * loginInfo)
        {
            m_adapter.onSwitchAccount(id, code, CXXSTR2CPTR(loginInfo));
        }

        virtual void onToolbar(int flag)
        {
            m_adapter.onToolbar(flag);
        }

        virtual void onResume()
        {
            m_adapter.onResume();
        }

        virtual void onAntiAddiction(int id, int code, int flag)
        {
            m_adapter.onAntiAddiction(id, code, flag);
        }

        virtual void onExit(int code)
        {
            m_adapter.onExit(code);
        }

        virtual void onRunProtocol(int id, int code, const std::string & protocol,
          const std::string & message)
        {
            m_adapter.onRunProtocol(id, code, protocol.c_str(), message.c_str());
        }
};

ChannelAPICallbackCWrapper g_apiCb;
/**
*   Users should implement all function pointers in ChannelAPICallbackInf_C.
*   define these functions and register them to callbackImp, pass the value to init() as parameter.
**/
#ifdef __cplusplus
extern "C"{
#endif
#include "chameleoncb/ChameleonAPI_export.h"
int init(ChannelAPICallbackInf_C callbackImp) {
    g_apiCb.m_adapter = callbackImp;
    return Chameleon::ChameleonChannelAPI::init(&g_apiCb);
}

void setJavaVM(JavaVM * vm)
{
    Chameleon::ChameleonChannelAPI::setJavaVM(vm);
}

void releaseJavaVM(JavaVM * vm)
{
    Chameleon::ChameleonChannelAPI::releaseJavaVM(vm);
}

void unregisterCallback()
{
    Chameleon::ChameleonChannelAPI::unregisterCallback();
}

int loginGuest(int id)
{
    return Chameleon::ChameleonChannelAPI::loginGuest(id);
}

int registGuest(int id, const char * tips)
{
    return Chameleon::ChameleonChannelAPI::registGuest(id, tips);
}

int login(int id)
{
    return Chameleon::ChameleonChannelAPI::login(id);
}

int logout()
{
    return Chameleon::ChameleonChannelAPI::logout();
}

int charge(int id,
           const char * orderId,
           const char * uidInGame,
           const char * userNameInGame,
           const char * serverId,
           const char * currencyName,
           const char * payInfo,
           int rate,
           int realPayMoney,
           bool allowUserChange)
{
    return Chameleon::ChameleonChannelAPI::charge(id,
                      orderId, uidInGame, userNameInGame, serverId,
                      currencyName, payInfo, rate, realPayMoney, allowUserChange);
}

int buy(int id,
        const char * orderId,
        const char * uidInGame,
        const char * userNameInGame,
        const char * serverId,
        const char * productName,
        const char * productId,
        const char * payInfo,
        int productCount,
        int realPayMoney)
{
    return Chameleon::ChameleonChannelAPI::buy(
    id,
    orderId,
    uidInGame,
    userNameInGame,
    serverId,
    productName,
    productId,
    payInfo,
    productCount,
    realPayMoney
    );
}

bool isSupportSwtichAccount()
{
    return Chameleon::ChameleonChannelAPI::isSupportSwtichAccount();
}

int switchAccount(int id)
{
    return Chameleon::ChameleonChannelAPI::switchAccount(id);
}

int createAndShowToolbar(int position)
{
    return Chameleon::ChameleonChannelAPI::createAndShowToolbar(position);
}

void showToolbar(bool isVisible)
{
    Chameleon::ChameleonChannelAPI::showToolbar(isVisible);
}

void destroyToolbar()
{
    Chameleon::ChameleonChannelAPI::destroyToolbar();
}


int antiAddiction(int id)
{
    return Chameleon::ChameleonChannelAPI::antiAddiction(id);
}

int exit()
{
    return Chameleon::ChameleonChannelAPI::exit();
}

int getChannelName(char * buffer, int BUFFER_LENGTH) //这里要注意字符串返回值是怎么处理的，会不会出现引用临时变量地址的情况？
{
    if( NULL == buffer )
    {
        return 0;
    }
    std::string p = Chameleon::ChameleonChannelAPI::getChannelName();

    strncpy(buffer, p.c_str(), BUFFER_LENGTH);
    return strlen(buffer);
}

int getUid(char * buffer, int BUFFER_LENGTH)
{
    if( NULL == buffer )
    {
        return 0;
    }
    std::string p = Chameleon::ChameleonChannelAPI::getUid();
    strncpy(buffer, p.c_str(), BUFFER_LENGTH);
    return strlen(buffer);

}

int getToken(char * buffer, int BUFFER_LENGTH)
{
    if( NULL == buffer )
    {
        return 0;
    }
    std::string p = Chameleon::ChameleonChannelAPI::getToken();
    strncpy(buffer, p.c_str(), BUFFER_LENGTH);
    return strlen(buffer);
}

int getPayToken(char * buffer, int BUFFER_LENGTH)
{
    if (NULL == buffer)
    {
        return 0;
    }
    std::string p = Chameleon::ChameleonChannelAPI::getPayToken();
    strncpy(buffer, p.c_str(), BUFFER_LENGTH);
    return strlen(buffer);
}

bool onLoginRsp(const char * loginRsp)
{
    return Chameleon::ChameleonChannelAPI::onLoginRsp(loginRsp);
}

int submitPlayerInfo(const char * roleId,
                      const char * roleName,
                      const char * roleLevel,
                      int zoneId,
                      const char * zoneName)
{
    return Chameleon::ChameleonChannelAPI::submitPlayerInfo(
        roleId,
        roleName,
        roleLevel,
        zoneId,
        zoneName
    );
}

bool isLogined()
{
    return Chameleon::ChameleonChannelAPI::isLogined();
}

bool isSupportProtocol(const char * protocol)
{
    return Chameleon::ChameleonChannelAPI::isSupportProtocol(protocol);
}
int runProtocol(int id, const char * protocol, const char * message)
{
    return Chameleon::ChameleonChannelAPI::runProtocol(id, protocol, message);
}
extern int init_callback_binding();
jint JNI_OnLoad(JavaVM *vm, void *reserved){
	setJavaVM(vm);
    //init_callback_binding();
	return JNI_VERSION_1_4;
}
#ifdef __cplusplus
}
#endif
