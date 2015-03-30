LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := chameleoncb_shared
LOCAL_MODULE_FILENAME := libchameleoncb
LOCAL_SRC_FILES := $(TARGET_ARCH_ABI)/libchameleoncb.so
include $(PREBUILT_SHARED_LIBRARY)