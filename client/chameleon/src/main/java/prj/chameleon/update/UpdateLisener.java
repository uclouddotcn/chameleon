package prj.chameleon.update;

/**
 * Created by Administrator on 2014/11/25.
 */
public interface UpdateLisener {
    public void onDownload(DownladStatus downladStatus, String msg);
    public void onDownloading(int downloadedSize, int totalSize);
    public void onFinish(String savePath, String apkName);
}
