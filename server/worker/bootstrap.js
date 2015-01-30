var child_process = require('child_process');
var path = require('path');
var fs = require('fs');

var workdir = __dirname;

var cfgtemplate = {
    "debug" : false,
    "sdkSvr" : {
        "port" : 8081,
            "host" : "0.0.0.0"
    },

    "admin" : {
        "port" : 8083,
            "host" : "0.0.0.0"
    },

    "pendingOrderStoreCfg" : {
        "type" : "redis",
            "instance" : [
            {
                "port": 6379,
                "host": "127.0.0.1"
            }
        ],
            "ttl": 3600
    },

    "channelCbSvr" :  {
        "port" : 80,
        "host" : "0.0.0.0"
    }
};

function series (funcs, callback) {
    if (funcs.length == 0) {
        setImmediate(callback);
        return;
    }
    var rest = funcs.splice(0);
    function cb(err) {
        if (err) {
            return callback(err);
        }
        if (rest.length > 0) {
            var next = rest[0];
            rest = rest.splice(1);
            setImmediate(wrapper, next, arguments.callee);
        } else {
            callback();
        }
    }
    function wrapper (f, cb) {
        try {
            f(cb);
        } catch (err) {
            cb(err);
        }
    }
    var next = rest[0];
    rest = rest.splice(1);
    wrapper(next, cb);
}

function npmInstall(p, callback) {
    console.log('npm install under ' + p);
    child_process.exec('npm install', {
        cwd: p
    }, function (err, stdout, stderr){
        if (err) {
            console.error("Fail to install under: " + process.cwd());
            console.error(stderr);
            callback(err);
            return;
        }
        callback();
    });
}

function bfs(p, callback) {
    var subs = fs.readdirSync(p);
    var toInstall = [];
    var morePath = []
    for (var i = 0; i < subs.length; ++i) {
        var f = path.join(p, subs[i]);
        if (subs[i] === 'package.json') {
            toInstall.push(p);
            continue;
        }
        if (!fs.statSync(f).isDirectory() ||
            subs[i] === 'node_modules' ||
            subs[i].substr(0, 1) === '.') {
            continue;
        }
        morePath.push(f);
    }
    series(toInstall.map(function (a) {
        return function (cb) {
            npmInstall(a, function (err) {
                cb(err);
            });
        }
    }), function (err) {
        if (err) {
            console.error(err);
            console.error(err.stack);
            return;
        }
        series(morePath.map(function (p) {
            return function (cb) {
                bfs(p, cb);
            }
        }), function (err) {
            callback(err);
        });
    })
}

var basedir = process.argv[2];
console.log(basedir)

bfs(workdir, function (err) {
    if (err) {
        console.error(err);
        console.error("Fail to preparing worker");
        return;
    }
    var cfgpath = path.join(basedir, 'config', 'svr.json');
    if (!fs.existsSync(cfgpath)) {
        fs.writeFileSync(cfgpath, JSON.stringify(cfgtemplate, null, '\t'));
    }
    console.log("Done");
});

