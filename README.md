# Node.js MRZ Scanner SDK

Node.js MRZ (Machine Readable Zone) scanner for passports, ID cards and visas. It exposes the familiar
`mrz4nodejs` API on top of
[dynamsoft-capture-vision-for-node](https://www.npmjs.com/package/dynamsoft-capture-vision-for-node),
which means:

- **No native build step.** No `node-gyp`, no C++ compiler, no prebuilt `.node` binaries.
- **Always the latest Dynamsoft MRZ engine.** The engine ships as a regular npm dependency.
- **Unchanged JavaScript API.** Existing `mrz4nodejs` code keeps working without modification.

```js
const MrzScanner = require('mrz4nodejs');

MrzScanner.initLicense('LICENSE-KEY');

const scanner = new MrzScanner();
const lines = await scanner.decodeFileAsync('passport.png');
console.log(scanner.parseTwoLines(lines[0].text, lines[1].text));
```

## License Key

Get a [30-day FREE trial license](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)
to activate the SDK.

```js
MrzScanner.initLicense('DLS2eyJoYW5kc2hha2VDb2RlIjoi...');
```

## Installation

```bash
npm install mrz4nodejs
```

Requirements:

- Node.js >= 16
- Windows (x64 / x86), Linux (x64 / arm64) or macOS (x64 / arm64). The platform specific native library is
  pulled in automatically as an optional dependency of `dynamsoft-capture-vision-for-node`.

## Supported Documents

| Document | MRZ format | Lines |
|---|---|---|
| Passport | TD-3 | 2 |
| ID card | TD-1 | 3 |
| ID card | TD-2 | 2 |
| Visa | MRV-A / MRV-B | 2 |

## API

- `MrzScanner.initLicense(license: string): number`
- `MrzScanner.getVersionNumber(): string`
- `scanner.loadModel(modelDir: string): number`
- `scanner.setTemplate(templateName: string): void`
- `scanner.decodeFileAsync(filePath: string): Promise<MrzLineResult[]>`
- `scanner.decodeBufferAsync(buffer, width, height, stride): Promise<MrzLineResult[]>`
- `scanner.parseTwoLines(line1, line2): MrzInfo | false`
- `scanner.parseThreeLines(line1, line2, line3): MrzInfo | false`

**MrzLineResult**

```ts
{
  confidence: number,  // recognition confidence of the MRZ block
  text: string,        // one MRZ line, e.g. "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
  x1, y1, x2, y2, x3, y3, x4, y4: number  // bounding quad of that line
}
```

`decodeFileAsync()` and `decodeBufferAsync()` return **one item per MRZ line**, so
`parseTwoLines(result[0].text, result[1].text)` keeps working exactly as before.

## Usage

Basic steps:

1. Set the license key.

    ```js
    MrzScanner.initLicense('LICENSE-KEY');
    ```

2. Create an MRZ scanner object.

    ```js
    const scanner = new MrzScanner();
    ```

3. (Optional) Point the scanner at a custom template directory. The MRZ models ship with the npm package,
   so this step is only needed when `modelDir` contains a Capture Vision template (`MRZ.json` with a
   `CaptureVisionTemplates` array). It is kept so existing code keeps working.

    ```js
    scanner.loadModel(path.dirname(require.resolve('mrz4nodejs')));
    ```

4. Recognize MRZ lines from an image file.

    ```js
    const result = await scanner.decodeFileAsync('passport.png');
    console.log(result);
    ```

5. Parse the MRZ information.

    ```js
    const info = result.length === 3
        ? scanner.parseThreeLines(result[0].text, result[1].text, result[2].text)
        : scanner.parseTwoLines(result[0].text, result[1].text);

    console.log(info);
    // {
    //   type: 'PASSPORT (TD-3)',
    //   nationality: 'UTO',
    //   surname: 'ERIKSSON',
    //   givenname: 'ANNA MARIA',
    //   passportnumber: 'L898902C3',
    //   issuecountry: 'UTO',
    //   birth: '1974-08-12',
    //   gender: 'F',
    //   expiry: '2012-04-15'
    // }
    ```

6. Or recognize raw pixels (for example a camera frame).

    ```js
    // Buffer holding RGB pixels
    const result = await scanner.decodeBufferAsync(rgbBuffer, width, height, width * 3);
    ```

## Templates

`setTemplate()` switches the preset used by the decode calls:

| Template | Purpose |
|---|---|
| `ReadPassportAndId` (default) | Passports, ID cards and visas |
| `ReadPassport` | Passports (TD-3) |
| `ReadId` | ID cards (TD-1 / TD-2) |
| `ReadVisa` | Visas (MRV-A / MRV-B) |
| `ReadMRZ` | Any MRZ |

## Behaviour Notes

- **One result per MRZ line.** The engine returns one block per document; the block text is split on `\n`
  and a quad is interpolated per line, so the historical `result[0..2].text` shape is preserved.
- **Errors are reported.** Failures (invalid license, unreadable file) reject the promise. Older versions
  resolved with an empty array.
- **`getVersionNumber()`** returns the Capture Vision version, e.g.
  `js:3.6.4002.20261019;cpp:3.6.40.9167`.
- **Decoding runs in worker threads** managed by the SDK, so it never blocks the event loop. The worker pool
  is shut down shortly after the last decode, which lets short-lived scripts exit on their own.

## Known Issue (Linux)

`dynamsoft-capture-vision-for-node` currently **segfaults while the process is being torn down** after an MRZ
capture on Linux. The decoding itself is unaffected - results are returned correctly, and long-running
processes (servers) are fine - but a CLI that has scanned a passport/ID exits with code `139` instead of `0`.

Facts gathered while investigating:

| Scenario | Windows | Linux |
|---|---|---|
| Barcode capture (`barcode4nodejs`) | exit 0 | exit 0 |
| MRZ capture (`mrz4nodejs`) | exit 0 | **SIGSEGV at exit** |
| MRZ settings loaded, no capture | exit 0 | exit 0 |

It reproduces with `dynamsoft-capture-vision-for-node` 3.6.4000 and 3.6.4002 (same native library
3.6.40.9167), with and without worker threads, and with every MRZ preset - so it comes from the native
Label Recognizer teardown, not from this wrapper. Dynamsoft's own reference CLI
(`examples/official/mrz.js`, which talks to the SDK directly) shows the same behaviour: exit `0` on Windows,
exit `139` on Linux. `npm test` detects the situation and reports success when every check passed before the
crash.

## Examples

- [Command line](./examples/app.js)

    ```bash
    node examples/app.js
    node examples/app.js images/3.jpg --json
    ```

- [Official command-line example (raw Capture Vision API)](./examples/official/mrz.js)

    ```bash
    cd examples/official && npm install
    node mrz.js ../../images/1.png
    ```

## Testing

```bash
npm test
DCV_LICENSE=YOUR-LICENSE-KEY npm test
```

## License

MIT
