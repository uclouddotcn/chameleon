var assert = require('assert');
var path = require('path');
var fs = require('fs');
var mock = require('./mock');
var childProcess = require('child_process');
var versionparser = require('../lib/versionparser');
var _ = require('underscore');

describe('sdkpluginpool', function () {
    var SdkPluginPool = require('../lib/sdk_plugin_pool');
    describe('init', function () {
        var p = path.join(__dirname, './res/plugin');
        var inst = new SdkPluginPool(p, console);
        it('init should include all test version', function () {
            var pInfo = inst.plugins['test'];
            assert.equal(pInfo.name, 'test');
            assert.equal(pInfo.newest["0.0.0"], 2);
            var pluginNames = inst.getAllPluginNames();
            assert.equal(pluginNames.length, 1);
            assert.equal(pluginNames[0], 'test');
        });

        it('get plugin path', function () {
            var pluginPath = inst.getPluginPath('test', versionparser.getVersionFromCode(1));
            assert.equal(pluginPath, path.join(p, 'test-1'));
            pluginPath = inst.getPluginPath('test', versionparser.getVersionFromCode(2));
            assert.equal(pluginPath, path.join(p, 'test-2'));
            pluginPath = inst.getPluginPath('test', versionparser.getVersionFromCode(3));
            assert.equal(pluginPath, null);
            pluginPath = inst.getNewestPluginPath('test', '0.0.0');
            assert.equal(pluginPath.p, path.join(p, 'test-2'));
            assert.equal(pluginPath.ver, '0.0.0.2');
        });

        it ('should return null when get unkonw plugin', function () {
            assert.equal(inst.getPluginPath('unknown', versionparser.getVersionFromCode(1)), null);
            assert.equal(inst.getNewestPluginPath('unknown', '0.0.0'), null);
        });
    });

    describe('add new plugin', function () {
        var p = path.join(__dirname, './res/plugin');
        var inst = new SdkPluginPool(p, console);
        it('it should add a new instance', function () {
            inst.addNewPlugin('test1', versionparser.getVersionFromCode(100));
            var pluginNames = inst.getAllPluginNames();
            assert.equal(pluginNames.length, 2);
            assert.equal(pluginNames[0], 'test');
            assert.equal(pluginNames[1], 'test1');
        });
        it('add new version to exist plugin', function () {
            inst.addNewPlugin('test', versionparser.getVersionFromCode(100));
            var pluginPath = inst.getPluginPath('test', versionparser.getVersionFromCode(100));
            assert.equal(pluginPath, path.join(p, 'test-100'));
        });
        it('add existed version to exist plugin', function () {
            var version = versionparser.getVersionFromCode(2);
            inst.addNewPlugin('test', version);
            var pluginPath = inst.getPluginPath('test', version);
            assert.equal(pluginPath, path.join(p, 'test-2'));
        });
    });

});


describe('pluginmgr', function () {
    var createPluginMgr = require('../lib/plugin_mgr').createPluginMgr;
    describe ('loadAllPlugin', function () {
        var p = path.join(__dirname, './res/plugin');
        var ls = new mock.LocalSettings();
        var logger = new mock.MockLogger();
        it('should load newest test plugin', function (done) {
            var pluginMgr = createPluginMgr(ls, logger, p);
            pluginMgr.loadAllPlugins(function () {
                var inst = _.filter(pluginMgr.pluginInfos, {name: 'test', ver: '0.0.0'});
                assert.equal(inst.length, 1);
                assert.equal(inst[0].name, 'test');
                assert.equal(inst[0].ver, '0.0.0');
                assert.equal(inst[0].p, path.join(p, 'test-2'));
                done();
            });
        });
    });

    describe ('upgradePlugin', function () {
        var p = path.join(__dirname, '..', '..', 'sdkplugins');
        var ls = new mock.LocalSettings();
        var logger = new mock.MockLogger();
        it('should load newest test plugin', function (done) {
            var upgradePath = path.join(__dirname, 'res', 'plugin_to_upgrade', 'test_3.zip');
            var fileurl = upgradePath;
            after(function () {
                childProcess.exec('rm -R ' + path.join(p, 'test-3'));
            });
            var pluginMgr = createPluginMgr(ls, logger, p);
            pluginMgr.loadAllPlugins(function () {
                pluginMgr.upgradePlugin(fileurl, null, function (err, name, ver, pluginPath) {
                    assert.equal(err, null);
                    assert.equal(name, 'test');
                    assert.equal(ver, '0.0.0.3');
                    assert.equal(pluginPath, path.join(p, 'test-3'));
                    assert.equal(pluginMgr.pluginPool.getPluginPath(name, versionparser.getVersionFromCode(3)),
                        path.join(p, 'test-3'));
                    done();
                });
            });
        });
    });
});


