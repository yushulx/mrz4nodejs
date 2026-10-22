'use strict';

/**
 * Command-line MRZ scanner example.
 *
 *   node app.js                       # scans images/1.png
 *   node app.js images/*.png          # scans several files
 *   node app.js images/3.jpg --json   # prints the raw line results as JSON
 *
 * Requires no native dependency - the recognition engine ships with
 * mrz4nodejs itself.
 */

const path = require('node:path');
const MrzScanner = require('..');

// Get a license key from
// https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform
const LICENSE_KEY = process.env.DCV_LICENSE ||
    'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==';

const args = process.argv.slice(2);
const asJson = args.indexOf('--json') !== -1;
const files = args.filter(function (arg) { return arg.charAt(0) !== '-'; });

if (files.length === 0) {
    files.push(path.join(__dirname, '..', 'images', '1.png'));
}

MrzScanner.initLicense(LICENSE_KEY);

const scanner = new MrzScanner();
// Optional: only needed when you want to point the scanner at a custom
// Capture Vision template directory.
scanner.loadModel(path.dirname(require.resolve('..')));

(async function () {
    for (const file of files) {
        console.log('\nFile: ' + file);

        const results = await scanner.decodeFileAsync(file);
        if (results.length === 0) {
            console.log('  No MRZ found.');
            continue;
        }

        if (asJson) {
            console.log(JSON.stringify(results, null, 2));
            continue;
        }

        for (const result of results) {
            console.log('  ' + result.text);
        }
        console.log('  confidence: ' + results[0].confidence + '%, box: ' +
            results[0].x1 + ',' + results[0].y1);

        const parsed = results.length === 3
            ? scanner.parseThreeLines(results[0].text, results[1].text, results[2].text)
            : scanner.parseTwoLines(results[0].text, results[1].text);

        if (parsed) {
            console.log('  ---');
            for (const key of Object.keys(parsed)) {
                console.log('  ' + (key + ':').padEnd(16) + parsed[key]);
            }
        }
    }
})().catch(function (err) {
    console.error(err);
    process.exitCode = 1;
}).finally(function () {
    if (process.platform === 'linux') {
        // Upstream issue: the SDK segfaults while the process is torn down after
        // an MRZ capture on Linux. Results above are complete.
        console.warn('\n[note] on Linux the SDK currently crashes while exiting after an MRZ capture.');
    }
});
