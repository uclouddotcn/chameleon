/**
 * Created by Administrator on 2015/1/12.
 */
function Version(str) {
    var t = str.split('.');
    this.major = parseInt(t[0]);
    this.medium = parseInt(t[1]);
    this.minor = parseInt(t[2]);
    if (t.length == 4) {
        this.build = parseInt(t[3]);
    } else {
        this.build = 0;
    }
}

Version.prototype.compare = function(that){
    if(this.major > that.major) return 1;
    if(this.major < that.major) return -1;
    if(this.medium > that.medium) return 1;
    if(this.medium < that.medium) return -1;
    if(this.minor > that.minor) return 1;
    if(this.minor < that.minor) return -1;
    if(this.build > that.build) return 1;
    if(this.build < that.build) return -1;
    return 0;
}

Version.prototype.isMajorUpgrade = function(that) {
    return (this.major > that.major) || (this.major === that.major && this.medium > that.medium);
}

Version.prototype.toString = function() {
    return this.major+'.'+this.medium+'.'+this.minor+'.'+this.build;
}

module.exports = Version;
