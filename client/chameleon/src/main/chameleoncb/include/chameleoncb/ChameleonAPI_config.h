/**
* Chameleon API used to config this library, invoked by C.
**/

#ifndef __ChameleonAPI_config_C_H_
#define __ChameleonAPI_config_C_H_

#include <jni.h>
#include <string>
#include "ChannelAPICallbackC.h"
#ifdef __cplusplus
extern "C"{
#endif
#include <lua.h>
    /**
     * 设置java的虚拟机实例
     */
    void setJavaVM(JavaVM * vm);

    /**
     * 释放设置的java的虚拟机实例
     */
    void releaseJavaVM(JavaVM * vm);

    /**
     * 重置callback
     */
    void unregisterCallback();

    /**
     * 初始化Chameleon
     * @param {ChannelAPICallbackInf} callbackImp
     */
    int init(ChannelAPICallbackInf_C callbackImp);

    int init_callback_binding();
    int luaopen_chameleoncb(lua_State*L);

#ifdef __cplusplus
}
#endif
#endif
