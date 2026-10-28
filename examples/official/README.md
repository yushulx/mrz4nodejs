# MRZ Command-Line Scanner (Official Package)

A command-line MRZ (Machine Readable Zone) scanner for passports, ID cards and
visas, built on the official
[`dynamsoft-capture-vision-for-node`](https://www.npmjs.com/package/dynamsoft-capture-vision-for-node)
package (Dynamsoft Capture Vision SDK).

No OpenCV / native build required — the SDK ships precompiled binaries for
Windows (x86/x64), Linux (x64/arm64) and macOS (x64/arm64).

## Installation

```bash
npm install
```

This installs two packages:

| Package | Purpose |
| --- | --- |
| `dynamsoft-capture-vision-for-node` | The Capture Vision SDK (engine + templates + MRZ parser resources) |
| `dynamsoft-capture-vision-for-node-model` | AI models (`MRZLocalization.data`, `MRZCharRecognition.data`, …) required by the MRZ templates |

## Usage

```bash
node mrz.js <image-path> [image-path ...] [options]
```

### Examples

```bash
# Recognize MRZ from a passport image (passport + ID + visa + plain MRZ template)
node mrz.js ../../images/1.png

# Multiple files
node mrz.js passport.png id-card.jpg visa.jpg

# Use a specific MRZ template
node mrz.js ../../images/1.png --template ReadPassport

# Print the raw parsed result as JSON
node mrz.js ../../images/1.png --json
```

### Options

| Option | Description |
| --- | --- |
| `--template <name>` | MRZ template: `ReadPassportAndId` (default), `ReadPassport`, `ReadId`, `ReadVisa`, `ReadMRZ` |
| `--json` | Print the full parsed result JSON |
| `-h`, `--help` | Show help |

### Supported image formats

`jpg`, `png`, `bmp`, `gif`, `pdf`, `tiff` (via the capture `like` APIs, which
also accept raw buffers).

## Sample Output

```
Dynamsoft Capture Vision (Node) - MRZ command-line scanner
SDK version  : js:3.6.4002.20261019;cpp:3.6.40.9167
Template     : ReadPassportAndId

File: ../../images/1.png
Code type   : MRTD_TD3_PASSPORT
Issuing st. : UTO
Nationality : UTO
Doc code    : P
Surname     : ERIKSSON
Given names : ANNA MARIA
Sex         : female
Personal #  : ZE184226B
DOB         : 1974-08-12
Expiry      : 2012-04-15

Raw MRZ lines:
  P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
  L898902C36UTO7408122F1204159ZE184226B<<<<<10
```

## License

Get a free trial license for the SDK:

- 30-day trial: <https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform>

The CLI reads the license from the environment variable
`DYNAMSOFT_LICENSE_KEY` if set, otherwise it falls back to a public short-lived
trial key embedded in `mrz.js`.

## Notes / Pitfalls

- **Model file not found**: `3.2.x` shipped an `MRZScanner.json` template that
  omitted `MRZLocalization` from `CaptureVisionModelOptions`. Without it, the
  neural-network localization stage (`LM_NEURAL_NETWORK`) failed with
  `Model file is not found` (`dcvErrorCode -10078`). `3.6.4000` and later
  declare all four MRZ models, so the template loads as-is; `mrz.js` still
  injects any missing declaration at startup as a no-op guard for older
  packages (see `loadMrzSettings()`).
- **Process exit**: `CaptureVisionRouter.terminateIdleWorkers()` is called at
  the end so the SDK's worker pool does not keep the Node.js process alive.
- **Linux exit crash — fixed in 3.6.4003**: 3.6.4000 - 3.6.4002 segfaulted while
  the process was being torn down after an MRZ capture on Linux (exit code
  `139`). `dynamsoft-capture-vision-for-node@3.6.4003` exits with `0`, so pin at
  least that version if you run MRZ scanning on Linux.
- The `dynamsoft-capture-vision-for-node-model` package is a **required** peer
  dependency for text recognition tasks — install it explicitly.

## References

- Package: <https://www.npmjs.com/package/dynamsoft-capture-vision-for-node>
- Official samples: <https://github.com/Dynamsoft/capture-vision-nodejs-samples>
- Capture Vision docs: <https://www.dynamsoft.com/capture-vision/docs/>