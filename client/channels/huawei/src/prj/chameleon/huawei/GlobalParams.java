package prj.chameleon.huawei;

import com.android.huawei.pay.plugin.IHuaweiPay;
import com.huawei.gamebox.buoy.sdk.IBuoyOpenSDK;
import com.huawei.hwid.openapi.out.microkernel.IHwIDOpenSDK;

public class GlobalParams {

    /**
     * 保存账号信息
     */
    public static IHwIDOpenSDK hwId = null;

    /**
     * 保存支付信息
     */
    public static IHuaweiPay hwPay = null;

    /**
     * 保存浮标信息
     */
    public static IBuoyOpenSDK hwBuoy = null;

    public static final String PAY_RSA_PRIVATE = "MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAjdeJFzQ5fFZDpIKyf5n4UpiV+aommZ3B06SAXX0U+PwsQ68+WnZpFl7YPO1YzJoFE5SuIYOM6Ux1Id0vVZ23zwIDAQABAkA850sp93aneLLatHPIbmg9rt7WsMSaOS68nWmwusCCl7/whM1S1za1gil8kWCmW0KosXG/5m8R/IoKU25C95ohAiEA1nVhMDDC2JGiDYv+MqNJr9ncLjuT8YtHJgeAM4bM/f0CIQCpUTo+IKKzvKkBSXPsV0ZHubOZ54kSGjG9hNyh8L/wuwIfLTyVQ5UFhKkzhagB9qx63p0V1Kq8ijbWyy7J3BSTKQIhAJUob4ynp217d88gbDT6NXmeSG/+nqwJ02PHla47rntdAiEAryI2K6zcq77OCSEIRT4QyuvJKHXfq/be6GrLUH20QUM=";

}
