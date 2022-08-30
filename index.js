if (process.platform === 'win32') {
    console.log('Windows');
}
else if (process.platform === 'linux') {
    console.log('Linux');
}
else if (process.platform === 'darwin') {
    console.log('macOS');
}
else {
    console.log('Unknown Operating System');
}
var mrzscanner = require('./build/Release/mrzscanner');
var fs = require('fs');
var path = require('path');
var MrzScanner = /** @class */ (function () {
    function MrzScanner() {
        this.obj = mrzscanner.MrzScanner();
    }
    MrzScanner.initLicense = function (license) {
        return mrzscanner.initLicense(license);
    };
    MrzScanner.getVersionNumber = function () {
        return mrzscanner.getVersionNumber();
    };
    MrzScanner.prototype.loadModel = function () {
        var modelPath = path.join(process.cwd(), 'MRZ.json');
        var json = fs.readFileSync(modelPath);
        var config = JSON.parse(json);
        if (config['CharacterModelArray'][0]['DirectoryPath'] === 'model') {
            config['CharacterModelArray'][0]['DirectoryPath'] = path.join(process.cwd(), 'model');
            fs.writeFileSync(modelPath, JSON.stringify(config));
        }
        return this.obj.loadModel(modelPath);
    };
    MrzScanner.prototype.decodeFileAsync = function (filePath) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.obj.decodeFileAsync(filePath, function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    };
    return MrzScanner;
}());
module.exports = MrzScanner;
