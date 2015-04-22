LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE := cocos2dcpp_shared

LOCAL_MODULE_FILENAME := libcocos2dcpp

LOCAL_SRC_FILES := hellocpp/main.cpp \
                   ../../Classes/AppDelegate.cpp \
                   ../../Classes/MainScene.cpp\
                   ../../Classes/HelloWorldScene.cpp\
                   ../../Classes/UserAccountMgr.cpp \
                   ../../Classes/EventEmitter.cpp \
                   ../../Classes/JsonHttpClient.cpp

LOCAL_C_INCLUDES := $(LOCAL_PATH)/../../Classes

LOCAL_STATIC_LIBRARIES := cocos2dx_static
LOCAL_STATIC_LIBRARIES += cocos2d_simulator_static
LOCAL_SHARED_LIBRARIES := chameleoncb
LOCAL_STATIC_LIBRARIES += box2d_static
LOCAL_STATIC_LIBRARIES += chipmunk_static
LOCAL_STATIC_LIBRARIES += cocos_extension_static

include $(BUILD_SHARED_LIBRARY)
$(call import-add-path, $(LOCAL_PATH)/..)
$(call import-module,./prebuilt-mk)
$(call import-module,chameleoncb/prebuilt/android)
