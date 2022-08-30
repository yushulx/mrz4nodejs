# Node.js MRZ Scanner SDK

The Node.js MRZ (Machine Readable Zone) Scanner SDK is Node binding to [Dynamsoft MRZ C++ SDK](https://www.dynamsoft.com/label-recognition/overview/). It helps developers to build Node.js MRZ scanning applications on Windows and Linux.


## License Key 
Get a [30-day FREE trial license](https://www.dynamsoft.com/customer/license/trialLicense/?product=dlr) to activate the SDK.

## Pre-requisites
- [Node.js](https://nodejs.org/en/download/)
- Platform-specific C/C++ compiler
- TypeScript

    ```bash
    npm install -g typescript
    npm install --save @types/node
    ```
- node-gyp

    ```
    npm i node-gyp -g
    ```

## Supported Platforms
- **Windows**
- **Linux**

## Quick Usage

```javascript
const MrzScanner = require('mrz4nodejs');
console.log(MrzScanner.getVersionNumber());
MrzScanner.initLicense('DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==');

var obj = new MrzScanner();
obj.loadModel();
(async function () {
    var result = await obj.decodeFileAsync('<image-path>');
    console.log(result);

})();

```

![Node.js MRZ scanner SDK](https://www.dynamsoft.com/codepool/img/2022/02/node-js-mrz-sdk.png)



