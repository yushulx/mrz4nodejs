if (process.platform === 'win32') {
    console.log('Windows');
}
else if(process.platform === 'linux') {
    console.log('Linux');
}
else if(process.platform === 'darwin') {
    console.log('macOS');
}
else {
    console.log('Unknown Operating System');
}

var mrz = require('./build/Release/mrzscanner');
var path = require('path');

class MrzScanner {
    private nativeHandler: number;

    constructor() {
        this.nativeHandler = mrz.createInstance();
        console.log('node js print: ' + this.nativeHandler);
    }

    static initLicense(license): number {
        return mrz.initLicense(license);
    }

    destroyInstance(): void {
        mrz.destroyInstance(this.nativeHandler);
    }

    getVersionNumber(): string {
        return mrz.getVersionNumber();
    }

    loadModel(): number {
        console.log(__dirname);
        console.log(process.cwd());
        return mrz.loadModel(this.nativeHandler, path.join(process.cwd(), 'MRZ.json'));
    }
}

module.exports = MrzScanner;

console.log(mrz.getVersionNumber());
var ret = MrzScanner.initLicense('DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==');
console.log(ret);
var mrzscanner = new MrzScanner();
ret = mrzscanner.loadModel();
console.log(ret);
mrzscanner.destroyInstance();
console.log('end');
