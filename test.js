'use strict';

/**
 * Test suite / sample.
 *
 *   node test.js                     # uses the bundled trial license
 *   DCV_LICENSE=YOUR-KEY node test.js
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PNG } = require('pngjs');

const MrzScanner = require('./index.js');

const RESULT_FILE = path.join(os.tmpdir(), 'mrz4nodejs-test-result.json');
const IS_CHILD = process.env.MRZ_TEST_CHILD === '1';

/**
 * Known upstream issue: `dynamsoft-capture-vision-for-node` segfaults while the
 * process is being torn down after a Label Recognizer (MRZ) capture on Linux.
 * The decoding itself is fine - the crash happens on exit, after every result
 * has been produced.
 *
 * To keep CI meaningful, on Linux the suite is executed in a child process and
 * the crash is tolerated as long as the child reported that every check passed.
 */
if (process.platform === 'linux' && !IS_CHILD) {
    const { spawnSync } = require('node:child_process');
    try {
        fs.unlinkSync(RESULT_FILE);
    } catch (err) {
        // ignore
    }

    const child = spawnSync(process.execPath, [__filename].concat(process.argv.slice(2)), {
        encoding: 'utf8',
        env: Object.assign({}, process.env, { MRZ_TEST_CHILD: '1' })
    });

    process.stdout.write(child.stdout || '');
    process.stderr.write(child.stderr || '');

    let report = null;
    try {
        report = JSON.parse(fs.readFileSync(RESULT_FILE, 'utf-8'));
    } catch (err) {
        // ignore, fall back to the exit code
    }

    if (child.status === 0) {
        process.exit(0);
    }
    if (report && report.failed === 0 && child.signal === 'SIGSEGV') {
        console.warn('\n[known issue] the SDK segfaults while exiting after an MRZ capture on Linux.');
        console.warn('All ' + report.passed + ' checks passed before that, treating the run as successful.');
        console.warn('Tracking: https://github.com/yushulx/mrz4nodejs/issues');
        process.exit(0);
    }
    process.exit(1);
}

const LICENSE = process.env.DCV_LICENSE ||
    'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==';

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
    if (ok) {
        pass++;
        console.log('PASS  ' + name + (detail ? '  |  ' + detail : ''));
    } else {
        fail++;
        console.log('FAIL  ' + name + (detail ? '  |  ' + detail : ''));
    }
}

function pngToBuffers(file) {
    const png = PNG.sync.read(fs.readFileSync(file));
    const gray = Buffer.alloc(png.width * png.height);
    const rgb = Buffer.alloc(png.width * png.height * 3);

    for (let i = 0; i < png.width * png.height; i++) {
        const r = png.data[i * 4];
        const g = png.data[i * 4 + 1];
        const b = png.data[i * 4 + 2];
        gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        rgb[i * 3] = r;
        rgb[i * 3 + 1] = g;
        rgb[i * 3 + 2] = b;
    }

    return { gray, rgb, width: png.width, height: png.height };
}

(async function () {
    check('API surface', typeof MrzScanner === 'function' &&
        typeof MrzScanner.initLicense === 'function' &&
        typeof MrzScanner.getVersionNumber === 'function' &&
        typeof MrzScanner.prototype.decodeFileAsync === 'function' &&
        typeof MrzScanner.prototype.decodeBufferAsync === 'function' &&
        typeof MrzScanner.prototype.parseTwoLines === 'function' &&
        typeof MrzScanner.prototype.parseThreeLines === 'function');

    if (MrzScanner.initLicense(LICENSE) !== 0) {
        console.log('\nLicense unavailable - skipping the decoding tests.');
        if (fail) {
            process.exitCode = 1;
        }
        return;
    }
    check('initLicense', true);
    check('getVersionNumber', typeof MrzScanner.getVersionNumber() === 'string', MrzScanner.getVersionNumber());

    const scanner = new MrzScanner();
    check('loadModel', scanner.loadModel(path.dirname(require.resolve('./index.js'))) === 0);

    const cases = [
        { file: 'images/1.png', lines: 2, expect: { type: 'PASSPORT (TD-3)', surname: 'ERIKSSON', givenname: 'ANNA MARIA', passportnumber: 'L898902C3', birth: '1974-08-12', gender: 'F', expiry: '2012-04-15' } },
        { file: 'images/2.png', lines: 2, expect: { type: 'ID CARD (TD-2)', surname: 'ERIKSSON', passportnumber: 'D23145890', gender: 'F' } },
        { file: 'images/3.jpg', lines: 3, expect: { type: 'ID CARD (TD-1)', surname: 'VADIS', givenname: 'QUO', passportnumber: 'S0002068 ', birth: '1981-02-28', expiry: '2013-01-01' } },
        { file: 'images/4.png', lines: 2, expect: { type: 'PASSPORT (TD-3)', surname: 'AMAN', givenname: 'RITA TANIA', birth: '1984-12-07', gender: 'M' } }
    ];

    const signature = function (results) {
        return results.map(function (r) { return r.text; }).join('|');
    };

    for (const testCase of cases) {
        const results = await scanner.decodeFileAsync(testCase.file);

        check('decodeFileAsync ' + testCase.file + ' -> ' + testCase.lines + ' line(s)',
            results.length === testCase.lines, signature(results));

        const first = results[0];
        const hasShape = ['x1', 'y1', 'x2', 'y2', 'x3', 'y3', 'x4', 'y4', 'confidence', 'text']
            .every(function (key) { return key in first; });
        check('result shape ' + testCase.file, hasShape,
            'confidence=' + first.confidence + ' box=' + first.x1 + ',' + first.y1);

        const parsed = testCase.lines === 3
            ? scanner.parseThreeLines(results[0].text, results[1].text, results[2].text)
            : scanner.parseTwoLines(results[0].text, results[1].text);

        const mismatches = Object.keys(testCase.expect).filter(function (key) {
            return parsed[key] !== testCase.expect[key];
        });
        check('parse ' + testCase.file, parsed && mismatches.length === 0,
            mismatches.length
                ? mismatches.map(function (k) { return k + '=' + parsed[k]; }).join(', ')
                : JSON.stringify(parsed));
    }

    // Raw pixel input: grayscale and RGB must produce the same MRZ lines.
    const pixels = pngToBuffers('images/1.png');
    const expected = signature(await scanner.decodeFileAsync('images/1.png'));

    const fromGray = await scanner.decodeBufferAsync(pixels.gray, pixels.width, pixels.height, pixels.width);
    check('decodeBufferAsync grayscale', signature(fromGray) === expected, fromGray.length + ' line(s)');

    const fromRgb = await scanner.decodeBufferAsync(pixels.rgb, pixels.width, pixels.height, pixels.width * 3);
    check('decodeBufferAsync RGB', signature(fromRgb) === expected, fromRgb.length + ' line(s)');

    // A blank image must not throw.
    const blank = Buffer.alloc(320 * 240 * 3, 255);
    const blankResult = await scanner.decodeBufferAsync(blank, 320, 240, 320 * 3);
    check('blank image returns []', Array.isArray(blankResult) && blankResult.length === 0);

    // Template switch: ReadMRZ must return the same lines as ReadPassportAndId.
    const viaDefault = await scanner.decodeFileAsync('images/4.png');
    scanner.setTemplate('ReadMRZ');
    const viaReadMrz = await scanner.decodeFileAsync('images/4.png');
    scanner.setTemplate('ReadPassportAndId');
    check('setTemplate(ReadMRZ)', signature(viaReadMrz) === signature(viaDefault), signature(viaReadMrz));

    console.log('\n==== ' + pass + ' passed, ' + fail + ' failed ====');
    try {
        fs.writeFileSync(RESULT_FILE, JSON.stringify({ passed: pass, failed: fail }));
    } catch (err) {
        // ignore
    }
    if (fail) {
        process.exitCode = 1;
    }
})().catch(function (err) {
    console.error(err);
    process.exitCode = 1;
});
