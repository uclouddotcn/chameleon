/****************************************************************************
Copyright (c) 2010-2011 cocos2d-x.org

http://www.cocos2d-x.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/
package prj.chamelon.cc2d;

import org.cocos2dx.lib.Cocos2dxActivity;
import org.cocos2dx.lib.Cocos2dxGLSurfaceView;
import prj.chameleon.channelapi.cbinding.NativeChannelInterface;
import android.content.Intent;
import android.util.Log;

import android.os.Bundle;

public class chameleon_cc2d extends Cocos2dxActivity{
	
    protected void onCreate(Bundle savedInstanceState){
		super.onCreate(savedInstanceState);
		int d = R.drawable.icon;
	}

    @Override
    public void onResume() {
        super.onResume();
        NativeChannelInterface.onResume(1);
    }

    @Override
    public void onPause() {
        super.onPause();
        NativeChannelInterface.onPause();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        NativeChannelInterface.onDestroy();
    }

    @Override
    public void onStart() {
        super.onStart();
        NativeChannelInterface.onStart(this);
    }

    @Override
    public void onStop() {
        super.onStop();
        NativeChannelInterface.onStop(this);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
            NativeChannelInterface.onNewIntent(this, intent);
    }


    public Cocos2dxGLSurfaceView onCreateView() {
    	Cocos2dxGLSurfaceView glSurfaceView = new Cocos2dxGLSurfaceView(this);
    	// chameleon_cc2d should create stencil buffer
    	glSurfaceView.setEGLConfigChooser(5, 6, 5, 0, 16, 8);
    	//glSurfaceView.setEGLConfigChooser(8 , 8, 8, 8, 16, 0);

        NativeChannelInterface.setRunningEnv(this, glSurfaceView);
    	
    	return glSurfaceView;
    }

    static {
        System.loadLibrary("cocos2dcpp");
    }     
}
