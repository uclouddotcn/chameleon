# Chameleon

Chameleon项目是手游渠道接入的一个解决方案。它为各个渠道的不同的API提供了一套统一的接口，这样使用者只需要花费一次接入的工作量，接入ChameleonSDK，就可以通过Chameleon提供的整套工具，打包出不同渠道的发布包。

## 包含的组件
Chameleon项目包括三个部分：

* 前端API

	包括Java原生，C++, Unity的C#接口

* 渠道管理配置客户端

	一个基于Nodewebkit的客户端，可以用来创建Chameleon工程，管理渠道配置等工作

* 服务器端

	同前端API，服务器端响应来自用户端的鉴权请求，以及转发渠道的发货回调

## API说明
请参见client和server中的具体文档

## 打包和编译

### 客户端

到tools目录下调用，```./build.py``` 来打包发布版本，发布包会在client的build目录底下

### server端
到tools目录下调用，```./build.py``` 来打包发布版本


