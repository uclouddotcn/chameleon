/**
 * Created by Administrator on 2015/3/12.
 */
describe("Make sure functions in encryption.js work.", function(){
    var Encryption = require('../lib/encryption'),
        path = require('path'),
        constants = require('../lib/constants'),
        assert = require('assert');

    var encryption = new Encryption(path.join(constants.baseDir, 'config', 'key'));
    it("test encrypt() and decrypt()", function(){
        var message = "hello world";
        var encrypted = encryption.encrypt(message);
        var decrypted = encryption.decrypt(encrypted);
        assert.ok(message === decrypted);
    });
});