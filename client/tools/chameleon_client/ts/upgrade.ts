/// <reference path="declare/node.d.ts"/>
import upgrader = require('./upgrader');
import Downloader = upgrader.Downloader;

process.on('message', function (initval: any) {
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


