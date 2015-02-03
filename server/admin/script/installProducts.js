var fs = require('fs');
var path = require('path');
var AdmZip = require('adm-zip');

function main() {
    var productZip = process.argv[2];
    if (!productZip || !fs.existsSync(productZip)) {
        throw new Error('must provide a valid zip file: ' + productZip);
    }
    var productFile = path.join(__dirname, '..', '..', 'products');
    var zipfile = new AdmZip(productZip);
    var manifest = JSON.parse(zipfile.readAsText("manifest.json"));
    var product = manifest.product;
    var entries = zipfile.getEntries();
    var pat = RegExp('^'+product+'/');
    for (var i = 0; i < entries.length; ++i) {
        var entry = entries[i];
        if (pat.exec(entry.entryName)) {
            zipfile.extractEntryTo(entry, productFile, true, true);
        }
    }
}

try {
    main();
    console.log('Done');
} catch (e) {
    console.error('Fail to install products: ' + e.messgae + '\n' + e.stack);
    process.exit(-1);
}


