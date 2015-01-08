function main (argv) {
    var m = argv[0];
    var p = argv[1];
    var args = argv.splice(2);
    var main = require(m).main;
    main(p, args);
}

module.exports.main = main;

if (require.main === module) {
    main(process.argv.splice(2));
}
