package prj.chameleon.huawei;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.util.Log;

import com.huawei.gamebox.buoy.sdk.IGameCallBack;
import com.huawei.gamebox.buoy.sdk.UpdateInfo;
import com.huawei.gamebox.buoy.sdk.util.DebugConfig;

import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IDispatcherCb;

class GameCallback implements IGameCallBack {

    private Context mContext = null;
    private IDispatcherCb mCb = null;

    protected GameCallback(Context activity, IDispatcherCb cb) {
        mContext = activity;
        mCb = cb;
    }

    @Override
    public void onInitStarted() {
        //mCb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void onInitFailed(int errorCode) {
        mCb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
    }

    /**
     * 初始化成功类
     */
    @Override
    public void onInitSuccessed() {
        mCb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void onValidFail() {

    }

    @Override
    public void onShowSuccssed() {
    }

    @Override
    public void onShowFailed(int errorCode) {
        Log.e(Constants.TAG, "Fail to show window " + errorCode);
    }

    @Override
    public void onHidenSuccessed() {
    }

    @Override
    public void onHidenFailed(int errorCode) {
        Log.e(Constants.TAG, "Fail to hide window " + errorCode);
    }

    @Override
    public void onDestoryed() {
    }

    /**
     * 应用更新检查回调函数
     */
    @Override
    public void onUpdateCheckFinished(UpdateInfo info) {
    }

    @Override
    public void onUpdateError(int arg0) {
    }

}
