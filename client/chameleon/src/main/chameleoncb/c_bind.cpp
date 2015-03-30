#include "chameleoncb/ChannelAPICallbackC.h"
#include "chameleoncb/ChameleonAPI_config.h"
#include "chameleoncb/ChameleonChannelAPI_C.h"
#ifdef __cplusplus
extern "C"{
#endif
#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>

#include <android/log.h>
#define CLEAR_STACK(L) lua_settop(L,0)

#define  LOG_TAG    "chameleon"
#define  LOGD(...)  __android_log_print(ANDROID_LOG_DEBUG,LOG_TAG,__VA_ARGS__)
#define  LOGI(...)  __android_log_print(ANDROID_LOG_INFO,LOG_TAG,__VA_ARGS__)
#define  LOGW(...)  __android_log_print(ANDROID_LOG_WARN,LOG_TAG,__VA_ARGS__)
#define  LOGE(...)  __android_log_print(ANDROID_LOG_ERROR,LOG_TAG,__VA_ARGS__)
#define  LOGF(...)  __android_log_print(ANDROID_LOG_FATAL,LOG_TAG,__VA_ARGS__)

lua_State *g_lua_env = NULL;

void stackDump (lua_State *L) {
		int i;
	int top = lua_gettop(L);
	for (i = 1; i <= top; i++) { /* repeat for each level */
		int t = lua_type(L, i);
		switch (t) {
			case LUA_TSTRING: /* strings */
				printf("`%s'", lua_tostring(L, i));
				break;
			case LUA_TBOOLEAN: /* booleans */
				printf(lua_toboolean(L, i) ? "true" : "false");
				break;
			case LUA_TNUMBER: /* numbers */
				printf("%g", lua_tonumber(L, i));
				break;
			default: /* other values */
				printf("%s", lua_typename(L, t));
				break;
		}
		printf(" "); /* put a separator */
	}
	printf("\n--------------------------------\n"); /* end the listing */
}

void error (lua_State *L, const char *fmt, ...) {
/*    va_list argp;
    va_start(argp, fmt);
    vfprintf(stderr, argp);
    va_end(argp);
    lua_close(L);
    exit(1);
    */
}

void call_va (const char *func, const char *sig, ...) {
    va_list vl;
    int narg, nres; /* number of arguments and results */
    va_start(vl, sig);
    lua_State *L = g_lua_env;
    if (L == NULL)
    {
        LOGE("lua_State is not set.");
        return;
    }
    LOGE("call_va");
    lua_getglobal(L, func); /* get function */
    if (0 == lua_gettop(L))
        return;             /*if the function is not implemented, just return, doing nothing.*/
    /* push arguments */
    LOGE("call_va find the func");
    narg = 0;
    while (*sig) { /* push arguments */
        switch (*sig++) {
        case 'd': /* double argument */
            lua_pushnumber(L, va_arg(vl, double));
            break;
        case 'i': /* int argument */
            lua_pushnumber(L, va_arg(vl, int));
            break;
        case 's': /* string argument */
            lua_pushstring(L, va_arg(vl, const char *));
            break;
        case 'b': /* bool argument*/
            lua_pushboolean(L, va_arg(vl, int));
            break;
        case '>':
            goto endwhile;
        default:
            error(L, "invalid option (%c)", *(sig - 1));
        }
        narg++;
        luaL_checkstack(L, 1, "too many arguments");
    } endwhile:

    /* do the call */
    nres = strlen(sig); /* number of expected results */
    if (lua_pcall(L, narg, nres, 0) != 0) /* do the call */
        error(L, "error running function `%s': %s", func, lua_tostring(L, -1));
    /* retrieve results */
    nres = -nres; /* stack index of first result */
    while (*sig) { /* get results */
        switch (*sig++) {
        case 'd': /* double result */
            if (!lua_isnumber(L, nres))
                error(L, "wrong result type");
            *va_arg(vl, double *) = lua_tonumber(L, nres);
            break;
        case 'i': /* int result */
            if (!lua_isnumber(L, nres))
                error(L, "wrong result type");
            *va_arg(vl, int *) = (int)lua_tonumber(L, nres);
            break;
        case 's': /* string result */
            if (!lua_isstring(L, nres))
                error(L, "wrong result type");
            *va_arg(vl, const char **) = lua_tostring(L, nres);
            break;
        case 'b': /*bool result*/
            if (!lua_isboolean(L, nres))
                error(L, "wrong result type");
            *va_arg(vl, int *) = lua_toboolean(L, nres);
        default:
            error(L, "invalid option (%c)", *(sig - 1));
        }
        nres++;
    }
    va_end(vl);
}


void DestroyChannelAPICallbackInf (
)
{
    call_va("DestroyChannelAPICallbackInf", ""
    );
}
void onInited (
        int code
        , bool isDebug
)
{
    call_va("onInited", "ib"
        , code
        , isDebug
    );
}
void preAccountSwitch (
)
{
    call_va("preAccountSwitch", ""
    );
}
void afterAccountSwitch (
        int code
        , const char * loginInfo
)
{
    call_va("afterAccountSwitch", "is"
        , code
        , loginInfo
    );
}
void onAccountLogout (
)
{
    call_va("onAccountLogout", ""
    );
}
void onGuestBind (
        const char * loginInfo
)
{
    call_va("onGuestBind", "s"
        , loginInfo
    );
}
void onLoginGuest (
        int id
        , int code
)
{
    call_va("onLoginGuest", "ii"
        , id
        , code
    );
}
void onRegistGuest (
        int id
        , int code
        , const char * loginInfo
)
{
    call_va("onRegistGuest", "iis"
        , id
        , code
        , loginInfo
    );
}
void onLogin (
        int id
        , int code
        , const char * loginInfo
)
{
    call_va("LLLonLogin", "iis"
        , id
        , code
        , loginInfo
    );
}
void onCharge (
        int id
        , int code
)
{
    call_va("onCharge", "ii"
        , id
        , code
    );
}
void onBuy (
        int id
        , int code
)
{
    call_va("onBuy", "ii"
        , id
        , code
    );
}
void onSwitchAccount (
        int id
        , int code
        , const char * loginInfo
)
{
    call_va("onSwitchAccount", "iis"
        , id
        , code
        , loginInfo
    );
}
void onToolbar (
        int flag
)
{
    call_va("onToolbar", "i"
        , flag
    );
}
void onResume (
)
{
    call_va("onResume", ""
    );
}
void onAntiAddiction (
        int id
        , int code
        , int flag
)
{
    call_va("onAntiAddiction", "iii"
        , id
        , code
        , flag
    );
}
void onExit (
        int code
)
{
    call_va("onExit", "i"
        , code
    );
}
void onRunProtocol (
        int id
        , int code
        , const char * protocol
        , const char * message
)
{
    call_va("onRunProtocol", "iiss"
        , id
        , code
        , protocol
        , message
    );
}


/*
*   call this function to register the lua file containing callback implementations.
*/

int init_callback_binding()
{
    ChannelAPICallbackInf_C adapter;
    adapter.DestroyChannelAPICallbackInf = DestroyChannelAPICallbackInf;
    adapter.onInited = onInited;
    adapter.preAccountSwitch = preAccountSwitch;
    adapter.afterAccountSwitch = afterAccountSwitch;
    adapter.onAccountLogout = onAccountLogout;
    adapter.onGuestBind = onGuestBind;
    adapter.onLoginGuest = onLoginGuest;
    adapter.onRegistGuest = onRegistGuest;
    adapter.onLogin = onLogin;
    adapter.onCharge = onCharge;
    adapter.onBuy = onBuy;
    adapter.onSwitchAccount = onSwitchAccount;
    adapter.onToolbar = onToolbar;
    adapter.onResume = onResume;
    adapter.onAntiAddiction = onAntiAddiction;
    adapter.onExit = onExit;
    adapter.onRunProtocol = onRunProtocol;
    return init(adapter);
}


#ifdef __cplusplus
}
#endif
