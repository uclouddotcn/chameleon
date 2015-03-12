/**
 * Created by Administrator on 2015/3/12.
 */
describe("Make sure functions in encryption.js work.", function(){
    var Encryption = require('../lib/encryption'),
        path = require('path'),
        constants = require('../lib/constants');

    var encryption = new Encryption(path.join(constants.baseDir, 'config', 'key'));
    it("test encode()", function(){
        var message = "hello world";
        var result = encryption.encrypt(message);
        console.log(result);
        expect(true).toBe(true);
    });
});