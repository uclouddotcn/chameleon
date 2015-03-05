package prj.chameleon.channelapi;


import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.graphics.drawable.AnimationDrawable;
import android.graphics.drawable.Drawable;
import android.os.Handler;
import android.util.DisplayMetrics;
import android.util.Log;
import android.util.Xml;
import android.view.Gravity;
import android.widget.ImageView;
import android.widget.LinearLayout;

import org.xmlpull.v1.XmlPullParser;
import org.xmlpull.v1.XmlPullParserException;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;

public class SplashScreenActivity extends Activity {
    private ArrayList<Drawable> mListImages;
    private ArrayList<Integer> mListDurations;
    private int mBgColor = Color.BLACK;
    private String mMainActivity;
    private boolean mIsFillParent = false;

    private int loadSingleItem(XmlPullParser parser) throws XmlPullParserException, IOException {
        while (parser.getEventType() != XmlPullParser.END_TAG) {
            if (parser.getEventType() != XmlPullParser.START_TAG) {
                parser.next();
                continue;
            }
            String image = parser.getAttributeValue(null, "image");
            int duration = Integer.parseInt(parser.getAttributeValue(null, "duration"));
            InputStream is = getAssets().open(image);
            mListImages.add(Drawable.createFromStream(is, null));
            mListDurations.add(duration);
            return duration;
        }
        return 0;
    }

    private int initFromXml() {

        mListImages = new ArrayList<Drawable>();
        mListDurations = new ArrayList<Integer>();
        AssetManager mg = getResources().getAssets();
        try {
            int totalTime = 0;
            XmlPullParser parser = Xml.newPullParser();
            parser.setInput(mg.open("chameleon/splashscreen/info.xml"), "utf-8");
            parser.next();
            String color = parser.getAttributeValue(null, "background");
            if (color != null) {
                mBgColor = Color.parseColor(color);
            }
            while (parser.next() != XmlPullParser.END_DOCUMENT) {
                totalTime += loadSingleItem(parser);
            }
            return totalTime;
        } catch (IOException e) {
            return -1;
        } catch (XmlPullParserException e) {
            return -1;
        }
    }

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
            mIsFillParent = true;
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
        int flags = getIntent().getFlags();
        if ((flags & Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT) != 0) {
            finish();
            return;
        }
        int totalTime = initFromXml();
        if (totalTime < 0) {
            totalTime = initFromAsset();
        }
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
                    imgView.setImageDrawable(amDrawable);
                    imgView.setBackgroundColor(mBgColor);
                    if (mIsFillParent) {
                        imgView.setScaleType(ImageView.ScaleType.FIT_XY);
                        this.setContentView(imgView);
                    } else {
                        LinearLayout layout = new LinearLayout(this);
                        layout.setBackgroundColor(mBgColor);
                        layout.setGravity(Gravity.CENTER);
                        layout.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));//设置宽、高
                        DisplayMetrics dm = getResources().getDisplayMetrics();
                        int height = 400;
                        if (getRequestedOrientation() == ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE){
                            height = dm.heightPixels / amDrawable.getIntrinsicWidth() * amDrawable.getIntrinsicHeight();
                        } else {
                            height = dm.widthPixels / amDrawable.getIntrinsicWidth() * amDrawable.getIntrinsicHeight();
                        }
                        Log.e(Constants.TAG,"the splash imageview height"+height);
                        imgView.setLayoutParams(new LinearLayout.LayoutParams(dm.widthPixels, height));
                        layout.addView(imgView);
                        this.setContentView(layout);
                    }
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
