var restify = require('restify');

//var sdkSvrUri = "http://chameleon-dev:8081";
var sdkSvrUri = "http://localhost:8081";

function startSvr() {
    var server = restify.createServer();
    var client = restify.createJsonClient({
        url: sdkSvrUri
    });
    server.use(restify.queryParser({mapParam : true}));
    server.use(restify.bodyParser({mapParam : true}));
    server.get('/sdkapi/login', function (req, res, next) {
        console.log('get request ' + JSON.stringify(req.params));
        client.post('/ucloud/verify_login', req.params, function (err, _req, _res, obj) {
            if (err) {
                console.log(err);
                console.log(err.stack);
                req.log.error({err: err}, 'error request login');
                return next(err);
            }
            res.send(obj);
            console.log('responds to ' + JSON.stringify(obj));
            return next();
        });
    });

    server.post('/sdkapi/buy', function (req, res, next) {
        console.log('get request ' + JSON.stringify(req.params));
        var params = {
            channel: req.params.channel,
            uid: req.params.uid,
            token: req.params.token,
            appUid: req.params.uid,
            serverId: "10",
            productId: req.params.productId,
            productCount: parseInt(req.params.count),
            productName: req.params.productName,
            productDesc: req.params.productDesc,
            productUrl: "http://imgcache.qq.com/qzone/space_item/pre/0/66768.gif",
            singlePrice: 100,
            realPayMoney: req.params.count * 100, // all product costs ￥10 per one
            ext: "abc" // something will return back when callback from server
        };
        client.post('/ucloud/pending_pay', params, function (err, _req, _res, obj) {
            if (err) {
                console.log(err);
                console.log(err.stack);
                req.log.error({err: err}, 'error request login');
                return next(err);
            }
            var result = null;
            if (obj.code === 0) {
                result = {
                    code: obj.code,
                    orderId: obj.orderId,
                    payInfo: obj.payInfo,
                    uid: params.uid,
                    appUid: params.appUid,
                    serverId: params.serverId,
                    productId: params.productId,
                    productCount: params.productCount,
                    realPayMoney: params.realPayMoney
                };
            } else {
                result = {code : obj.code};
            }
            res.send(result);
            console.log('responds to ' + JSON.stringify(result));
            return next();

        });
    });

    server.post('/sdkapi/charge', function (req, res, next) {
        console.log('get request ' + JSON.stringify(req.params));
        var params = {
            channel: req.params.channel,
            uid: req.params.uid,
            token: req.params.token,
            appUid: req.params.uid,
            serverId: "10",
            productCount: req.params.count,
            singlePrice: 10,
            realPayMoney: req.params.count * 10, // ￥1.0 can buy 10 currency
            ext: "abc", // something will return back when callback from server
        };
        client.post('/ucloud/pending_pay', params, function (err, _req, _res, obj) {
            if (err) {
                console.log(err);
                console.log(err.stack);
                req.log.error({err: err}, 'error request login');
                return next(err);
            }
            var result = null;
            if (obj.code === 0) {
                result = {
                    code: obj.code,
                    orderId: obj.orderId,
                    payInfo: obj.payInfo,
                    uid: params.uid,
                    appUid: params.appUid,
                    serverId: params.serverId,
                    currencyCount: params.currencyCount,
                    realPayMoney: params.realPayMoney,
                    ratio: 10
                };
            } else {
                result  = {code : obj.code};
            }
            res.send(result);
            console.log('responds to ' + JSON.stringify(result));
            return next();

        });
    });

        console.log("xxxxxxxx");
    server.post('/callback/charge',  function (req, res, next) {
        console.log("receive callback charge: " + JSON.stringify(req.params));
        //res.send({code : -1});
        //next();
    });

    server.post('/callback/buy',  function (req, res, next) {
        console.log("receive callback buy: " + JSON.stringify(req.params));
        //res.send({code : -1});
        //next();
    });

    server.listen(8080);
    server.on('uncaughtException', function (req, res, route, err) {
        console.log('on exception ' + err.message);
        console.log('on exception ' + err.stack);
    });
}

startSvr();

