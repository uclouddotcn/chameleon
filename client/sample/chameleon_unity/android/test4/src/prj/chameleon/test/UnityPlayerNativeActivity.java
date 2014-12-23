package prj.chameleon.test;

import com.unity3d.player.*;
import android.util.Log;
import android.app.NativeActivity;
import android.content.res.Configuration;
import android.graphics.PixelFormat;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import prj.chameleon.channelapi.unity.UnityChannelInterface;
import android.content.Intent;

public class UnityPlayerNativeActivity extends NativeActivity
{
	protected UnityPlayer mUnityPlayer;		// don't change the name of this variable; referenced from native code

	// Setup activity layout
	@Override protected void onCreate (Bundle savedInstanceState)
	{
		requestWindowFeature(Window.FEATURE_NO_TITLE);
		super.onCreate(savedInstanceState);

		getWindow().takeSurface(null);
		setTheme(android.R.style.Theme_NoTitleBar_Fullscreen);
		getWindow().setFormat(PixelFormat.RGB_565);

                if (mUnityPlayer == null) {
                    Log.e("chameleon", "start unity player: " + this.toString());
                    mUnityPlayer = new UnityPlayer(this);
                    if (mUnityPlayer.getSettings ().getBoolean ("hide_status_bar", true))
                            getWindow ().setFlags (WindowManager.LayoutParams.FLAG_FULLSCREEN,
                                                   WindowManager.LayoutParams.FLAG_FULLSCREEN);
                }
		setContentView(mUnityPlayer);
		mUnityPlayer.requestFocus();
	}

	// Quit Unity
	@Override protected void onDestroy ()
	{
                    Log.e("chameleon", "stop unity player: " + this.toString());
		mUnityPlayer.quit();
		super.onDestroy();
		UnityChannelInterface.onDestroy();
	}

	// Pause Unity
	@Override protected void onPause()
	{
		super.onPause();
		mUnityPlayer.pause();
		UnityChannelInterface.onPause();
	}

	// Resume Unity
	@Override protected void onResume()
	{
		super.onResume();
		mUnityPlayer.resume();
		UnityChannelInterface.onResume();
	}

  public void onStart() {
			super.onStart();
        UnityChannelInterface.onStart(this);
    }

    public void onStop() {
			super.onStop();
        UnityChannelInterface.onStop(this);
    }

    public void onNewIntent(Intent intent) {
			  super.onNewIntent(intent);
        UnityChannelInterface.onNewIntent(this, intent);
    }


	// This ensures the layout will be correct.
	@Override public void onConfigurationChanged(Configuration newConfig)
	{
		super.onConfigurationChanged(newConfig);
		mUnityPlayer.configurationChanged(newConfig);
	}

	// Notify Unity of the focus change.
	@Override public void onWindowFocusChanged(boolean hasFocus)
	{
		super.onWindowFocusChanged(hasFocus);
		mUnityPlayer.windowFocusChanged(hasFocus);
	}

	// For some reason the multiple keyevent type is not supported by the ndk.
	// Force event injection by overriding dispatchKeyEvent().
	@Override public boolean dispatchKeyEvent(KeyEvent event)
	{
		if (event.getAction() == KeyEvent.ACTION_MULTIPLE)
			return mUnityPlayer.onKeyMultiple(event.getKeyCode(), event.getRepeatCount(), event);
		return super.dispatchKeyEvent(event);
	}

	// Pass any events not handled by (unfocused) views straight to UnityPlayer
}
