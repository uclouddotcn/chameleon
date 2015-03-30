import os

CHAMELEON_MAINACTIVITY_SMALI = '''
.class public L%package%/ChameleonMainActivity;
.super L%MainActivity%;
.source "ChameleonMainActivity.java"


# direct methods
.method static constructor <clinit>()V
    .locals 4

    .prologue
    .line 16
    const/4 v0, 0x0

    .line 18
    .local v0, "cls":Ljava/lang/Class;, "Ljava/lang/Class<*>;"
    :try_start_0
    const-string v2, "prj.chameleon.channelapi.unity.UnityChannelInterface"

    invoke-static {v2}, Ljava/lang/Class;->forName(Ljava/lang/String;)Ljava/lang/Class;
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    move-result-object v0

    .line 23
    :goto_0
    if-eqz v0, :cond_0

    :try_start_1
    invoke-virtual {v0}, Ljava/lang/Class;->isLocalClass()Z

    move-result v2

    if-nez v2, :cond_1

    .line 24
    :cond_0
    const-string v2, "prj.chameleon.channelapi.cbinding.NativeChannelInterface"

    invoke-static {v2}, Ljava/lang/Class;->forName(Ljava/lang/String;)Ljava/lang/Class;
    :try_end_1
    .catch Ljava/lang/Exception; {:try_start_1 .. :try_end_1} :catch_1

    .line 29
    :cond_1
    :goto_1
    return-void

    .line 19
    :catch_0
    move-exception v1

    .line 20
    .local v1, "e":Ljava/lang/Exception;
    sget-object v2, Lprj/chameleon/channelapi/Constants;->TAG:Ljava/lang/String;

    const-string v3, "Fail to find UnityChannelInterface"

    invoke-static {v2, v3, v1}, Landroid/util/Log;->e(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    goto :goto_0

    .line 26
    .end local v1    # "e":Ljava/lang/Exception;
    :catch_1
    move-exception v1

    .line 27
    .restart local v1    # "e":Ljava/lang/Exception;
    sget-object v2, Lprj/chameleon/channelapi/Constants;->TAG:Ljava/lang/String;

    const-string v3, "Fail to find NativeChannelInterface"

    invoke-static {v2, v3, v1}, Landroid/util/Log;->e(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    goto :goto_1
.end method

.method public constructor <init>()V
    .locals 0

    .prologue
    .line 13
    invoke-direct {p0}, L%MainActivity%;-><init>()V

    return-void
.end method


# virtual methods
.method protected onActivityResult(IILandroid/content/Intent;)V
    .locals 0
    .param p1, "requestCode"    # I
    .param p2, "resultCode"    # I
    .param p3, "data"    # Landroid/content/Intent;

    .prologue
    .line 70
    invoke-super {p0, p1, p2, p3}, L%MainActivity%;->onActivityResult(IILandroid/content/Intent;)V

    .line 71
    invoke-static {p0, p1, p2, p3}, Lprj/chameleon/channelapi/ActivityInterface;->onActivityResult(Landroid/app/Activity;IILandroid/content/Intent;)V

    .line 72
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 0
    .param p1, "savedInstanceState"    # Landroid/os/Bundle;
%isStartSplash%
    .line 34
    invoke-super {p0, p1}, L%MainActivity%;->onCreate(Landroid/os/Bundle;)V

    .line 35
    invoke-static {p0}, Lprj/chameleon/channelapi/ActivityInterface;->onCreate(Landroid/app/Activity;)V

    .line 36
    return-void
.end method

.method protected onDestroy()V
    .locals 0

    .prologue
    .line 52
    invoke-super {p0}, L%MainActivity%;->onDestroy()V

    .line 53
    invoke-static {p0}, Lprj/chameleon/channelapi/ActivityInterface;->onDestroy(Landroid/app/Activity;)V

    .line 54
    return-void
.end method

.method protected onNewIntent(Landroid/content/Intent;)V
    .locals 0
    .param p1, "intent"    # Landroid/content/Intent;

    .prologue
    .line 76
    invoke-super {p0, p1}, L%MainActivity%;->onNewIntent(Landroid/content/Intent;)V

    .line 77
    invoke-static {p0, p1}, Lprj/chameleon/channelapi/ActivityInterface;->onNewIntent(Landroid/app/Activity;Landroid/content/Intent;)V

    .line 78
    return-void
.end method

.method protected onPause()V
    .locals 0

    .prologue
    .line 64
    invoke-super {p0}, L%MainActivity%;->onPause()V

    .line 65
    invoke-static {p0}, Lprj/chameleon/channelapi/ActivityInterface;->onPause(Landroid/app/Activity;)V

    .line 66
    return-void
.end method

.method protected onResume()V
    .locals 0

    .prologue
    .line 58
    invoke-super {p0}, L%MainActivity%;->onResume()V

    .line 59
    invoke-static {p0}, Lprj/chameleon/channelapi/ActivityInterface;->onResume(Landroid/app/Activity;)V

    .line 60
    return-void
.end method

.method protected onStart()V
    .locals 0

    .prologue
    .line 40
    invoke-super {p0}, L%MainActivity%;->onStart()V

    .line 41
    invoke-static {p0}, Lprj/chameleon/channelapi/ActivityInterface;->onStart(Landroid/app/Activity;)V

    .line 42
    return-void
.end method

.method protected onStop()V
    .locals 0

    .prologue
    .line 46
    invoke-super {p0}, L%MainActivity%;->onStop()V

    .line 47
    invoke-static {p0}, Lprj/chameleon/channelapi/ActivityInterface;->onStop(Landroid/app/Activity;)V

    .line 48
    return-void
.end method
'''

CHAMELEON_MAINACTIVITY_STARTSPLASH = '''
    .prologue
    .line 33
    invoke-static {p0}, Lprj/chameleon/channelapi/ActivityInterface;->startSplash(Landroid/app/Activity;)V
'''
POSITION_HOLDER_PACKAGE = '%package%'
POSITION_HOLDER_MAINACTIVITY = '%MainActivity%'
POSITION_HOLDER_ISSTARTSPLASH = '%isStartSplash%'

#参数格式为com.example.testapp.MainActivity
def makeMainActivity(smaliRoot, manifest, globalcfg):
    #get the defult str
    smaliStr = CHAMELEON_MAINACTIVITY_SMALI
    startSplashStr = CHAMELEON_MAINACTIVITY_STARTSPLASH

    #get the old main name
    entryActivityNode = manifest._findEntryActivity()
    if entryActivityNode is None:
        raise RuntimeError('Fail to find the start entry')
    oldMain = entryActivityNode.getAttribute('android:name')
    if oldMain.startswith('.'):
        oldMain = manifest.getPkgName()+oldMain
    oldMainArray = oldMain.split('.')
    superMain = oldMainArray[0]
    for x in oldMainArray[1:]:
        superMain+='/'+x
    print(superMain)

    #get the package name
    oldPackage = oldMainArray[0]
    for x in oldMainArray[1:len(oldMainArray)-1]:
        oldPackage+='/'+x
    print(oldPackage)

    #get the splashPath
    obj = globalcfg.get("channel")
    splashPath = obj.get("splashPath")

    #repalce package and superMain
    smaliStr = smaliStr.replace(POSITION_HOLDER_PACKAGE, oldPackage)
    smaliStr = smaliStr.replace(POSITION_HOLDER_MAINACTIVITY, superMain)

    #replace start splash
    if splashPath is not None:
        smaliStr = smaliStr.replace(POSITION_HOLDER_ISSTARTSPLASH, startSplashStr)
    else:
        smaliStr = smaliStr.replace(POSITION_HOLDER_ISSTARTSPLASH, '')

    #new package
    smaliPath = os.path.join(smaliRoot, *oldMainArray[0:len(oldMainArray)-1])

    print('this dir will be make：' + smaliPath)

    #if the path is not exists then makedirs
    if not os.path.exists(smaliPath):
        os.makedirs(smaliPath)

    smaliFile = os.path.join(smaliPath, 'ChameleonMainActivity.smali')
    fp = open(smaliFile, mode = 'w')
    fp.write(smaliStr)
    fp.close()
