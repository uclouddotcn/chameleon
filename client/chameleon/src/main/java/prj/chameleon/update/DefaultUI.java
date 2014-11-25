package prj.chameleon.update;

import android.app.AlertDialog;
import android.app.Dialog;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.view.KeyEvent;

public class DefaultUI implements UpdateLisener {

    private Context context;
    private int resId ;
    private UpdateManager downloadManager ;
    public ProgressDialog downloadProgress;
    public DefaultUILisener callbake;
    private boolean mIsSetMax = false;

    public DefaultUI(Context context, int resId, String downloadUrl, String md5, int threadCount){
        this.context = context;
        this.resId = resId;
        this.downloadManager = new UpdateManager(context, downloadUrl, md5, threadCount);
    }

    public void startDownload(DefaultUILisener cb){
        this.callbake = cb;
        downloadManager.downloadUpdate(this);
        showProgressDialog();
    }

    //进度条 正常下载开始的入口
    private void showProgressDialog(){
        downloadProgress = new ProgressDialog(context);
        downloadProgress.setIcon(resId);
        downloadProgress.setTitle("下载进度：");
        downloadProgress.setProgressStyle(ProgressDialog.STYLE_HORIZONTAL);
        downloadProgress.setCanceledOnTouchOutside(false);
        downloadProgress.setButton(DialogInterface.BUTTON_NEGATIVE, "取消", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                downloadManager.cancelDownload();
                dialog.dismiss();
            }
        });
        downloadProgress.setOnKeyListener(new DialogInterface.OnKeyListener() {
            @Override
            public boolean onKey(DialogInterface dialog, int keyCode, KeyEvent event) {
                if (keyCode == KeyEvent.KEYCODE_BACK) {
                    return true;
                } else {
                    return false;
                }
            }
        });
        downloadProgress.show();
    }

    private void showDialog(String title, String message, String posbtn,final boolean isOutSide, final boolean isCompel) {
        if (downloadProgress != null){
            downloadProgress.dismiss();
        }
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        builder.setTitle(title);
        builder.setMessage(message);
        builder.setIcon(resId);
        builder.setCancelable(false);
        builder.setPositiveButton(posbtn, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                if (isCompel){
                    downloadManager.compelDownload();
                    downloadProgress.show();
                }else {
                    if (isOutSide){
                        downloadManager.downloadUpdate(DefaultUI.this);
                    }else {
                        downloadManager.retryDownload();
                        downloadProgress.show();
                    }
                }
                dialog.dismiss();
            }
        });
        builder.setNegativeButton("取消", new DialogInterface.OnClickListener() {

            @Override
            public void onClick(DialogInterface dialog, int which) {
                downloadManager.clearDownload();
                dialog.dismiss();
                callbake.onCancel("下载失败取消重试！");
            }
        });
        Dialog noticeDialog = builder.create();
        noticeDialog.show();
    }

    @Override
    public void onDownload(DownladStatus downladStatus, String msg) {
        switch(downladStatus){
            case INIT_SPACE_FAILED:
                showDialog("更新提示：", "空间不足，请清理后重试！", "重试", true, false);
                break;
            case INIT_OTHERS_DOWNLOADING:
                break;
            case INIT_FAILED_NONET:
                showDialog("更新提示：", "当前没有网络环境，请检查网络设置后重试！", "重试", true, false);
                break;
            case INIT_FAILED_MOBILE:
                showDialog("更新提示：", "当前不是WIFI环境，是否继续下载？", "是", true, true);
                break;
            case SPACE_FAILED:
                showDialog("更新提示：", "SD卡空间已满，请清除后重试！","重试" , false, false);
                break;
            case DOWNLOAD_FAILED:
                showDialog("更新提示：", "下载失败，请重试！","重试" , false, false);
                break;
            case DOWNLOAD_FAILED_NONET:
                showDialog("网络环境提示：", "当前没有网络环境，请检查网络设置后重试！","重试" , false, false);
                break;
            case DOWNLOAD_FAILED_MOBILE:
                showDialog("网络环境更换提示：", "当前不是WIFI环境，是否继续下载？", "是", false, true);
                break;
            case DOWNLOAD_START:
                break;
            case DOWNLOAD_RETRY:
                break;
            case DOWNLOAD_CANCEL:
                callbake.onCancel("下载中取消！");
                break;
            default:
                break;
        }
    }

    @Override
    public void onDownloading(int downloadedSize, int totalSize) {
        if (!mIsSetMax) {
            downloadProgress.setMax(totalSize);
            mIsSetMax = false;
        }
        downloadProgress.setProgress(downloadedSize);
    }

    @Override
    public void onFinish(String savePath, String apkName) {
        callbake.onFinish(savePath, apkName);
    }
}
