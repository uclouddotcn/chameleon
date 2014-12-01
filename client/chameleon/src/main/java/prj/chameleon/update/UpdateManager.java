package prj.chameleon.update;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Message;
import android.util.Log;

import java.io.File;
import java.io.FileFilter;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;

public class UpdateManager
{
    private static String TAG = UpdateManager.class.getSimpleName();

    private static final int DOWNLOAD = 1;
    private static final int DOWNLOAD_FINISH = 2;
    private static final int DOWNLOAD_FAILED = 3;
    private static final int DOWNLOAD_FAILED_NONET = 4;
    private static final int DOWNLOAD_FAILED_MOBILE = 5;
    private static final int SPACE_FAILED = 6;
    private static final int DOWNLOAD_CANCEL = 7;

    private final FileDownLoader mFileDownLoader = new FileDownLoader();
    private Handler mHandler = new DownloadManagerHandler(this);

    private DownloadApkThread mDownloadApkThread = null;
    private NetBroadcastReceiver mNetBroadcastReceiver = null;
    private FileService mFileService = null;

    private Context mContext;//上下文环境
    private String mDownloadUrl;//要下载的url
    private String mMd5;//md5
    private int mThreadCount = 5;//worker线程数量
    private String mApkName;//apk文件名
    private String mSaveDestPath;//保存路径
    private int mDownloadedSize;//下载的大小
    private int mTotalSize = 0;//文件总大小

    private UpdateLisener mDownloadLisener;//下载监听器


    public UpdateManager(Context context, String downloadUrl, String md5, int threadCount){
        this.mContext = context;
        this.mDownloadUrl = downloadUrl;
        this.mMd5 = md5;
        this.mThreadCount = threadCount;
        this.mApkName = this.getPathName(downloadUrl);
    }

    //正常下载开放接口
    public void downloadUpdate(UpdateLisener downloadLisener){
        this.mDownloadLisener = downloadLisener;
        if (mDownloadApkThread != null){
            if (downloadLisener != null)
                mDownloadLisener.onDownload(DownladStatus.INIT_OTHERS_DOWNLOADING, "");
            return;
        }

        switch (NetStatusTool.getConnectedType(mContext)){
            case ConnectivityManager.TYPE_WIFI:
                startDownload(false);
                break;
            case ConnectivityManager.TYPE_MOBILE:
                if (mDownloadLisener != null)
                    mDownloadLisener.onDownload(DownladStatus.INIT_FAILED_MOBILE, "");
                break;
            case -1:
                if (mDownloadLisener != null)
                    mDownloadLisener.onDownload(DownladStatus.INIT_FAILED_NONET, "");
                break;
            default:
                if (mDownloadLisener != null)
                    mDownloadLisener.onDownload(DownladStatus.INIT_FAILED_NONET, "");
                break;
        }
    }

    //静默下载开放接口
    public void downloadUpdateSilent(UpdateLisener downloadLisener){
        this.mDownloadLisener = downloadLisener;
        mNetBroadcastReceiver = new NetBroadcastReceiver(mContext, this);
        IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(ConnectivityManager.CONNECTIVITY_ACTION);
        mContext.registerReceiver(mNetBroadcastReceiver, intentFilter);
    }

    //静默下载开始
    void downloadSilentStart(){
        if (mDownloadApkThread != null && mDownloadLisener != null){
            mDownloadLisener.onDownload(DownladStatus.INIT_OTHERS_DOWNLOADING, "");
            return;
        }
        retryDownload();
        Log.i(TAG, "静默下载，开始下载。。。");
    }

    //取消静默下载
    public void downloadSilentCancel(){
        if (mNetBroadcastReceiver != null) {
            cancelDownload();
            mContext.unregisterReceiver(mNetBroadcastReceiver);
            mNetBroadcastReceiver = null;
        }
    }

    //下载重试
    public void retryDownload(){
        if (mFileDownLoader.hasData()){
            //只有当downloader中有数据时才去执行真正的retry
            startDownload(true);
        }else {
            startDownload(false);
        }
    }

    //强制下载
    public void compelDownload(){
        mFileDownLoader.setCompel(true);
        startDownload(true);
    }

    //取消下载
    public void cancelDownload(){
        clearTheadFlag();
        mFileDownLoader.setCancel();
    }

    //清除下载记录
    public void clearDownload(){
        clearData();
        clearTheadFlag();
    }

    //apk安装
    public static void installApk(Context context, String savePath, String apkName){
        File apkfile = new File(savePath, apkName);
        if (!apkfile.exists()){
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(Uri.parse("file://" + apkfile.toString()), "application/vnd.android.package-archive");
        context.startActivity(intent);
    }

    //开始下载  isretry  是否是重试
    private void startDownload(boolean isRetry){
        if (mDownloadApkThread == null){
            mDownloadApkThread = new DownloadApkThread(isRetry);
            mDownloadApkThread.start();
            if (isRetry){
                if (mDownloadLisener != null){
                    mDownloadLisener.onDownload(DownladStatus.DOWNLOAD_RETRY, "");
                }
            }else {
                if (mDownloadLisener != null){
                    mDownloadLisener.onDownload(DownladStatus.DOWNLOAD_START, "");
                }
            }
            Log.i(TAG, "开始下载。。。");
        }else {
            Log.i(TAG, "正在下载其他。。。");
        }
    }

    private class DownloadApkThread extends Thread {
        private boolean isRetry = false;

        public DownloadApkThread(boolean isRetry){
            this.isRetry = isRetry;
        }

        @Override
        public void run() {
            if (!isRetry)
                clearData();
            retryApkDownload();
        }
    }

    private synchronized void clearData(){
        mSaveDestPath = Environment.getExternalStorageDirectory() + "/download";
        File saveFile = new File(mSaveDestPath);
        if(!saveFile.exists()){
            saveFile.mkdir();
        }
        try{
            File[] apkFiles = saveFile.listFiles(new FileFilter() {
                @Override
                public boolean accept(File pathname) {
                    return pathname.getName().endsWith("apk");
                }
            });
            for (File file : apkFiles) {
                file.delete();
            }
        }catch(Throwable e){
        }
        // FileService new
        if(mFileService == null){
            this.mFileService =new FileService(mContext);
        }
        // FileService delete data clear
        mFileService.delete(mDownloadUrl);
        mFileDownLoader.clearData();
    }

    private synchronized void retryApkDownload(){
        if (mFileService == null){
            this.mFileService =new FileService(mContext);
        }
        final int downloadingSize = mFileDownLoader.init(mContext, mDownloadUrl, mSaveDestPath + File.separator + (mApkName), mThreadCount, mFileService);
        if(downloadingSize == -1){
            mHandler.sendEmptyMessage(SPACE_FAILED);
            return;
        }else if(downloadingSize == 0){
            mHandler.sendEmptyMessage(DOWNLOAD_FAILED);
            return;
        }else {
            mTotalSize = downloadingSize / 1000;

            int retSize = mFileDownLoader.download(new ProgressLisener() {
                @Override
                public void onDownloadSize(int size) {
                    mDownloadedSize = size / 1000;
                    mHandler.sendEmptyMessage(DOWNLOAD);
                }
            }, mContext);

            if(retSize == -100){
                mHandler.sendEmptyMessage(DOWNLOAD_CANCEL);
            }else if (retSize == -101){
                mHandler.sendEmptyMessage(DOWNLOAD_FAILED_NONET);
            }else if (retSize == -102){
                mHandler.sendEmptyMessage(DOWNLOAD_FAILED_MOBILE);
            }else if(retSize < mTotalSize){
                mHandler.sendEmptyMessage(DOWNLOAD_FAILED);
            }else{
                mHandler.sendEmptyMessage(DOWNLOAD_FINISH);
            }
        }
    }

    static class DownloadManagerHandler extends Handler
    {
        private UpdateManager manager;

        public DownloadManagerHandler(UpdateManager manager){
            this.manager = manager;
        }

        public void handleMessage(Message msg)
        {
            switch (msg.what)
            {
                case DOWNLOAD:
                    if (manager.mDownloadLisener != null)
                        manager.mDownloadLisener.onDownloading(manager.mDownloadedSize, manager.mTotalSize);
                    Log.e(TAG, "downloading:  " + (manager.mDownloadedSize) + "K/" + (manager.mTotalSize) + "K");
                    break;
                case DOWNLOAD_FINISH:
                    manager.clearThead();
                    if (manager.md5Check(new File(manager.mSaveDestPath, manager.mApkName))){
                        if (manager.mDownloadLisener != null)
                            manager.mDownloadLisener.onFinish(manager.mSaveDestPath, manager.mApkName);
                    }else {
                        manager.clearData();
                        if (manager.mDownloadLisener != null)
                            manager.mDownloadLisener.onDownload(DownladStatus.DOWNLOAD_FAILED, "");
                    }
                    break;
                case DOWNLOAD_FAILED:
                    manager.clearThead();
                    if (manager.mDownloadLisener != null)
                        manager.mDownloadLisener.onDownload(DownladStatus.DOWNLOAD_FAILED, "");
                    break;
                case SPACE_FAILED:
                    manager.clearThead();
                    if (manager.mDownloadLisener != null)
                        manager.mDownloadLisener.onDownload(DownladStatus.SPACE_FAILED, "");
                    break;
                case DOWNLOAD_FAILED_NONET:
                    manager.clearThead();
                    if (manager.mDownloadLisener != null)
                        manager.mDownloadLisener.onDownload(DownladStatus.DOWNLOAD_FAILED_NONET, "");
                    break;
                case DOWNLOAD_FAILED_MOBILE:
                    manager.clearThead();
                    if (manager.mDownloadLisener != null)
                        manager.mDownloadLisener.onDownload(DownladStatus.DOWNLOAD_FAILED_MOBILE, "");
                    break;
                case DOWNLOAD_CANCEL:
                    manager.clearTheadFlag();
                    if (manager.mDownloadLisener != null)
                        manager.mDownloadLisener.onDownload(DownladStatus.DOWNLOAD_CANCEL, "");
                    Log.i(TAG,"用户取消了更新操作！");
                    break;
                default:
                    break;
            }
        }
    }

    private String getPathName(String url){
        int index = url.lastIndexOf('/');
        return url.substring(index + 1);
    }

    //md5校验
    private boolean md5Check(File file) {
        InputStream fis = null;
        byte[] buffer = new byte[1024];
        int numRead = 0;
        MessageDigest md5;
        try{
            fis = new FileInputStream(file);
            md5 = MessageDigest.getInstance("MD5");
            while((numRead=fis.read(buffer)) > 0) {
                md5.update(buffer,0,numRead);
            }
            fis.close();
            return mMd5.equals(toHexString(md5.digest()));
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        } finally {
            if (fis != null) {
                try {
                    fis.close();
                } catch (IOException e) {
                }
            }
        }
    }
    private static final char HEX_DIGITS[] = { '0', '1', '2', '3', '4', '5', '6', '7', '8','9', 'a', 'b', 'c', 'd', 'e', 'f'};
    //转化成16进制
    public String toHexString(byte[] b) {
        StringBuilder sb = new StringBuilder(b.length * 2);
        for (int i = 0; i < b.length; i++) {
            sb.append(HEX_DIGITS[(b[i]& 0xf0) >>> 4]);
            sb.append(HEX_DIGITS[b[i] & 0x0f]);
        }
        return sb.toString();
    }

    private void clearTheadFlag(){
        mFileDownLoader.setCompel(false);
        if (mDownloadApkThread != null){
            mDownloadApkThread = null;
        }
    }
    private void clearThead(){
        if (mDownloadApkThread != null){
            mDownloadApkThread = null;
        }
    }
}