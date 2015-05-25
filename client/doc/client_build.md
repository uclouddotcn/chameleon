#build所需环境

###安装并添加到环境变量
    Python 3.4.2
    ant
    java 1.7以上
    node

###环境变量设置示例
    ANDROID_HOME=D:\adt-bundle-windows-x86_64-20140702\sdk
    ANT_HOME=D:\adt-bundle-windows-x86_64-20140702\eclipse\plugins\org.apache.ant_1.8.3.v201301120609
    JAVA_HOME=C:\Program Files\Java\jdk1.7.0_71
    CLASSPATH=.;C:\Program Files\Java\jdk1.7.0_71/lib/dt.jar;C:\Program Files\Java\jdk1.7.0_71/lib/tools.jar

    %ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\build-tools\19.0.0;%JAVA_HOME%\bin;%JAVA_HOME%\jre\bin;%ANT_HOME%/bin;%ANT_HOME%/lib;D:\Program Files\Python34;D:\Program Files\node-webkit;C:\Users\Administrator.WIN-7NMA3PMBLO6\AppData\Roaming\npm

###命令调用示例
    >D:\Program Files\Python D:\git\chameleon\client\tools\build.py
