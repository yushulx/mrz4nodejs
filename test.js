var mrzscanner = require('./build/Release/mrzscanner');
var path = require('path');
console.log(mrzscanner.getVersionNumber());
var ret = mrzscanner.initLicense('DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==');
var obj = mrzscanner.MrzScanner();
ret = obj.loadModel(path.join(process.cwd(), 'MRZ.json'));

// print properties
// for (let prop in obj) {
//     console.log(prop)
//   }

// recognize MRZ from an image
obj.decodeFileAsync('images/1.png', (err, msg) => {
    console.log(msg);
});
