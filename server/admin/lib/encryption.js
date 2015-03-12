/**
 * Created by Administrator on 2015/3/10.
 */
'use strict';

var fs = require('fs'),
    path = require('path'),
    ursa = require('ursa');

function Encryption(keyDir) {
    this.key = ursa.createPrivateKey(fs.readFileSync(path.join(keyDir, 'chameleon-server.key.pem')));
    this.crt = ursa.createPublicKey(fs.readFileSync(path.join(keyDir, 'chameleon-server.pub')));
}

Encryption.prototype.encrypt = function(input){
    return this.crt.encrypt(input, 'utf8', 'base64');
}

Encryption.prototype.decrypt = function(input){
    return this.key.decrypt(input, 'base64', 'utf8');
}

module.exports = Encryption;