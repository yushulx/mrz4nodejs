const path = require('path');
const MrzScanner = require('./index');
console.log(MrzScanner.getVersionNumber());
MrzScanner.initLicense('DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==');

var obj = new MrzScanner();
var ret = obj.loadModel(path.dirname(require.resolve('./index')));
(async function () {
    var result = await obj.decodeFileAsync('images/1.png');
    console.log(result);

})();
