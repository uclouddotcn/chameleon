#include "ChannelAPINative.h"

#include <assert.h>
#include <stdlib.h>

#include <android/log.h>

#include "chameleoncb/ChameleonErrorCode.h"
#include "chameleoncb/ChameleonChannelAPI.h"
#include "chameleoncb/ChannelAPICallback.h"
#include "JniHelper.h"

using namespace Chameleon;

#define  LOG_TAG    "chameleon"
#define  LOGD(...)  __android_log_print(ANDROID_LOG_DEBUG,LOG_TAG,__VA_ARGS__)
#define  LOGI(...)  __android_log_print(ANDROID_LOG_INFO,LOG_TAG,__VA_ARGS__)
#define  LOGW(...)  __android_log_print(ANDROID_LOG_WARN,LOG_TAG,__VA_ARGS__)
#define  LOGE(...)  __android_log_print(ANDROID_LOG_ERROR,LOG_TAG,__VA_ARGS__)
#define  LOGF(...)  __android_log_print(ANDROID_LOG_FATAL,LOG_TAG,__VA_ARGS__)

static const char * PLATFORMAPI_CLASS = "prj/chameleon/channelapi/cbinding/NativeChannelInterface";

static std::string g_channelName;

class ChannelAPILib {
public:
    ChannelAPILib(): mJavaVM(NULL) {
    }

    JNIEnv * GetEnv() {
        JNIEnv * env = NULL;
        jint ret = mJavaVM->GetEnv((void**)&env, JNI_VERSION_1_4);
        if (ret != JNI_OK) {
            LOGE("VM is not attached in this thread!!!");
            return NULL;      
        }
        return env;
    }
    JavaVM* mJavaVM;
    ChannelAPICallbackInf* mCb;
};

ChannelAPILib  g_apiLib;

enum {
    FUNC_ID_LOGIN_GUEST = 0,
    FUNC_ID_REGIST_GUEST,
    FUNC_ID_LOGIN,
    FUNC_ID_CHARGE,
    FUNC_ID_BUY,
    FUNC_ID_LOGOUT,
    FUNC_ID_IS_SUPPORT_SA,
    FUNC_ID_SWITCH_ACCOUNT,
    FUNC_ID_CREATE_TOOLBAR,
    FUNC_ID_SHOW_TOOLBAR,
    FUNC_ID_DESTROY_TOOLBAR,
    FUNC_ID_ANTI_ADDICTION,
    FUNC_ID_EXIT,
    FUNC_ID_GET_CHANNEL,
    FUNC_ID_RUN_PROTOCOL,
    FUNC_ID_GET_UID,
    FUNC_ID_GET_TOKEN,
    FUNC_ID_IS_LOGINED,
    FUNC_ID_GET_PAYTOKEN,
    FUNC_ID_ONLOGINRSP,
    FUNC_ID_SUBMIT_PLAYER_INFO,
    FUNC_ID_INIT,
    FUNC_ID_COUNT
};

static const char *FUNC_TYPE[][2] = {
    {"loginGuest", "(I)V"},                            // loginGuest
    {"registGuest", "(I[B)Z"},        // registGuest
    {"login", "(I)V"},                                 // login
    {"charge", "(I[B[B[B[B[B[BIIZ)V"},  // charge
    {"buy", "(I[B[B[B[B[B[B[BII)V"}, // buy
    {"logout", "()V"},
    {"isSupportSwitchAccount", "()Z"},
    {"switchAccount", "(I)V"},
    {"createAndShowToolBar", "(I)V"},
    {"showFloatBar", "(Z)V"},
    {"destroyToolBar", "()V"},
    {"antiAddiction", "(I)V"},
    {"exit", "()V"},
    {"getChannelName", "()[B"},
    {"runProtocol", "(I[B[B)V"},
    {"getUid", "()[B"},
    {"getToken", "()[B"},
    {"isLogined", "()Z"},
    {"getPayToken", "()[B"},
    {"onLoginRsp", "([B)Z"},
    {"submitPlayerInfo", "([B[B[BI[B)V"},
    {"init", "()V"}
};

template<typename T>
int callJniMethod(JNIEnv * env, int funcCode, T* result, ...) {
    assert(funcCode >= 0 && funcCode < FUNC_ID_COUNT);
    jclass cplatformAPI = env->FindClass(PLATFORMAPI_CLASS);
    if (cplatformAPI == NULL) {
        LOGF("fail to find class");
        return -1;
    }
    jmethodID mid = env->GetStaticMethodID(cplatformAPI, FUNC_TYPE[funcCode][0], FUNC_TYPE[funcCode][1]);
    if (mid == NULL) {
        LOGF("fail to find static method %s", FUNC_TYPE[funcCode][0]);
        return -1;
    }
    va_list args;
    va_start(args, result);
    int ret = JniHelper::doCallJniMethod<T>(env, cplatformAPI, mid, result, args);
    jthrowable throwable = env->ExceptionOccurred();
    if (throwable != NULL) {
        LOGE("encounter java exception");
        return -1;
    }
    return ret;
}


JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_init
  (JNIEnv * env, jclass clazz, jint ret, jboolean isDebug, jbyteArray platformName) {
    if (ret != 0) {
        if (!g_apiLib.mCb) {
            LOGW("There is not callback registered");
            return;
        }
        g_apiLib.mCb->onInited(ret, isDebug);
        return;
    }
    jclass cplatformAPI = env->FindClass(PLATFORMAPI_CLASS);
    if (cplatformAPI == NULL) {
        jthrowable throwable = env->ExceptionOccurred();
        env->ExceptionClear();
        if (throwable == NULL) {
            env->Throw(throwable);
        } else {
            env->ThrowNew(env->FindClass("java/lang/Exception"), "Fail to get CPlatformAPILib");
        }
        return;
    }
    for (int i = 0; i < FUNC_ID_COUNT; ++i) {
        jmethodID mid = env->GetStaticMethodID(cplatformAPI, FUNC_TYPE[i][0], FUNC_TYPE[i][1]);
        jthrowable throwable = env->ExceptionOccurred();
        if (throwable != NULL) {
            env->ExceptionClear();
            env->Throw(throwable);
            return;
        } 
    }
    g_channelName = JniHelper::ConvertByteArray(env, platformName);
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    g_apiLib.mCb->onInited(ret, isDebug);
    LOGE("get platform name %s", g_channelName.c_str());
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_preAccountSwitch(JNIEnv * env, jclass clazz) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    g_apiLib.mCb->preAccountSwitch();
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_afterAccountSwitch(JNIEnv * env, jclass clazz, jint code, jbyteArray loginInfo) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    if (code != 0) {
        g_apiLib.mCb->afterAccountSwitch(code, NULL); 
    }
    std::string sLoginInfo = JniHelper::ConvertByteArray(env, loginInfo);
    g_apiLib.mCb->afterAccountSwitch(0, &sLoginInfo); 
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onAccountLogout(JNIEnv * env, jclass clazz) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    g_apiLib.mCb->onAccountLogout(); 
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onGuestBind (JNIEnv * env, jclass clazz, jbyteArray loginInfo) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    std::string sLoginInfo = JniHelper::ConvertByteArray(env, loginInfo);
    g_apiLib.mCb->onGuestBind(sLoginInfo); 
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onLoginGuest(JNIEnv *, jclass, jint id, jint code) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    g_apiLib.mCb->onLoginGuest(id, code);
}


JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onLogin(JNIEnv * env, jclass clazz, jint id, jint code, jbyteArray loginInfo) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    if (code == Chameleon::CHAMELEON_ERR_OK ) {
        std::string sLoginInfo = JniHelper::ConvertByteArray(env, loginInfo);
        g_apiLib.mCb->onLogin(id, code, &sLoginInfo); 
    } else {
        g_apiLib.mCb->onLogin(id, code, NULL); 
    }
    LOGD("after callback on login");
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onRegistGuest(JNIEnv * env, jclass clazz, jint id, jint code, jbyteArray loginInfo) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    std::string sLoginInfo = JniHelper::ConvertByteArray(env, loginInfo);
    g_apiLib.mCb->onRegistGuest(id, code, &sLoginInfo); 
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onCharge(JNIEnv *, jclass, jint id, jint code) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    g_apiLib.mCb->onCharge(id, code); 
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onBuy(JNIEnv *, jclass, jint id, jint code) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    g_apiLib.mCb->onBuy(id, code); 
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onSwitchAccount(JNIEnv * env, jclass clazz, jint id, jint code, jbyteArray loginInfo) {
    LOGE("switch account user %d", code);
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    if (code == Chameleon::CHAMELEON_ERR_OK ) {
        std::string sLoginInfo = JniHelper::ConvertByteArray(env, loginInfo);
        g_apiLib.mCb->onSwitchAccount(id, code, &sLoginInfo); 
    } else {
        g_apiLib.mCb->onSwitchAccount(id, code, NULL); 
    }
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onPause(JNIEnv *, jclass) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    g_apiLib.mCb->onResume();
}

void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onExit(JNIEnv *, jclass, jint code) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    g_apiLib.mCb->onExit((int)code);
}


JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onAntiAddiction(JNIEnv *, jclass, jint id, jint code, jint flag) {
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }
    g_apiLib.mCb->onAntiAddiction(id, code, flag);
}

JNIEXPORT void JNICALL Java_prj_chameleon_channelapi_cbinding_ChannelAPINative_onProtocolDone
  (JNIEnv * env, jclass, jint id, jint code, jbyteArray protocol, jbyteArray message) {
    
    if (!g_apiLib.mCb) {
        LOGW("There is not callback registered");
        return;
    }

    if (code == Chameleon::CHAMELEON_ERR_OK) {
        std::string strProtocol = JniHelper::ConvertByteArray(env, protocol);
        std::string strMessage = JniHelper::ConvertByteArray(env, message);
        g_apiLib.mCb->onRunProtocol(id, code, strProtocol, strMessage);
    } else {
        g_apiLib.mCb->onRunProtocol(id, code, "", "");
    }

}


/////////////////////////////// ChameleonChannelAPI 
namespace Chameleon {
namespace ChameleonChannelAPI {
int init(ChannelAPICallbackInf * callbackImp) {
    g_apiLib.mCb = callbackImp;
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    return callJniMethod(env, FUNC_ID_INIT, result);
}

void unregisterCallback() {
    g_apiLib.mCb = NULL;
}

int loginGuest(int id) {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    return callJniMethod(env, FUNC_ID_LOGIN_GUEST, result, (jint)id);
}

int registGuest(int id, const std::string & tips) {
    bool result = false;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    JniHelper::LocalByteArray jTips = 
        JniHelper::ConvertToByteArray(env, tips.c_str(), tips.size());
    callJniMethod(env, FUNC_ID_REGIST_GUEST, &result, (jint)id, jTips.Ref());
    return result;
}

int login(int id) {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    return callJniMethod(env, FUNC_ID_LOGIN, result, (jint)id);
}

int logout() {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    return callJniMethod(env, FUNC_ID_LOGOUT, result);
}

int charge(int id, 
           const std::string & orderId, 
           const std::string & uidInGame, 
           const std::string & userNameInGame, 
           const std::string & serverId, 
           const std::string & currencyName, 
           const std::string & payInfo, 
           int rate,
           int realPayMoney,
           bool allowUserChange) {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    JniHelper::LocalByteArray jOrderId = 
        JniHelper::ConvertToByteArray(env, orderId.c_str(), orderId.size());
    JniHelper::LocalByteArray jUidInGame = 
        JniHelper::ConvertToByteArray(env, uidInGame.c_str(), uidInGame.size());
    JniHelper::LocalByteArray jUserNameInGame = 
        JniHelper::ConvertToByteArray(env, userNameInGame.c_str(), userNameInGame.size());
    JniHelper::LocalByteArray jServerId = 
        JniHelper::ConvertToByteArray(env, serverId.c_str(), serverId.size());
    JniHelper::LocalByteArray jCurrencyName = 
        JniHelper::ConvertToByteArray(env, currencyName.c_str(), currencyName.size());
    JniHelper::LocalByteArray jPayInfo = 
        JniHelper::ConvertToByteArray(env, payInfo.c_str(), payInfo.size());
    return callJniMethod(env,
                         FUNC_ID_CHARGE, 
                         result, 
                         (jint)id,
                         jOrderId.Ref(), 
                         jUidInGame.Ref(),
                         jUserNameInGame.Ref(),
                         jServerId.Ref(),
                         jCurrencyName.Ref(),
                         jPayInfo.Ref(),
                         (jint)rate,
                         (jint)realPayMoney,
                         allowUserChange ? JNI_TRUE : JNI_FALSE);
}

int buy(int id,
        const std::string & orderId, 
        const std::string & uidInGame, 
        const std::string & userNameInGame, 
        const std::string & serverId, 
        const std::string & productName, 
        const std::string & productId,
        const std::string & payInfo,
        int productCount,
        int realPayMoney) {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    JniHelper::LocalByteArray jOrderId = 
        JniHelper::ConvertToByteArray(env, orderId.c_str(), orderId.size());
    JniHelper::LocalByteArray jUidInGame = 
        JniHelper::ConvertToByteArray(env, uidInGame.c_str(), uidInGame.size());
    JniHelper::LocalByteArray jUserNameInGame = 
        JniHelper::ConvertToByteArray(env, userNameInGame.c_str(), userNameInGame.size());
    JniHelper::LocalByteArray jServerId = 
        JniHelper::ConvertToByteArray(env, serverId.c_str(), serverId.size());
    JniHelper::LocalByteArray jProductName = 
        JniHelper::ConvertToByteArray(env, productName.c_str(), productName.size());
    JniHelper::LocalByteArray jProductId = 
        JniHelper::ConvertToByteArray(env, productId.c_str(), productId.size());
    JniHelper::LocalByteArray jPayInfo = 
        JniHelper::ConvertToByteArray(env, payInfo.c_str(), payInfo.size());
    return callJniMethod(env,
                         FUNC_ID_BUY, 
                         result, 
                         (jint)id,
                         jOrderId.Ref(), 
                         jUidInGame.Ref(),
                         jUserNameInGame.Ref(),
                         jServerId.Ref(),
                         jProductName.Ref(),
                         jProductId.Ref(),
                         jPayInfo.Ref(),
                         (jint)productCount,
                         (jint)realPayMoney);
}

bool isSupportSwtichAccount() {
    bool result = false;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    callJniMethod(env, FUNC_ID_IS_SUPPORT_SA, &result);
    return result;
}

int switchAccount(int id) {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    return callJniMethod(env, FUNC_ID_SWITCH_ACCOUNT, result, (jint)id);
}

int createAndShowToolbar(int position) {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    callJniMethod(env, FUNC_ID_CREATE_TOOLBAR, result, (jint)position);
    return 0;
}

void showToolbar(bool isVisible) {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return;
    }
    callJniMethod(env, FUNC_ID_CREATE_TOOLBAR, result, isVisible ? JNI_TRUE : JNI_FALSE);
}

void destroyToolbar() {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return;
    }
    callJniMethod(env, FUNC_ID_DESTROY_TOOLBAR, result);
}

int antiAddiction(int id) {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    return callJniMethod(env, FUNC_ID_ANTI_ADDICTION, result, (jint)id);
}

int exit() {
    void * result = NULL;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return -1;
    }
    return callJniMethod(env, FUNC_ID_EXIT, result);
}

void setJavaVM(JavaVM * vm) {
    g_apiLib.mJavaVM = vm;
}

void releaseJavaVM(JavaVM * vm) {
    if (g_apiLib.mJavaVM == vm) {
        g_apiLib.mJavaVM = NULL;
    }
}


std::string getChannelName() {
    LOGE("channel name %s", g_channelName.c_str());
    return g_channelName;
}

std::string getUid() {
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return "";
    }
    std::string uid;
    int ret = callJniMethod(env, FUNC_ID_GET_UID, &uid);
    if (ret == 0) {
        return uid;
    } else {
        return "";
    }
}

std::string getToken() {
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return "";
    }
    std::string token;
    int ret = callJniMethod(env, FUNC_ID_GET_TOKEN, &token);
    if (ret == 0) {
        return token;
    } else {
        return "";
    }
}

std::string getPayToken() {
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return "";
    }
    std::string token;
    int ret = callJniMethod(env, FUNC_ID_GET_PAYTOKEN, &token);
    if (ret == 0) {
        return token;
    } else {
        return "";
    }
}

bool isLogined() {
    bool result = false;
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return false;
    }
    callJniMethod(env, FUNC_ID_IS_LOGINED, &result);
    return result;
}

bool onLoginRsp (const std::string & rsp) {
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return "";
    }
    bool result;
    JniHelper::LocalByteArray jRsp = 
        JniHelper::ConvertToByteArray(env, rsp.c_str(), rsp.size());
    int ret = callJniMethod(env, FUNC_ID_ONLOGINRSP, &result, jRsp.Ref());
    if (ret == 0) {
        return result;
    } else {
        return false;
    }
}

bool submitPlayerInfo(const std::string & roleId, 
                      const std::string & roleName, 
                      const std::string & roleLevel, 
                      int zoneId,
                      const std::string & zoneName){
    JNIEnv * env = g_apiLib.GetEnv();
    if (env == NULL) {
        return "";
    }
    void * result = NULL;
    JniHelper::LocalByteArray jRoleId = 
        JniHelper::ConvertToByteArray(env, roleId.c_str(), roleId.size());
    JniHelper::LocalByteArray jRoleName = 
        JniHelper::ConvertToByteArray(env, roleName.c_str(), roleName.size());
    JniHelper::LocalByteArray jRoleLevel = 
        JniHelper::ConvertToByteArray(env, roleLevel.c_str(), roleLevel.size());
    JniHelper::LocalByteArray jZoneName = 
        JniHelper::ConvertToByteArray(env, zoneName.c_str(), zoneName.size());
    int ret = callJniMethod(env, FUNC_ID_SUBMIT_PLAYER_INFO, result, 
        jRoleId.Ref(), jRoleName.Ref(), jRoleLevel.Ref(), (jint)zoneId, jZoneName.Ref());
    if (ret == 0) {
        return true;
    } else {
        return false;
    }
}


}  // ChameleonChannelAPI
}  // Chameleon


