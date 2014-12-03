package prj.chameleon.update;

import android.util.Log;

import java.io.File;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.BlockingDeque;

public class DownloadThread extends Thread{
	private int block;
	private File saveFile;
	private int threadId;
	private URL downUrl;
	private int downLength;
	private FileDownLoader fileDownLoader;
	private volatile boolean finish=false;
    private BlockingDeque<FileDownLoader.TaskInfo> queue;

    private InputStream inputStream = null;
    private RandomAccessFile accessFile = null;

	public DownloadThread(FileDownLoader fileDownLoader,int block, File saveFile, int threadId, URL downUrl,
			int downLength, BlockingDeque<FileDownLoader.TaskInfo> queue) {
		super();
		this.block = block;
		this.saveFile = saveFile;
		this.threadId = threadId;
		this.downUrl = downUrl;
		this.downLength = downLength;
		this.fileDownLoader = fileDownLoader;
        this.queue = queue;
	}
	@Override
	public void run() {
        Log.e("DownloadThread", "start thread" + getId());
		if(downLength < block){
			try {
				HttpURLConnection connection=(HttpURLConnection) downUrl.openConnection();
				connection.setConnectTimeout(5000);
				connection.setRequestMethod("GET");
				connection.setRequestProperty("Accept", "image/gif, image/jpeg, image/pjpeg, image/pjpeg, application/x-shockwave-flash, application/xaml+xml, application/vnd.ms-xpsdocument, application/x-ms-xbap, application/x-ms-application, application/vnd.ms-excel, application/vnd.ms-powerpoint, application/msword, */*");
				connection.setRequestProperty("Referer", downUrl.toString());
				connection.setRequestProperty("Charset", "UTF-8");
				int startPos=block*(threadId-1)+downLength;
				int endPos=block*threadId-1;
				connection.setRequestProperty("Range", "bytes="+startPos+"-"+endPos);
				connection.setRequestProperty("User-Agent", "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.2; Trident/4.0; .NET CLR 1.1.4322; .NET CLR 2.0.50727; .NET CLR 3.0.04506.30; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729)");
				connection.setRequestProperty("Connection", "Keep-Alive");
				inputStream=connection.getInputStream();
				byte[] buffer=new byte[4096];
				int len = 0;
				accessFile = new RandomAccessFile(saveFile, "rwd");
				accessFile.seek(startPos);
				while((len=inputStream.read(buffer))!=-1 && !isInterrupted()){
					accessFile.write(buffer,0,len);
					downLength+=len;
					fileDownLoader.update(this.threadId, downLength);
					fileDownLoader.append(len);
				}
                FileDownLoader.TaskInfo taskInfo = new FileDownLoader.TaskInfo();
                taskInfo.threadIndex = threadId;
                taskInfo.status = 0;
                taskInfo.downloadSize = downLength;
                finish=true;
                queue.addLast(taskInfo);
			} catch (Exception e) {
				downLength = -1;
                FileDownLoader.TaskInfo taskInfo = new FileDownLoader.TaskInfo();
                taskInfo.threadIndex = threadId;
                taskInfo.status = -1;
                taskInfo.downloadSize = downLength;
                finish=true;
                queue.addLast(taskInfo);
			} finally {
                try{
                    if (accessFile != null){
                        accessFile.close();
                    }
                    if (inputStream != null){
                        inputStream.close();
                    }
                }catch (Exception e){
                }
            }
        }
        Log.e("DownloadThread", "end thread" + getId());
    }
	
	public long getDownloadLength(){
		return downLength;
	}
	
	public boolean isfinish(){
		return finish;
	}
}
