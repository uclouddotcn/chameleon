var http = require('http');
var url = require('url');
var qs = require('querystring');

var server = http.createServer(function (req, res) {
    param = url.parse(req.url);
    res.setHeader('Content-Type', 'text/json');
    res.end(JSON.stringify({code: '0'}));
});

function postPendingCharge(callback) {
    
    var orderInfo = {
       platform: 'UCLOUD',
       uid: '11111',
       appUid: '22222',
       serverId: '10',
       productId: 'test',
       productCount: 10,
       realPayMoney: 100,
       singlePrice: 10,
       ext: 'the ext should be echo'
    };
    var postData = qs.stringify(orderInfo);
    var sdkOptions = {
       hostname: "localhost",
       port: 8081,
       path: '/pending_buy',
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
            callback(b, orderInfo);
        });
    });

    req.write(postData);
    req.end();
}

function postCharge(b, orderInfo) {
    if (!b.orderId) {
        throw new Error(JSON.stringify(b));
    }
    orderInfo.status = 0;
    orderInfo.orderId = b.orderId;
    orderInfo.ext = 't=b'
    orderInfo.paymoney = 100;

    var postData = qs.stringify(orderInfo);
    var sdkOptions = {
       hostname: "localhost",
       port: 8082,
       path: '/ucloud/buy',
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

server.listen(8079, test);
server.unref();




