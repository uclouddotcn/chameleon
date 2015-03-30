#include "JniHelper.h"

#include <android/log.h>

#define  LOG_TAG    "chameleon"
#define  LOGI(...)  __android_log_print(ANDROID_LOG_INFO,LOG_TAG,__VA_ARGS__)
#define  LOGW(...)  __android_log_print(ANDROID_LOG_WARN,LOG_TAG,__VA_ARGS__)
#define  LOGE(...)  __android_log_print(ANDROID_LOG_ERROR,LOG_TAG,__VA_ARGS__)
#define  LOGF(...)  __android_log_print(ANDROID_LOG_FATAL,LOG_TAG,__VA_ARGS__)

namespace JniHelper{

template<>
int doCallJniMethod<void>(JNIEnv * env, jclass clazz, jmethodID mid, void * result, va_list args) {
    env->CallStaticVoidMethodV(clazz, mid, args);
    return 0;
}


template<>
int doCallJniMethod<jobject>(JNIEnv * env, jclass clazz, jmethodID mid, jobject * result, va_list args) {
    *result = env->CallStaticObjectMethodV(clazz, mid, args);
    return 0; 
}

template<>
int doCallJniMethod<bool>(JNIEnv * env, jclass clazz, jmethodID mid, bool * result, va_list args) {
    jboolean r = env->CallStaticBooleanMethodV(clazz, mid, args);
    *result = r == JNI_TRUE;
    return 0; 
}

template<>
int doCallJniMethod<std::string>(JNIEnv * env, jclass clazz, jmethodID mid, std::string * result, va_list args) {
    jbyteArray r = (jbyteArray)env->CallStaticObjectMethodV(clazz, mid, args);
    *result = ConvertByteArray(env, r);
    env->DeleteLocalRef(r);
    return 0; 
}


std::string ConvertByteArray(JNIEnv * env, jbyteArray s) {
    jsize len = env->GetArrayLength(s);
    if (len <= 0) {
        return std::string();
    }
    char* start = (char*)(env->GetByteArrayElements(s, NULL));
    return std::string((char*)start, start+len);
}

LocalByteArray ConvertToByteArray(JNIEnv * env, const char * s, size_t len) {
    jbyteArray byteArray = env->NewByteArray((jsize)len);
    if (byteArray == NULL) {
        jthrowable throwable = env->ExceptionOccurred();
        if (throwable != NULL) {
            LOGE("Fail to allocate new byte array");
        }
        return LocalByteArray(NULL, NULL);
    }
    env->SetByteArrayRegion(byteArray, 0, len, (const jbyte*)s);
    jthrowable throwable = env->ExceptionOccurred();
    if (throwable != NULL) {
        LOGE("index out of bound exception");
        env->DeleteLocalRef(byteArray);
        return LocalByteArray(NULL, NULL);
    }
    return LocalByteArray(env, byteArray);
    
}
// it seems we only use boolean and void as return value now...
};


