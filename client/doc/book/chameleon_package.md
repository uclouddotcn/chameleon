# Chameleon
Chameleon的编译包括以下两个个部分：
1. chameleon.py chameleon的管理和生成工具
2. chameleon文件夹 包括编译好的chameleon_sdk.jar，c++ binding的module，以及支持各平台的代码和资源

##Chameleon的管理和代码生成工具
所有Chameleon的操作都可以通过chameleon.py这个工具完成。它包括如下几个功能：
* showall 显示Chameleon当前支持的所有平台
* showcfg 展示某个平台的config template，例如
```shell
shaukwu-nb:build wushauk$ ./chameleon.py showcfg qihu
{
    "appKey": "{string} appKey, YOUR_APP_KEY "
    "isLandscape": "{boolean} isLandscape, whether use landscape form "
    "appName": "{string} appName, the name of the app "
    "uri": "{url} uri, the payment callback uri "
    "appSecret": "{string} appSecret, YOUR_APP_SECRET "
    "isBGTransparent": "{boolean} isBGTransparent, whether the background is transparent , optional, default is true"
    "appId": "{string} appId, YOUR_APP_ID "
}
```
* makecfg 生成某个平台的config template文件，例如
```shell
shaukwu-nb:build wushauk$ ./chameleon.py makecfg qihu
generate config file ./qihu.json
```
* generate 通过渠道配置，为标准Android Gralde工程搭建接入各渠道的代码和资源
* generate_cc2dx2 功能同上，不过这个是为标准的cocos2d-x 2.x.x的版本搭建接入各渠道的代码和资源

##平台相关的代码和资源
因为Chameleon的SDK本质上相当于一层proxy，将参数和行为归整之后，还是会调用各个平台的SDK完成功能。因此chameleon这个文件夹内部，不仅包含了Chameleon SDK本身的代码，还包括为了适配各个渠道的代码，以及渠道的SDK和资源
###chameleon/libs/chameleon_sdk.jar
chameleon sdk的jar包，早期开发时候可以直接将这个jar包加入依赖，在没有加入平台对应的product flavor时候，可以通过AndroidManifest.xml mock账号等功能，在项目开发早期就可以完整的规划接入平台的流程。
###chameleon/src
这个目录底下包括了支持的所有平台的代码以及资源
###chameleon/chameleoncb
这个目录是Chameleon SDK的c++ binding
###chameleon/Resource
这个包括了支持各种工程的一些额外资源

