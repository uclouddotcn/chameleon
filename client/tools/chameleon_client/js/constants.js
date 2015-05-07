/**
 * Created by Administrator on 2015/3/24.
 */
var path = require('path');

function windowsHome(){
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}
module.exports = {
    chameleonHome: path.join(windowsHome(), '.chameleon')
};