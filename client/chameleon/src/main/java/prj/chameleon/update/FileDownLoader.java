package prj.chameleon.update;

import java.io.File;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.BlockingDeque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingDeque;

import android.content.Context;
import android.os.Environment;
import android.os.StatFs;
import android.util.Log;

public class FileDownLoader {
    public static class TaskInfo {
        public int threadIndex;
        public int status;
        public int downloadSize;
    }
	private File saveFile;
	private String downloadurl;
	private int fileSize=0;
	private int downloadSize=0;
	private FileService fileService;
	private DownloadThread[]  threads;
	private int block;
	private Map<Integer, Integer> data=new ConcurrentHashMap<Integer, Integer>();
	private int curFailCount;
	private int maxFailCount = 5;
    private BlockingDeque<TaskInfo> queue;
    private ProgressListner listener;

    public volatile boolean compel = false;

    public boolean isCompel() {
        return compel;
    }

    public void setCompel(boolean compel) {
        this.compel = compel;
    }

    public void setCancel() {
        TaskInfo info = new TaskInfo();
        info.status = -100;
        queue.addLast(info);
    }

    public boolean hasData(){
        if (data != null && !data.isEmpty() && data.size() != 0){
            return true;
        }
        return false;
    }
    public void clearData(){
        data.clear();
    }

    @SuppressWarnings("deprecation")
	public static int freeSDCardSpaceInMB(){
		File sdcardDir = Environment.getExternalStorageDirectory();
        StatFs sf = new StatFs(sdcardDir.getPath());
        int space = (int)(((long)sf.getAvailableBlocks() * sf.getBlockSize()) / (1024*1024));
        Log.i("UNITY", "freespace left in MB :" + space);
        return space;
	}

    //TODO 文件下载初始化
    //result 目的是返回文件大小 如果大于SD卡剩余空间大小 则返回-1
    //downloadurl 并规定文件的下载地址，savePathFile文件的存储路径
    //thredNum 初始化多少个下载线程
	public int init(Context context, String downloadurl, String savePathFile, int thredNum, FileService fileService){
		try {
            downloadSize = 0;
			this.downloadurl=downloadurl;
			URL url=new URL(downloadurl);
			if(threads == null){
				threads=new DownloadThread[thredNum];
			}
			HttpURLConnection connection=(HttpURLConnection) url.openConnection();
			connection.setConnectTimeout(5000);
			connection.setRequestMethod("GET");
			connection.setRequestProperty("Accept", "image/gif, image/jpeg, image/pjpeg, image/pjpeg, application/x-shockwave-flash, application/xaml+xml, application/vnd.ms-xpsdocument, application/x-ms-xbap, application/x-ms-application, application/vnd.ms-excel, application/vnd.ms-powerpoint, application/msword, */*");
			connection.setRequestProperty("Charset", "UTF-8");
			connection.setRequestProperty("User-Agent", "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.2; Trident/4.0; .NET CLR 1.1.4322; .NET CLR 2.0.50727; .NET CLR 3.0.04506.30; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729)");
			connection.setRequestProperty("Connection", "Keep-Alive");
			connection.connect();
			if(connection.getResponseCode()==200){
				fileSize=connection.getContentLength();
				block=(fileSize + threads.length-1) / threads.length;
				this.saveFile=new File(savePathFile);
                this.fileService = fileService;
				Map<Integer,Integer> logdata=fileService.getData(downloadurl);
				if(logdata.size()>0){
					for(Map.Entry<Integer, Integer> entry: logdata.entrySet()){
						data.put(entry.getKey(), entry.getValue());
					}
				}
				if(data.size()==threads.length){
					for(int i=0;i<threads.length;i++){
						downloadSize+=data.get(i+1);
					}
					Log.i("downloadService","My Download Size is "+downloadSize);
				}
			}else {
				return 0;
			}

			if(fileSize / (1024 * 1024) > freeSDCardSpaceInMB() + 1){
				return -1;
			}

		} catch (Exception e) {
            e.printStackTrace();
			return 0;
		}
		return fileSize;
	}

    //TODO 文件下载方法
    //listner 监听器
	public int download(ProgressListner listener, Context context) {
        int ret = 0;
        this.listener = listener;
        queue = new LinkedBlockingDeque<TaskInfo>();
		try{
			curFailCount = 0;
			RandomAccessFile accessFile=new RandomAccessFile(saveFile, "rw");
			if(fileSize>0){
				accessFile.setLength(fileSize);
			}
			accessFile.close();
			URL url=new URL(downloadurl);
			if(data.size()!=threads.length){
				this.data.clear();
				for(int i=0;i<threads.length;i++){
					data.put(i+1, 0);
				}
				downloadSize=0;
			}
			for(int i=0;i<threads.length;i++){
				int downloadlength=this.data.get(i+1);
				if(downloadlength < block && downloadSize < fileSize){
					if(threads[i] == null || threads[i].getDownloadLength() == -1){
						this.threads[i]=new DownloadThread(this, block, saveFile, i+1, url, downloadlength, queue);
						this.threads[i].setPriority(7);
						this.threads[i].start();
					}
				}else{
					this.threads[i]=null;
				}
			}
			//fileService.delete(downloadurl);
			fileService.save(downloadurl, data);

            //尝试
			boolean notFinish=true;
			while(notFinish){
                notFinish = false;
                TaskInfo i = queue.takeFirst();
                if (i.status == -100) {
                    ret = -100;
                    break;//cancel
                }
                if (!NetStatusTool.isNetworkConnected(context)){
                    ret = -101;
                    break;
                }else {
                    if (!NetStatusTool.isWifiConnected(context) && !isCompel()){
                        ret = -102;
                        break;
                    }
                }
                if (i.status == -1  && (++curFailCount < maxFailCount)) {
                    this.threads[i.threadIndex]=new DownloadThread(
                            this, block, saveFile, i.threadIndex+1, url, this.data.get(i.threadIndex+1), queue);
                    this.threads[i.threadIndex].setPriority(7);
                    this.threads[i.threadIndex].start();
                }
                if(i.status == -1  && curFailCount >= maxFailCount){
                    Log.i("UNITY", "exit due to failed count :" + maxFailCount);
                    maxFailCount += 5;
                    return downloadSize;
                }
                if (i.status == 0){
                    for (int j=0;j<threads.length;j++){
                        notFinish |= !threads[j].isfinish();
                    }
                }
			}
            interruptThreads();//检查进程 将未结束的结束掉
		}catch(Exception e){
			e.printStackTrace();
		}
		Log.i("UNITY", "download finish downloadedSize: " + downloadSize + ", destSize:" + fileSize);
        if (ret == 0) {
            return downloadSize;
        } else {
            return ret;
        }
	}

	public synchronized  void update(int threadId,int downlength){
		this.data.put(threadId, downlength);
		fileService.update(this.downloadurl, threadId, downlength);
	}

	public synchronized void  append(int size){
		this.downloadSize+=size;
        if (this.listener != null) {
            this.listener.onDownloadSize(this.downloadSize);
        }
	}

    private void interruptThreads(){
        for (int i=0;i<threads.length;i++){
            if (!this.threads[i].isfinish()){
                threads[i].interrupt();
            }
        }
        for (int i=0;i<threads.length;i++) {
            try {
                threads[i].join();
                threads[i] = null;
            } catch (InterruptedException e) {
            }
        }
    }
}
