LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := chameleoncb
LOCAL_SRC_FILES := ChannelAPILib.cpp JniHelper.cpp
LOCAL_C_INCLUDES := $(LOCAL_PATH)/include
LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/include
LOCAL_EXPORT_LDLIBS := -llog
LOCAL_CFLAGS += -std=c++11
include $(BUILD_STATIC_LIBRARY)
