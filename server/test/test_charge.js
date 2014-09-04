var http = require('http');
var url = require('url');
var qs = require('querystring');

var server = http.createServer(function (req, res) {
    console.log(req);
    param = url.parse(req.url);
    console.log(param);
    res.setHeader('Content-Type', 'text/json');
    res.end(JSON.stringify({code: '0'}));
});

function postPendingCharge(callback) {
    
    var orderInfo = {
       platform: 'qihu',
       uid: '11111',
       appUid: '22222',
       serverId: '10',
       currencyCount: 1000,
       realPayMoney: 1000,
       ratio: 100
    };
    var postData = qs.stringify(orderInfo);
    var sdkOptions = {
       hostname: "localhost",
       port: 8081,
       path: '/pending_charge',
       method: 'POST',
       headers: {
             'Content-Type': 'application/x-www-form-urlencoded',
             'Content-Length': postData.length
         }
    };
    
    var req = http.request(sdkOptions, function (res) {
        var body = ''; 
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function () {
            var b = JSON.parse(body);
            setTimeout(function() {
                callback(b, orderInfo);
            }, 2000);
        });
    });

    req.write(postData);
    req.end();
}

function postCharge(b, orderInfo) {
    if (!b.orderId) {
        throw new Error(JSON.stringify(b));
    }

    console.log('request charge');
    var postData = {
        app_key : "1234",
        product_id : "xxxx",
        amount: orderInfo.realPayMoney,
        app_uid: orderInfo.appUid,
        app_ext1: "charge",
        app_ext2: orderInfo.ratio,
        user_id: orderInfo.uid,
        order_id: b.orderId,
        gateway_flag: 'success',
        sign_type: 'md5',
        app_order_id: b.orderId,
        sign_return: 'xxxxxx',
        sign: 'xxxxx'
    }

    postData = qs.stringify(postData);
    var sdkOptions = {
       hostname: "localhost",
       port: 8082,
       path: '/qihu/pay',
       method: 'POST',
       headers: {
             'Content-Type': 'application/x-www-form-urlencoded',
             'Content-Length': postData.length
         }
    };
    
    var req = http.request(sdkOptions, function (res) {
        var body = ''; 
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function () {
            var b = JSON.parse(body);
            console.log(b);
            console.log(orderInfo)
        });
    });

    req.write(postData);
    req.end();
}

function test() {
    postPendingCharge(postCharge);
}

server.listen(8080, test);
server.unref();




