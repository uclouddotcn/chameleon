var assert = require('assert');
var path = require('path');
var fs = require('fs');
var mock = require('./mock');
var childProcess = require('child_process');

describe('sdkpluginpool', function () {
    var SdkPluginPool = require('../lib/sdk_plugin_pool');
    describe('init', function () {
        var p = path.join(__dirname, './res/plugin');
        var inst = new SdkPluginPool(p, console);
        it('init should include all test version', function () {
            var pInfo = inst.plugins['test'];
            assert.equal(pInfo.name, 'test');
            assert.equal(pInfo.newest, 2);
            var pluginNames = inst.getAllPluginNames();
            assert.equal(pluginNames.length, 1);
            assert.equal(pluginNames[0], 'test');
        });

        it('get plugin path', function () {
            var pluginPath = inst.getPluginPath('test', 1);
            assert.equal(pluginPath, path.join(p, 'test-1'));
            pluginPath = inst.getPluginPath('test', 2);
            assert.equal(pluginPath, path.join(p, 'test-2'));
            pluginPath = inst.getPluginPath('test', 3);
            assert.equal(pluginPath, null);
            pluginPath = inst.getNewestPluginPath('test');
            assert.equal(pluginPath.p, path.join(p, 'test-2'));
            assert.equal(pluginPath.ver, 2);
        });

        it ('should return null when get unkonw plugin', function () {
            assert.equal(inst.getPluginPath('unknown', 1), null);
            assert.equal(inst.getNewestPluginPath('unknown'), null);
        });
    });

    describe('add new plugin', function () {
        var p = path.join(__dirname, './res/plugin');
        var inst = new SdkPluginPool(p, console);
        it('it should add a new instance', function () {
            inst.addNewPlugin('test1', 100);
            var pluginNames = inst.getAllPluginNames();
            assert.equal(pluginNames.length, 2);
            assert.equal(pluginNames[0], 'test');
            assert.equal(pluginNames[1], 'test1');
        });
        it('add new version to exist plugin', function () {
            inst.addNewPlugin('test', 100);
            var pluginPath = inst.getPluginPath('test', 100);
            assert.equal(pluginPath, path.join(p, 'test-100'));
        });
        it('add existed version to exist plugin', function () {
            inst.addNewPlugin('test', 2);
            var pluginPath = inst.getPluginPath('test', 2);
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
                var inst = pluginMgr.pluginModules['test'];
                assert.notEqual(inst, null);
                assert.equal(inst.name, 'test');
                assert.equal(inst.version, 2);
                assert.equal(inst.path, path.join(p, 'test-2'));
                done();
            });
        });
        it('using plugin from local setting', function (done) {
            ls.set('setting', 'sdkplugins', JSON.stringify({'test': 1}));
            var pluginMgr = createPluginMgr(ls, logger, p);
            pluginMgr.loadAllPlugins(function () {
                var inst = pluginMgr.pluginModules['test'];
                assert.notEqual(inst, null);
                assert.equal(inst.name, 'test');
                assert.equal(inst.version, 1);
                assert.equal(inst.path, path.join(p, 'test-1'));
                done();
            });
        });
        it('local setting of plugins is corrupted', function (done) {
            ls.set('setting', 'sdkplugins', JSON.stringify({'test': 100}));
            var pluginMgr = createPluginMgr(ls, logger, p);
            pluginMgr.loadAllPlugins(function () {
                var inst = pluginMgr.pluginModules['test'];
                assert.notEqual(inst, null);
                assert.equal(inst.name, 'test');
                assert.equal(inst.version, 2);
                assert.equal(inst.path, path.join(p, 'test-2'));
                done();
            });
        });
    });

    describe ('upgradePlugin', function () {
        var p = path.join(__dirname, './res/plugin');
        var ls = new mock.LocalSettings();
        var logger = new mock.MockLogger();
        it('should load newest test plugin', function (done) {
            var upgradePath = path.join(__dirname, 'res', 'plugin_to_upgrade', 'test_3.zip');
            var fileurl = 'file://'+upgradePath;
            after(function () {
                childProcess.exec('rm -R ' + path.join(p, 'test-3'));
            });
            var pluginMgr = createPluginMgr(ls, logger, p);
            pluginMgr.loadAllPlugins(function () {
                pluginMgr.upgradePlugin(fileurl, null, function (err, name, ver, pluginPath) {
                    assert.equal(err, null);
                    assert.equal(name, 'test');
                    assert.equal(ver, 3);
                    assert.equal(pluginPath, path.join(p, 'test-3'));
                    assert.equal(pluginMgr.pluginPool.getPluginPath(name, 3),
                        path.join(p, 'test-3'));
                    var vv = pluginMgr.usePluginAtVersion('test', 3)
                });
            });
            pluginMgr.on('plugin-upgrade', function (name, pluginModule) {
                assert.equal(name, 'test');
                assert.equal(pluginModule.name, 'test');
                assert.equal(pluginModule.version, 3);
                assert.equal(pluginModule.path, path.join(p, 'test-3'));
                done();
            });
        });
        it('upgrade a new plugin type', function (done) {
            var upgradePath = path.join(__dirname, 'res', 'plugin_to_upgrade', 'test_another.zip');
            var fileurl = 'file://'+upgradePath;
            after(function () {
                childProcess.exec('rm -R ' + path.join(p, 'test_another-1'));
            });
            var pluginMgr = createPluginMgr(ls, logger, p);
            pluginMgr.loadAllPlugins(function () {
                pluginMgr.upgradePlugin(fileurl, null, function (err, name, ver, pluginPath) {
                    assert.equal(err, null);
                    assert.equal(name, 'test_another');
                    assert.equal(ver, 1);
                    assert.equal(pluginPath, path.join(p, 'test_another-1'));
                    done();
                });
            });
        });
    });
});


