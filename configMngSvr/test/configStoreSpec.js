/**
 * Created by Administrator on 2014/12/18.
 */
describe('make sure all functions in configureStore work.',function() {
    var dbConfig = {
        "type": "redis",
        "instance": [
            {
                "port": 6379,
                "host": "192.168.8.134"
            }
        ],
        "ttl": -1
    };
    var Logger = require('../lib/systemLog');

    xit('test setProduct().', function (done) {
        var logger = (new Logger).serverLog();
        var configStore = require('../lib/configStore').createConfigStore(dbConfig, logger);

        var product = {
            productID: '3',
            name: 'game',
            channel: {
                anzhi: {
                    appKey: 1234,
                    appSecret: 'asdafd'
                },
                xiaomi: {
                    appKey: 1234,
                    appSecret: 'asdf'
                },
                coopad: {
                    appKey: 12345,
                    appSecret: 'swdswkdh'
                }
            }
        }

        setTimeout(function () {
            configStore.setProduct(product, function (err, result) {
                console.log(result);
                expect(true).toBe(true);
                done();
            });
        }, 3000);

    });

    xit("test getProduct()", function (done) {
        var logger = (new Logger).serverLog();
        var configStore = require('../lib/configStore').createConfigStore(dbConfig, logger);

        setTimeout(function () {
            configStore.getProduct(2, function (err, result) {
                console.log(result);
                expect(true).toBe(true);
                done();
            });
        }, 3000);
    });

    it("test setProductChannel()", function (done) {
        var logger = (new Logger).serverLog();
        var configStore = require('../lib/configStore').createConfigStore(dbConfig, logger);

        setTimeout(function () {
            configStore.setProductChannel(1, 'vivo', {appKey: 213, appSecret: 'addd'}, function (err, result) {
                console.log(result);
                expect(true).toBe(true);
                done();
            });
        }, 3000);
    });

    xit("test getProductChannel()", function (done) {
        var logger = (new Logger).serverLog();
        var configStore = require('../lib/configStore').createConfigStore(dbConfig, logger);

        setTimeout(function () {
            configStore.getProductChannel(1, ['anzhi'], function (err, result) {
                console.log(result);
                expect(true).toBe(true);
                done();
            });
        }, 3000);
    });

});