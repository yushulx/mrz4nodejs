const cv = require('opencv4nodejs');
const drawParams = { color: new cv.Vec(0, 255, 0), thickness: 2 }
const fontFace = cv.FONT_HERSHEY_SIMPLEX;
const fontScale = 0.5;
const textColor = new cv.Vec(255, 0, 0);
const thickness = 2;

const path = require('path');
const MrzScanner = require('mrz4nodejs');
console.log(MrzScanner.getVersionNumber());
MrzScanner.initLicense('DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==');

var obj = new MrzScanner();
var ret = obj.loadModel(path.dirname(require.resolve('mrz4nodejs')));
(async function () {
    try {
        // var result = await obj.decodeFileAsync('test.png');
        let img = cv.imread('test.png');

        var results = await obj.decodeBufferAsync(img.getData(), img.cols, img.rows, img.step);

        console.log(results);

        if (results.length == 2) {
            console.log(obj.parseTwoLines(results[0].text, results[1].text));
        }
        else if (results.length == 3) {
            console.log(obj.parseThreeLines(results[0].text, results[1].text, results[2].text));
        }

        for (index in results) {
            let result = results[index];

            let upperLeft = new cv.Point(result.x1, result.y1)
            let bottomLeft = new cv.Point(result.x2, result.y2)
            let upperRight = new cv.Point(result.x3, result.y3)
            let bottomRight = new cv.Point(result.x4, result.y4)

            img.drawLine(
                upperLeft,
                bottomLeft,
                drawParams
            )
            img.drawLine(
                bottomLeft,
                upperRight,
                drawParams
            )

            img.drawLine(
                upperRight,
                bottomRight,
                drawParams
            )
            img.drawLine(
                bottomRight,
                upperLeft,
                drawParams
            )

            // img.putText(result.text, new cv.Point(result.x1, result.y1), fontFace, fontScale, textColor, thickness);
        }

        cv.imshow('MRZ Scanner', img);
        const key = cv.waitKey(0); 
    } catch (error) {
        console.log(error);
    }

    
})();
