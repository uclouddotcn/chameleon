# 在Cocos2d-x项目中使用Chameleon

## 搭建开发环境
###添加环境变量
一开始需要添加一个指向Android Studio的SDK路径的环境变量
例如
```shell
export ANROID_HOME=/path/to/Android\ Studio/sdk
```
###使用chameleon.py生成平台相关的代码和资源
使用chameleon.py会在cocos2d-x工程的proj.android目录底下生成一个chameleon的目录，包含了chameleon的SDK，C++的Module，各渠道的资源，以及编译所需的一些工具。
例如
```shell
shaukwu-nb:build wushauk$ ./chameleon.py generate_cc2dx2 ../../platform/qihu.json ../sample/chameleon_cc2d/
loading config file for platform qihu...
generating the whole product flavors...
copying source tree for platform qihu...
ignore copying existing manifest file ../sample/chameleon_cc2d/proj.android/chameleon/src/qihu/AndroidManifest.xml
writing productflavor.json...
done
copy chameleoncb
copy gradle to cocos2dx 2.x.x project
../sample/chameleon_cc2d/proj.android/chameleon/build.gradle.default
../sample/chameleon_cc2d/proj.android/chameleon/build_native.sh.default
../sample/chameleon_cc2d/proj.android/chameleon/cocos2dx_prj
../sample/chameleon_cc2d/proj.android/chameleon/gradle
../sample/chameleon_cc2d/proj.android/chameleon/gradlew
../sample/chameleon_cc2d/proj.android/chameleon/settings.gradle
```
### 使用编译模板
使用工具生成代码之后，chameleon的目录底下会有两个文件，build.gradle.default和build_native.sh.default。build.gradle.deault是标准的gradle编译脚本，build_native.sh.default是用来替换标准的Cocos2d-x的build_native.sh。
对于新建的工程，可以直接替换之
```shell
shaukwu-nb:chameleon_cc2d wushauk$ mv proj.android/chameleon/build.gradle.default proj.android/chameleon/build.gradle
shaukwu-nb:chameleon_cc2d wushauk$ mv proj.android/chameleon/build_native.sh.default proj.android/build_native.sh
```

### 修改Android.mk
修改proj.android/jni/Android.mk，增加以下两行
```make
LOCAL_WHOLE_STATIC_LIBRARIES += chameleoncb
```
```make
$(call import-module,chameleoncb)
```

### 增加SDK的init函数
在proj.android/src底下，找到主Activity的代码，在onCreateView里面增加一行
```java
    CPlatformInterface.init(this, glSurfaceView, true);
```
在proj.android/jni/hellocpp/main.cpp中的JNI_OnLoad函数里添加
```c++
    Chameleon::ChameleonPlatformAPI::setJavaVM(vm);
```

## 开始使用Chameleon SDK
经过上面几个步骤，Chameleon的环境就已经搭建好了。接下来就可以像使用普通的C++库一样来使用Chameleon的SDK
例如可以使用一个管理用户信息的类，即用来对Chameleon发送请求，同时自己也作为事件的监听者。
```c++
class UserAccountMgr : public Chameleon::CPlatformAPICallbackInf {

public:
    UserAccountMgr() {
        // 将自己作为事件监听者注册给ChameleonSDK
        ChameleonPlatformAPI::registCallback(this);
    }

    int Login() {
        // 调用ChameleonPlatformAPI的login，有时候我们不会同时
        // 发起多个同样的请求，这个时候id就可以随便传什么了。。
        return ChameleonPlatformAPI::login(0);
    }
    int LoginGuest() {
        return ChameleonPlatformAPI::loginGuest(0);
    }
    ///// other user account api


    // 发起以游客身份登陆之后，有可能会触发游客完成登陆的事件
    virtual void onLoginGuest(int id, int code) {
        setGuestLogined();
    }
    // 如果玩家正常登陆了，那么就会触发这个callback
    virtual void onLogin(int id, int code,
        const Chameleon::UserLoginInfo * loginInfo) {
        //玩家正常登陆，向后台发起登陆检测
        verifyLogin(*loginInfo);
    }

    ///// other callback inf implementation

```
##编译
完成了代码编写之后，只需要进入proj.android/chameleon目录底下，调用
```shell
./gradlew assemble
```
就可以编译出支持各平台的APK包了

##Sample
具体例子参见体Sample参见sample/chameleon_cc2d
