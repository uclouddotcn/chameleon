/**
 * Created by Administrator on 2015/1/12.
 */
module.exports = {
    log: function (message, err) {
        var logmsg = message;
        if (err) {
            logmsg =  logmsg + '\n' + err.message + '\n' + err['stacktrace'];
        }
        console.log(logmsg);
    }
}