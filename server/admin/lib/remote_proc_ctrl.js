var axon = require('axon');
var path = require('path');
var pm2 = require('pm2');


module.exports.startWorkerMaster = function (callback) {
    pm2.connect(function(err) {
        if (err) {
            return callback(new Error("Fail to link to pm2: " + err.message));
        }

        pm2.start(path.join(__dirname, '..', 'worker', 'master.js'), {
            name: 'chameleon_worker',
            scriptArgs: ['']
        }, function(err, proc) {
            if (err) throw new Error('err');

            // Get all processes running
            pm2.list(function(err, process_list) {
                console.log(process_list);

                // Disconnect to PM2
                pm2.disconnect(function() { process.exit(0) });
            });
        });
    });
};
