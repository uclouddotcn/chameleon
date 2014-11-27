/// <reference path="declare/node.d.ts"/>
var upgrader = require('./upgrader');
var Downloader = upgrader.Downloader;

process.on('message', function (initval) {
    var downloader = new Downloader(initval.svrhost, initval.curversion, initval.temppath);
    downloader.downloadUpdate(function (err, updateItems) {
        if (err) {
            return process.exit(-1);
        }
        updateItems = updateItems ? updateItems : [];
        process.send(updateItems);

        process.exit(0);
    });
});
//# sourceMappingURL=upgrade.js.map
