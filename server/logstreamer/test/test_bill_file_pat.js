var assert = require('assert');
var path = require('path');
var fs = require('fs');
var BillFilePat = require('../bill_file_pat');

describe('BillFilePat', function () {
    var filePat = null;
    before(function () {
        filePat = new BillFilePat(path.join(__dirname, 'data'));
    });
    describe('init', function () {
        it('open the oldest log file', function () {
            var nowf = filePat.open();
            assert.notEqual(nowf, null);
            assert.equal(nowf._id, '15059');
            assert.equal(nowf.offset, 0);
            assert.equal(nowf.lineNum, 0);
            filePat.close(nowf);
        });

        it('open the log file with last pos', function (done) {
            var nowf = filePat.open('15065', 1, 1);
            assert.notEqual(nowf, null);
            assert.equal(nowf._id, '15065');
            assert.equal(nowf.offset, 1);
            assert.equal(nowf.lineNum, 1);
            nowf.fd.on('readable', function () {
                var s = nowf.fd.read();
                s = s.toString('utf8');
                assert.equal(s.substr(0,1), '"');
                filePat.close(nowf);
                done();
            });
        });

        it('open the next log file if last file is gone', function () {
            var nowf = filePat.open('15062', 1, 1);
            assert.notEqual(nowf, null);
            assert.equal(nowf._id, '15065');
            assert.equal(nowf.offset, 0);
            assert.equal(nowf.lineNum, 0);
            filePat.close(nowf);
        });
    });

    describe('next', function () {

        it('checkNext return true if have next', function () {
            var nowf = filePat.open('15059', 1, 1);
            assert.ok(filePat.checkIfHaveNew(nowf));
        });

        it('next should return the valid next one', function () {
            var nowf = filePat.open('15065', 1, 1);
            nowf = filePat.next(nowf);
            assert.notEqual(nowf, null);
            assert.equal(nowf._id, '15066');
            nowf = filePat.next(nowf);
            assert.equal(nowf, null);
        })
    });
});


