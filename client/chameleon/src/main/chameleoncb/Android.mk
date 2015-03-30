LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := chameleoncb 
LOCAL_SRC_FILES := api_bind.cpp c_bind.cpp ChannelAPILib.cpp JniHelper.cpp ChannelAPILibC.cpp  
LOCAL_C_INCLUDES := $(LOCAL_PATH)/include
LOCAL_C_INCLUDES += /usr/local/include
LOCAL_LDLIBS := $(LOCAL_PATH)/libluajit.a
LOCAL_LDLIBS += -llog
LOCAL_CFLAGS += -std=c++11 
TARGET_PLATFORM := android-9
include $(BUILD_SHARED_LIBRARY)
