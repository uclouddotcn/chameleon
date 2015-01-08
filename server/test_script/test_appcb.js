http = require('http');
url = require('url');
var server = http.createServer(function (req, res) {
    s = '';
    req.on('data', function (data) {
        s += data;
    });
    req.on('end', function () {
        console.log(s);
    })
    res.setHeader('Content-Type', 'text/json');
    res.end(JSON.stringify({code: '0'}));
});
server.listen(8080);

