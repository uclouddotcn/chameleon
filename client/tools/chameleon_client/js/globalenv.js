var pathLib = require('path');
var fs = require('fs');
var appFolder = pathLib.join(__dirname, '..');
var tempFolder = pathLib.join(appFolder, 'temp');
module.exports.APP_FOLDER = appFolder;
module.exports.TEMP_FOLDER = tempFolder;

module.exports.createTempFolder = function () {
    if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder);
    } 
};

var createProjectFolder = function (projectid) {
    var p = pathLib.join(tempFolder, projectid);
    if (!fs.existsSync(p)) {
        fs.mkdirSync(p);
    } 
    return p;
};

module.exports.createProjectTmpFile = function (projectid, name) {
    var p = createProjectFolder(projectid);
    var filep = pathLib.join(p, name);
    return filep;
}


