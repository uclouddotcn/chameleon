--------------------------------
-- @module ${api_name}

--------------------------------
-- only for android
% for d in decls:
-- @function [parent=#${api_name}] ${d.name}
    % for i in range(len(d.sig)):
        % if d.sig[i] == "i":
-- @param #number ${d.params[i].name}
        % endif
        % if d.sig[i] == "s":
-- @param #string ${d.params[i].name}
        % endif
        % if d.sig[i] == "b":
-- @param #boolean ${d.params[i].name}
        % endif
    % endfor
    % if d.rsig != '':
-- return ${d.resultType} 
    % for r in d.rsig:
        % if r == 'i':
-- @return int#int ret (return value: int)
        % endif
        % if r == 's':
-- @return string#string ret (return value: string)
        % endif
        % if r == 'b':
-- @return bool#bool ret (return value: boolean)
        % endif
    % endfor
    % endif

--------------------------------
% endfor
