package com.yx9158.external;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageButton;
import android.widget.LinearLayout;

public class YXWebActivity extends Activity {

	protected static final int MSG_PAGE_TIMEOUT = 0;
	private ImageButton close;
	private Context context;// 内容上下文
	private WebView webView;
	private WebSettings ws = null;
	String url;
	// ClickScreenToReload clickScreenToReload;
	final Activity activity = this;

//	private Handler mHandler = new Handler();

	ProgressDialog progressDialog = null;

	private LinearLayout reloadlayout;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		this.getWindow().requestFeature(Window.FEATURE_PROGRESS);// 进度指示器功能
		setContentView(getResources().getIdentifier("yx_webview","layout",getPackageName()));

		context = getBaseContext();

		progressDialog = new ProgressDialog(activity);
		progressDialog.setTitle("Loading...");
		progressDialog.setMessage("努力加载中，请稍等片刻！");

		webView = (WebView) this.findViewById(getResources().getIdentifier("webView","id",getPackageName()));
		reloadlayout = (LinearLayout) this.findViewById(getResources().getIdentifier("reloadlayout","id",getPackageName()));
		reloadlayout.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View v) {
				loadUrl(url);
			}
		});
		ws = webView.getSettings();
		ws.setAllowFileAccess(true);// 设置允许访问文件数据g
		ws.setJavaScriptCanOpenWindowsAutomatically(true);
		ws.setJavaScriptEnabled(true);// 设置支持javascript脚本
		ws.setCacheMode(WebSettings.LOAD_NO_CACHE);
		ws.setBuiltInZoomControls(true);// 设置支持缩放
		// 使得获取焦点以后可以使用软键盘
		webView.requestFocusFromTouch();
		Intent intent = getIntent();
		url = intent.getStringExtra("url");
		loadUrl(url);

		if (webView != null) {
			webView.setWebViewClient(new WebViewClient() {

				@Override
				public void onPageStarted(WebView view, String url,
						Bitmap favicon) {
					super.onPageStarted(view, url, favicon);
					progressDialog.show();
				}

				@Override
				public void onPageFinished(WebView view, String url) {
					progressDialog.dismiss();
					if (JudgeNetState.checkNetWorkStatus(YXWebActivity.this)) {
						reloadlayout.setVisibility(View.GONE);
						webView.setVisibility(View.VISIBLE);
					}
					super.onPageFinished(view, url);
				}

				@Override
				public void onReceivedError(WebView view, int errorCode,
						String description, String failingUrl) {
					reloadlayout.setVisibility(View.VISIBLE);
					webView.setVisibility(View.GONE);
					super.onReceivedError(view, errorCode, description,
							failingUrl);
				}
			});
		}
	}

	public void loadUrl(final String url) {
		webView.loadUrl(url);
	}
}
