package prj.chameleon.channelapi;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.graphics.drawable.AnimationDrawable;
import android.graphics.drawable.Drawable;
import android.os.Handler;
import android.util.Log;
import android.widget.ImageView;

import org.xmlpull.v1.XmlPullParser;
import org.xmlpull.v1.XmlPullParserFactory;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;

public class SplashScreenActivity extends Activity {
    private ArrayList<Drawable> mListImages;
    private ArrayList<Integer> mListDurations;
    private String mMainActivity;

    private int initFromAsset() {
        mListImages = new ArrayList<Drawable>();
        mListDurations = new ArrayList<Integer>();
        try {
            int totalTime = 0;
            int count = 0;
            while (true) {
                try {
                    InputStream is =
                            getAssets().open(String.format("chameleon/chameleon_splashscreen_%d.png", count));
                    mListImages.add(Drawable.createFromStream(is, null));
                    mListDurations.add(2000);
                } catch (IOException e) {
                    break;
                }
                count = count+1;
            }
            totalTime = count*2000;
            return totalTime;

        } catch (Exception e) {
            Log.e(Constants.TAG, "Fail to load splash screen", e);
        }
        return 0;
    }

    private void startRealMainAndKillSelf() {
        Intent intent = new Intent();
        try {
            intent.setClass(getApplicationContext(), Class.forName(mMainActivity));
            startActivity(intent);
        } catch (ClassNotFoundException e) {
            throw new RuntimeException("Fail to get the main activity of the game " + mMainActivity);
        }
        finish();
    }

    private void onTimeout() {
        Log.d(Constants.TAG, "on timeout");
        startRealMainAndKillSelf();
        this.finish();
    }

    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int totalTime = initFromAsset();
        try {
            ActivityInfo app = getPackageManager().getActivityInfo(this.getComponentName(),
                    PackageManager.GET_ACTIVITIES|PackageManager.GET_META_DATA);
            if (app.metaData != null) {
                mMainActivity = app.metaData.getString("prj.chameleon.intent.main");
            }
        } catch (PackageManager.NameNotFoundException e) {
            Log.e(Constants.TAG, "Fail to get activity");
        }

        if (mMainActivity == null) {
            throw new RuntimeException("Fail to get the main activity meta data");
        }
        if (totalTime > 0) {
            Log.d(Constants.TAG, "after setting the splash activity");
            if (mListImages.size() > 0) {
                AnimationDrawable amDrawable = new AnimationDrawable();
                amDrawable.setOneShot(true);
                for (int i = 0; i < mListImages.size(); ++i) {
                    int duration = mListDurations.get(i);
                    amDrawable.addFrame(mListImages.get(i), duration);
                }
                if (amDrawable.getNumberOfFrames() > 0) {
                    ImageView imgView = new ImageView(this);
                    this.setContentView(imgView);
                    imgView.setImageDrawable(amDrawable);
                }
                Handler handler = new Handler();
                handler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        onTimeout();
                    }
                }, totalTime+1);
            }
        } else {
            Handler handler = new Handler();
            handler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    onTimeout();
                }
            }, 0);
        }
    }

    @Override
    public void onBackPressed () {

    }

}
