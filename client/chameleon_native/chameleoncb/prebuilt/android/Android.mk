LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := chameleoncb
LOCAL_MODULE_FILENAME := libchameleoncb
LOCAL_SRC_FILES := $(TARGET_ARCH_ABI)/libchameleoncb.a
LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/../../include
include $(PREBUILT_STATIC_LIBRARY)