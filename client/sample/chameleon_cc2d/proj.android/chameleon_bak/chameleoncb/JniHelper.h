#ifndef __JniHelper_H_
#define __JniHelper_H_

#include <string>
#include <jni.h>

namespace JniHelper {

    template<typename T> 
    class LocalRef {
    public:

        LocalRef(JNIEnv * env, T data) {
            m_data = data;
            m_env = env;
        }

        ~LocalRef() {
            if (m_env && m_data) {
                m_env->DeleteLocalRef(m_data);
            }
        }

        T& Ref() {
            return m_data;
        }

        LocalRef(LocalRef && ref) {
            m_data = ref.m_data;
            m_env = ref.m_env;
            ref.m_data = NULL;
            ref.m_env = NULL;
        }
    private:
        LocalRef(const LocalRef&) = delete;
        const LocalRef& operator=(const LocalRef &) = delete;
        T m_data;
        JNIEnv * m_env;
    };

    template<typename T>
    int doCallJniMethod(JNIEnv * env, jclass clazz, jmethodID mid, T * result, va_list args);

    std::string ConvertByteArray(JNIEnv * env, jbyteArray s);

    typedef LocalRef<jbyteArray> LocalByteArray;
    LocalByteArray ConvertToByteArray(JNIEnv * env, 
      const char * s, size_t len);
}


#endif //__JniHelper_H_
