--[[
   register chameleon api
--]]
local luaj = require "cocos.cocos2d.luaj"
local className = "prj/chameleon/channelapi/cbinding/NativeChannelInterface"
-- 调用 Java 方法
local args = {"chameleoncb"}
local sig = "(Ljava/lang/String;)Ljava/lang/String;"
local ok, libPath = luaj.callStaticMethod(className, "getChameleonLibPath", args, sig)

local registerChameleon = package.loadlib(libPath, "luaopen_chameleoncb")
registerChameleon() 
chameleoncb.registerCallback()
               