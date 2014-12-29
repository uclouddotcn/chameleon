var http = require('http');
var querystring = require('querystring');
var postData = querystring.stringify({
    platform: 'qihu',
    token: 'xxxxxxxx',
    others: '{"joke":"aha"}'
});
var sdkOptions = {
    hostname: "localhost",
    port: 8081,
    path: '/verify_login',
    method: 'POST',
    headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
      }
};


var req = http.request(sdkOptions, function (res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
    console.log('BODY: ' + chunk);
    });
});

req.write(postData);

req.end();



