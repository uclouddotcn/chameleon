/******************************************************************
* author: peter.zhu
* this file is generated by script, do not modify it.
*******************************************************************/
#include "ChameleonAPI_export.h"
#include <lua.h>

% for d in decls:
int lua_api_${d.name}(lua_State *L)
{
    % if d.needtransform == 1:
    ${d.params[1].type} ${d.params[1].name} = 120;
    char ${d.params[0].name}[120]; 
    % endif
    % for i in range(len(d.sig)):
        % if d.sig[i] == 'i':
    ${d.params[i].type} ${d.params[i].name} = lua_tointeger(L,${i+1});
        % endif
        % if d.sig[i] == 's':
    ${d.params[i].type} ${d.params[i].name} = lua_tostring(L,${i+1});
        % endif
        % if d.sig[i] == 'b':
    ${d.params[i].type} ${d.params[i].name} = lua_toboolean(L,${i+1});
        %endif
    % endfor 
    % if d.rsig != '':
    ${d.resultType} __ret__ = 
    % endif
    ${d.name}(
    % if len(d.params) > 0:
        ${d.params[0].name}
    % endif
    % for p in d.params[1:]:
        , ${p.name}
    % endfor
    );
    % if len(d.params) > 1:
    //lua_pop(L, ${len(d.params)});
    % endif
        
    % for r in d.rsig:
        % if r == 'i':
    lua_pushinteger(L, __ret__);
        % endif
        % if r == 's' and d.needtransform:
    lua_pushstring(L, ${d.params[0].name});
        % endif
        % if r == 's' and not d.needtransform:
    lua_pushstring(L, __ret__);
        % endif
    % endfor

    % if d.resultType != 'void':
    return 1;	
    % else:
    return 0;
    % endif
}
% endfor


int luaopen_${api_name}(lua_State*L)
{
% for d in decls:
    lua_register(L, "${d.name}", lua_api_${d.name});
% endfor

    return 0;
}
