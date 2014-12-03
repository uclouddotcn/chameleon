package prj.chameleon.update;

public enum DownladStatus {
    INIT_SPACE_FAILED,//初始化时空间不足
    INIT_OTHERS_DOWNLOADING,//其他正在下载，如正在静默下载时调用手动下载就会返回此参数，并且不会开启下载线程
    INIT_FAILED_NONET,//初始化时下载失败，由于没有网络
    INIT_FAILED_MOBILE,//初始化时下载失败，当前网络为移动数据
    SPACE_FAILED,//空间不足
    DOWNLOAD_START,//下载失败
    DOWNLOAD_RETRY,//下载失败
    DOWNLOAD_FAILED,//下载失败
    DOWNLOAD_FAILED_NONET,//下载失败，由于没有网络
    DOWNLOAD_FAILED_MOBILE,//下载失败，当前网络为移动数据
    DOWNLOAD_CANCEL//下载取消
}
