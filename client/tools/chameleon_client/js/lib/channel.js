/**
 * Created by Administrator on 2015/1/13.
 */
function Channel(){
    this.id = 0;
    this.channelName = '';
    this.desc = '';
    this.config ={};
    this.signConfig = {};
    this.sdks = [];
}

module.exports = Channel;