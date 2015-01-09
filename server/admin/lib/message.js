var msgSeq = 0;

function Message (msgid, body) {
    this.header = {
        _id: msgid
    };
    this.body = body;
    this.seq = msgSeq;
    msgSeq++;
}

Message.prototype.setBody = function (body) {
    this.body = body;
};

Message.prototype.setToReply = function (body) {
    this.header.rsp = true;
    this.body = body;
};

module.exports = Message;

