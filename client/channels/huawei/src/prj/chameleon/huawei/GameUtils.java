package prj.chameleon.huawei;

import android.app.Activity;
import android.util.Log;

import com.android.huawei.pay.plugin.IHuaweiPay;
import com.huawei.deviceCloud.microKernel.core.MicroKernelFramework;
import com.huawei.deviceCloud.microKernel.manager.update.IUpdateNotifier;
import com.huawei.deviceCloud.microKernel.manager.update.info.ComponentInfo;
import com.huawei.gamebox.buoy.sdk.IBuoyOpenSDK;
import com.huawei.gamebox.buoy.sdk.util.BuoyConstant;
import com.huawei.gamebox.buoy.sdk.util.DebugConfig;
import com.huawei.hwid.openapi.out.microkernel.IHwIDOpenSDK;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IDispatcherCb;

class GameUtils {

    /**
     * 初始化微内核
     */
    private static void initMicroKernel(Activity activity) {
        if (GlobalParams.framework == null) {
            // getInstance的参数不能为空，否则会导致后面的逻辑失败
            GlobalParams.framework = MicroKernelFramework
                    .getInstance(activity);
        }
        GlobalParams.framework.start();
    }

    /**
     * 浮标初始化
     */
    public static boolean checkBuoyPluginLoad(Activity activity) {
        initMicroKernel(activity);
        if (GlobalParams.framework != null) {
            GlobalParams.framework.checkSinglePlugin(BuoyConstant.PLUGIN_NAME,
                    new IUpdateNotifier() {
                        @Override
                        public void thereAreNewVersion(ComponentInfo componentInfo, Runnable runnable, boolean b) {

                        }

                        @Override
                        public void startDownload(ComponentInfo componentInfo) {

                        }

                        @Override
                        public void downloading(ComponentInfo componentInfo, long l, long l2) {

                        }

                        @Override
                        public void downloaded(ComponentInfo componentInfo) {

                        }

                        @Override
                        public void localIsRecent(ComponentInfo componentInfo) {

                        }

                        @Override
                        public void downloadFailed(ComponentInfo componentInfo, boolean b, int i) {

                        }
                    });
            List<Object> services = GlobalParams.framework.getService(BuoyConstant.PLUGIN_NAME);
            // 获取插件服务失败，说明尚未加载过插件，重新加载插件并获取服务
            if (null == services || services.isEmpty()) {
                DebugConfig.d(Constants.TAG, "插件" + BuoyConstant.PLUGIN_NAME + "尚未加载");

                DebugConfig.d(Constants.TAG, "开始加载插件" + BuoyConstant.PLUGIN_NAME + "...");
                GlobalParams.framework.loadPlugin(BuoyConstant.PLUGIN_NAME);
                DebugConfig.d(Constants.TAG, "插件" + BuoyConstant.PLUGIN_NAME + "加载完成");
                services = GlobalParams.framework.getService(BuoyConstant.PLUGIN_NAME);
            } else { // 插件已加载
                DebugConfig.d(Constants.TAG, "插件" + BuoyConstant.PLUGIN_NAME + "已加载");
            }

            if (null == services || services.isEmpty()) {
                DebugConfig.d(Constants.TAG, "插件" + BuoyConstant.PLUGIN_NAME + "加载失败");
                return false;
            }

            GlobalParams.hwBuoy = (IBuoyOpenSDK) services.get(0);

            if (null == GlobalParams.hwBuoy) {
                DebugConfig.d(Constants.TAG, "获取服务失败");
                return false;
            }

            DebugConfig.d(Constants.TAG, "获取服务成功");
            return true;
        }
        return false;
    }

    /**
     * 支付初始化
     */
    public static boolean checkPayPluginLoad(Activity activity) {
        initMicroKernel(activity);
        if (null != GlobalParams.framework) {
            GlobalParams.framework.checkSinglePlugin(GlobalParams.HW_PAY_PLUGIN,
                    new IUpdateNotifier() {
                        @Override
                        public void thereAreNewVersion(ComponentInfo componentInfo, Runnable runnable, boolean b) {

                        }

                        @Override
                        public void startDownload(ComponentInfo componentInfo) {

                        }

                        @Override
                        public void downloading(ComponentInfo componentInfo, long l, long l2) {

                        }

                        @Override
                        public void downloaded(ComponentInfo componentInfo) {

                        }

                        @Override
                        public void localIsRecent(ComponentInfo componentInfo) {

                        }

                        @Override
                        public void downloadFailed(ComponentInfo componentInfo, boolean b, int i) {

                        }
                    });
            List<Object> services = GlobalParams.framework.getService(IHuaweiPay.interfaceName);
            // 获取插件服务失败，说明尚未加载过插件，重新加载插件并获取服务
            if (null == services || services.isEmpty()) {
                DebugConfig.d(Constants.TAG, "插件" + GlobalParams.HW_PAY_PLUGIN + "尚未加载");

                DebugConfig
                        .d(Constants.TAG, "开始加载插件" + GlobalParams.HW_PAY_PLUGIN + "...");
                GlobalParams.framework.loadPlugin(GlobalParams.HW_PAY_PLUGIN);
                DebugConfig.d(Constants.TAG, "插件" + GlobalParams.HW_PAY_PLUGIN + "加载完成");
                services = GlobalParams.framework.getService(IHuaweiPay.interfaceName);
            } else { // 插件已加载
                DebugConfig.d(Constants.TAG, "插件" + GlobalParams.HW_PAY_PLUGIN + "已加载");
            }

            if (null == services || services.isEmpty()) {
                DebugConfig.d(Constants.TAG, "插件" + GlobalParams.HW_PAY_PLUGIN + "加载失败");
                return false;
            }

            GlobalParams.hwPay = (IHuaweiPay) services.get(0);

            if (null == GlobalParams.hwPay) {
                DebugConfig.d(Constants.TAG, "获取服务失败");
                return false;
            }

            DebugConfig.d(Constants.TAG, "获取服务成功");
            return true;
        }
        return false;
    }

    /**
     * 账号初始化
     */
    @SuppressWarnings("unchecked")
    public static boolean checkAccountPluginLoad(Activity activity) {
        initMicroKernel(activity);
        if (null != GlobalParams.framework) {
            GlobalParams.framework.checkSinglePlugin(GlobalParams.HW_ID_PLUGIN,
                    new IUpdateNotifier() {
                        @Override
                        public void thereAreNewVersion(ComponentInfo componentInfo, Runnable runnable, boolean b) {

                        }

                        @Override
                        public void startDownload(ComponentInfo componentInfo) {

                        }

                        @Override
                        public void downloading(ComponentInfo componentInfo, long l, long l2) {

                        }

                        @Override
                        public void downloaded(ComponentInfo componentInfo) {

                        }

                        @Override
                        public void localIsRecent(ComponentInfo componentInfo) {

                        }

                        @Override
                        public void downloadFailed(ComponentInfo componentInfo, boolean b, int i) {

                        }
                    });
            List<Object> services = GlobalParams.framework.getService(GlobalParams.HW_ID_PLUGIN);
            // 获取插件服务失败，说明尚未加载过插件，重新加载插件并获取服务
            if (null == services || services.isEmpty()) {
                DebugConfig.d(Constants.TAG, "插件" + GlobalParams.HW_ID_PLUGIN + "尚未加载");

                DebugConfig.d(Constants.TAG, "开始加载插件" + GlobalParams.HW_ID_PLUGIN + "...");
                GlobalParams.framework.loadPlugin(GlobalParams.HW_ID_PLUGIN);
                DebugConfig.d(Constants.TAG, "插件" + GlobalParams.HW_ID_PLUGIN + "加载完成");
                services = GlobalParams.framework
                        .getService(GlobalParams.HW_ID_PLUGIN);
            } else { // 插件已加载
                DebugConfig.d(Constants.TAG, "插件" + GlobalParams.HW_ID_PLUGIN + "已加载");
            }

            if (null == services || services.isEmpty()) {
                DebugConfig.d(Constants.TAG, "插件" + GlobalParams.HW_ID_PLUGIN + "加载失败");
                return false;
            }

            GlobalParams.hwId = (IHwIDOpenSDK) services.get(0);

            if (null == GlobalParams.hwId) {
                DebugConfig.d(Constants.TAG, "获取服务失败");
                return false;
            }

            DebugConfig.d(Constants.TAG, "获取服务成功");
            return true;
        }
        return false;
    }

    public static int mapError(int code) {
        Log.e(Constants.TAG, "huawei return code " + code);
        switch (code) {
            case 0:
                return Constants.ErrorCode.ERR_OK;
            case -1:
                return Constants.ErrorCode.ERR_FAIL;
            case 30000:
                return Constants.ErrorCode.ERR_PAY_CANCEL;
            default:
                return Constants.ErrorCode.ERR_FAIL;
        }
    }

}
