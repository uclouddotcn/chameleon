package prj.chameleon.huawei;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;

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
        mCb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    @Override
    public void onInitFailed(int errorCode) {
        mCb.onFinished(Constants.ErrorCode.ERR_OK, null);
    }

    /**
     * 初始化成功类
     */
    @Override
    public void onInitSuccessed() {
    }

    @Override
    public void onShowSuccssed() {
    }

    @Override
    public void onShowFailed(int errorCode) {
    }

    @Override
    public void onHidenSuccessed() {
    }

    @Override
    public void onHidenFailed(int errorCode) {
    }

    @Override
    public void onDestoryed() {
    }

    /**
     * 应用更新检查回调函数
     */
    @Override
    public void onUpdateCheckFinished(UpdateInfo info) {
        // 根据业务需要设置，demo中只在登录界面展示更新信息
        if (null != GlobalParams.hwId) {
            return;
        }

        if (null == info) {
            DebugConfig.d(Constants.TAG, "IGameCallBack onUpdateCheckFinished:无更新信息");
            return;
        }
        DebugConfig.d(Constants.TAG, "IGameCallBack onUpdateCheckFinished:UpdateInfo="
                + info.toString());

        // 如有需要则提示用户是否更新，可针对提示方式和界面自行修改，如不需要SDK更新则忽略此逻辑不处理即可
        AlertDialog.Builder dialog = new AlertDialog.Builder(mContext);
        dialog.setTitle("更新提示")
                .setMessage("更新内容：" + info.toString())
                .setPositiveButton("更新", new DialogInterface.OnClickListener() {

                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        dialog.dismiss();
                        // 通知SDK进行更新
                        if (null != GlobalParams.hwBuoy) {
                            GlobalParams.hwBuoy.updateApp(
                                    mContext.getApplicationContext(),
                                    GameCallback.this);
                        }
                    }
                })
                .setNegativeButton("取消", new DialogInterface.OnClickListener() {

                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        dialog.dismiss();
                    }
                }).create().show();

    }

    @Override
    public void onUpdateError(int arg0) {
    }

}
