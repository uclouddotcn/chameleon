var assert = require('assert');
var path = require('path');
var fs = require('fs');
var filereader = require('../filereader');

describe('TaskPool', function () {
    var taskpool = null;
    before(function () {
        taskpool = new filereader.TaskPool(10);
    });
    describe('init', function () {
        it('the right state', function () {
            assert.equal(taskpool.top(), null);
            taskpool.pop();
            assert.throws(function () {
                taskpool.getTask(10);
            });
        });
    });

    describe('push&&pop', function () {
        var pushIdx = 0;
        it('move the end to next allocation', function () {
            var idx = taskpool.append({idx: pushIdx++});
            assert.equal(idx, 1);
            assert.equal(taskpool.headIdx, 0);
            assert.equal(taskpool.endIdx, 2);
        });

        it('push until full', function () {
            var idx = 0;
            for (var i = 0; i < 9; ++i) {
                idx = taskpool.append({idx: pushIdx++});
                assert.equal(idx, i + 2);
            }
            assert.ok(taskpool.isFull);
            assert.throws(function () {
                taskpool.append({idx: -1});
            });
        });

        it('top will return the head of pool', function () {
            var task = taskpool.top();
            assert.equal(task.idx, 0);
        });

        it('pop from header will move the head', function () {
            taskpool.pop();
            var task = taskpool.top();
            assert.equal(task.idx, 1);
            assert.ok(!taskpool.isFull);
            assert.notEqual(taskpool.getTask(2), null);
            assert.throws(function () {
                taskpool.getTask(1);
            });
        });

        it('should ring!!!', function () {
            assert.throws(function () {
                taskpool.getTask(0);
            });
            taskpool.pop();
            taskpool.pop();
            taskpool.pop();
            var idx = taskpool.append({idx: pushIdx++});
            assert.equal(idx, 0);
            idx = taskpool.append({idx: pushIdx++});
            assert.equal(idx, 1);
            assert.throws(function () {
                taskpool.getTask(2);
            });
        });
    })
});


describe('Reader', function () {
    var expectData = [
        {d: 'aaaa', r: 1, offset: 5},
        {d: 'bbbb', r: 2, offset: 10},
        {d: 'cccc', r: 3, offset: 15},
        {d: 'dddd', r: 4, offset: 20}
    ];

    describe('read all from file', function () {
        var readBuffer = new filereader.Reader();
        it('should read all data if not stopped', function (done) {
            readBuffer.setNewFile({
                recordNum: 0,
                offset: 0,
                _id: 'test',
                fd: fs.createReadStream(path.join(__dirname, 'data', 'test_reader.log'))
            });
            var nowIdx = 0;
            readBuffer.on('new-record', function (record, recordNum, offset) {
                assert.equal(record, expectData[nowIdx].d);
                assert.equal(recordNum, expectData[nowIdx].r);
                assert.equal(offset, expectData[nowIdx].offset);
                nowIdx++;
            });

            readBuffer.on('end', function () {
                assert.equal(nowIdx, 4);
                done();
            });
        });
    });

    describe('read while blocked', function () {
        var readBuffer = new filereader.Reader();
        it('should stop read data while be set blocked', function (done) {
            var nowIdx = 0;
            function onNewRecord(record, recordNum, offset) {
                assert.equal(recordNum, 1);
                assert.equal(nowIdx, 0);
                assert.equal(record, expectData[nowIdx].d);
                assert.equal(recordNum, expectData[nowIdx].r);
                assert.equal(offset, expectData[nowIdx].offset);
                readBuffer.setBlocked(true);
                nowIdx++;
                setTimeout(function () {
                    assert.ok(readBuffer.blocked);
                    readBuffer.removeListener('new-record', onNewRecord);
                    readBuffer.removeListener('end', onEnd);
                    done();
                }, 1000)
            }
            function onEnd() {
                assert.fail(false, false, 'should not receive end event now');
            }
            readBuffer.on('new-record', onNewRecord);
            readBuffer.on('end', onEnd);
            readBuffer.setNewFile({
                recordNum: 0,
                offset: 0,
                _id: 'test',
                fd: fs.createReadStream(path.join(__dirname, 'data', 'test_reader.log'))
            });
        });

        it('should proceed while set to no blocked', function (done) {
            var nowIdx = 1;
            readBuffer.on('new-record', function (record, recordNum, offset) {
                assert.equal(recordNum, 2);
                assert.equal(record, expectData[nowIdx].d);
                assert.equal(recordNum, expectData[nowIdx].r);
                assert.equal(offset, expectData[nowIdx].offset);
                readBuffer.setBlocked(true);
                setTimeout(function () {
                    done();
                }, 1000)
            });
            readBuffer.setBlocked(false);
        });
    });
});


