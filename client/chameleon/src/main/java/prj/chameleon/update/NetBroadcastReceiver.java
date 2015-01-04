package prj.chameleon.update;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.util.Log;

/**
 * Created by Administrator on 2014/11/20.
 */
public class NetBroadcastReceiver extends BroadcastReceiver {

    private Context mContext;
    private UpdateManager downloadManager;

    public NetBroadcastReceiver(Context context, UpdateManager downloadManager){
        this.mContext = context;
        this.downloadManager = downloadManager;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        ConnectivityManager connectMgr = (ConnectivityManager) mContext.getSystemService(mContext.CONNECTIVITY_SERVICE);
        NetworkInfo wifiNetInfo = connectMgr.getNetworkInfo(ConnectivityManager.TYPE_WIFI);
        if (wifiNetInfo.isConnected()){
            Log.i("NetBroadcastReceiver: ", "WiFi能使用,开始下载！");
            downloadManager.downloadSilentStart();
        }else {
            Log.i("NetBroadcastReceiver: ", "WiFi不能使用,下载停止！");
            downloadManager.cancelDownload();
        }
    }
}