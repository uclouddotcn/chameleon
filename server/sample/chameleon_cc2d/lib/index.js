var fs = require('fs');
var server = require('./server.js');

function loadConfig(cfgFile) {
    var content = fs.readFileSync(cfgFile);
    return JSON.parse(content);
}

module.exports.main =
function () {
    var svrcfg = loadConfig(__dirname + '/../config/svr.json');
    server.startServer(svrcfg);
}



