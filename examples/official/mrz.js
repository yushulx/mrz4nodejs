#!/usr/bin/env node
'use strict';

/**
 * Command-line MRZ scanner built on the official
 * `dynamsoft-capture-vision-for-node` package.
 *
 * Usage:
 *   node mrz.js <image-path> [options]
 *   node mrz.js <image-path> --template ReadPassport
 *   node mrz.js file1.png file2.jpg --json
 *
 * Options:
 *   --template <name>   MRZ template to use:
 *                       ReadPassportAndId (default) | ReadPassport | ReadId |
 *                       ReadVisa | ReadMRZ
 *   --json              Print raw parsed result as JSON (full detail)
 *   -h, --help          Show this help
 */

const fs = require('fs');
const path = require('path');

const {
  LicenseManager,
  CaptureVisionRouter,
  EnumPresetTemplate,
} = require('dynamsoft-capture-vision-for-node');

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------
// Get a 30-day trial license:
//   https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform
// Or a 1-day trial:
//   https://www.dynamsoft.com/customer/license/trialLicense?product=dcv&package=desktop
const LICENSE_KEY =
  process.env.DYNAMSOFT_LICENSE_KEY ||
  'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==';

// ---------------------------------------------------------------------------
// Template loading
// ---------------------------------------------------------------------------
const PACKAGE_ROOT = path.dirname(
  path.dirname(require.resolve('dynamsoft-capture-vision-for-node'))
);

const MRZ_TEMPLATES = {
  ReadPassportAndId: 'ReadPassportAndId',
  ReadPassport: 'ReadPassport',
  ReadId: 'ReadId',
  ReadVisa: 'ReadVisa',
  ReadMRZ: 'ReadMRZ',
};

// The MRZScanner.json template that ships with the package omits the
// "MRZLocalization" model from CaptureVisionModelOptions, which makes the
// LM_NEURAL_NETWORK localization stage fail with
// "Model file is not found" (dcvErrorCode -10078).
// We inject the missing model declaration so the neural-network localization
// used by the MRZ templates can find its model file.
function loadMrzSettings() {
  const templatePath = path.join(PACKAGE_ROOT, 'Templates', 'MRZScanner.json');
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

  const models = (template.CaptureVisionModelOptions =
    template.CaptureVisionModelOptions || []);
  const declared = new Set(models.map((m) => m.Name));
  for (const name of ['MRZLocalization', 'MRZCharRecognition', 'MRZTextLineRecognition']) {
    if (!declared.has(name)) {
      models.push({
        Name: name,
        MaxModelInstances: name === 'MRZTextLineRecognition' ? 1 : 4,
      });
    }
  }

  return template;
}

// ---------------------------------------------------------------------------
// Parsed-result helpers
// ---------------------------------------------------------------------------
function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function flattenChildren(node, out) {
  if (!isPlainObject(node)) return;

  // Leaf field: has a FieldName and a Value (optionally centered on
  // intermediate/group fields that also carry ChildFields, e.g. "name").
  if (node.FieldName && node.Value !== undefined && node.Value !== null) {
    out.push({ name: node.FieldName, value: node.Value });
  }

  if (Array.isArray(node.ChildFields)) {
    for (const group of node.ChildFields) {
      if (Array.isArray(group)) {
        for (const child of group) flattenChildren(child, out);
      } else if (isPlainObject(group)) {
        flattenChildren(group, out);
      }
    }
  }
}

function formatParsedMrz(item) {
  const flattened = [];
  if (item.parsed && Array.isArray(item.parsed.ResultInfo)) {
    for (const line of item.parsed.ResultInfo) flattenChildren(line, flattened);
  }

  // The flattened list may contain group fields such as:
  //   { name: 'dateOfBirth', value: '740812' }   <- Value is the raw "YYMMDD"
  // as well as leaves like birthYear/birthMonth/birthDay.
  const fields = {};
  for (const f of flattened) fields[f.name] = f.value;

  // Normalize a raw "YYMMDD" (ICAO date) to "YYYY-MM-DD" for display.
  // 60+ YY is treated as 19xx, below 60 as 20xx (per ICAO Doc 9303).
  function formatIcaoDate(raw) {
    if (typeof raw !== 'string' || !/^\d{6}$/.test(raw)) return raw;
    const yy = parseInt(raw.slice(0, 2), 10);
    const year = yy >= 60 ? `19${raw.slice(0, 2)}` : `20${raw.slice(0, 2)}`;
    return `${year}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
  }

  const lines = [];
  lines.push(`Code type   : ${item.codeType}`);

  if (fields.documentType) lines.push(`Doc type    : ${fields.documentType}`);
  if (fields.issuingState) lines.push(`Issuing st. : ${fields.issuingState}`);
  if (fields.nationality) lines.push(`Nationality : ${fields.nationality}`);
  if (fields.documentCode) lines.push(`Doc code    : ${fields.documentCode}`);
  if (fields.primaryIdentifier) lines.push(`Surname     : ${fields.primaryIdentifier}`);
  if (fields.secondaryIdentifier) lines.push(`Given names : ${fields.secondaryIdentifier}`);
  if (fields.documentNumber) lines.push(`Doc number  : ${fields.documentNumber}`);
  if (fields.sex) lines.push(`Sex         : ${fields.sex}`);
  if (fields.personalNumber) lines.push(`Personal #  : ${fields.personalNumber}`);

  if (fields.dateOfBirth) lines.push(`DOB         : ${formatIcaoDate(fields.dateOfBirth)}`);
  if (fields.dateOfExpiry) lines.push(`Expiry      : ${formatIcaoDate(fields.dateOfExpiry)}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const files = [];
  const opts = { template: 'ReadPassportAndId', json: false, help: false };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      opts.help = true;
    } else if (a === '--json') {
      opts.json = true;
    } else if (a === '--template') {
      if (i + 1 >= argv.length) {
        console.error('Error: --template requires a value');
        process.exit(1);
      }
      opts.template = argv[++i];
    } else if (a.startsWith('--template=')) {
      opts.template = a.split('=')[1];
    } else if (a.startsWith('-')) {
      console.error(`Error: unknown option "${a}"`);
      process.exit(1);
    } else {
      files.push(a);
    }
  }

  return { files, opts };
}

function printHelp() {
  console.log(`
Usage: node mrz.js <image-path> [image-path ...] [options]

Command-line MRZ (Machine Readable Zone) scanner powered by
dynamsoft-capture-vision-for-node.

Arguments:
  <image-path>            Path(s) to passport / ID / visa image file(s).
                          Supported: jpg, png, bmp, gif, pdf, tiff.

Options:
  --template <name>       MRZ template. One of:
                            ReadPassportAndId (default)
                            ReadPassport
                            ReadId
                            ReadVisa
                            ReadMRZ
  --json                  Print the raw parsed result as JSON.
  -h, --help              Show this help.
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { files, opts } = parseArgs(process.argv.slice(2));

  if (opts.help || files.length === 0) {
    printHelp();
    process.exit(opts.help ? 0 : 1);
  }

  const templateName = MRZ_TEMPLATES[opts.template];
  if (!templateName) {
    console.error(
      `Error: unknown template "${opts.template}". ` +
        `Valid templates: ${Object.keys(MRZ_TEMPLATES).join(', ')}`
    );
    process.exit(1);
  }

  console.log(`Dynamsoft Capture Vision (Node) - MRZ command-line scanner`);
  console.log(`SDK version  : ${CaptureVisionRouter.version}`);
  console.log(`Template     : ${templateName}`);
  console.log('');

  LicenseManager.initLicense(LICENSE_KEY);
  CaptureVisionRouter.initSettings(loadMrzSettings());

  let exitCode = 0;

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`[SKIP] File not found: ${file}`);
      exitCode = 1;
      continue;
    }

    console.log(`File: ${file}`);
    const result = await CaptureVisionRouter.captureAsync(file, templateName);

    if (result.errorCode !== 0) {
      console.error(`  Error: ${result.errorCode} - ${result.errorString}`);
      exitCode = 1;
      continue;
    }

    if (result.parsedResultItems.length === 0) {
      console.log(`  No MRZ found.`);
      continue;
    }

    for (const item of result.parsedResultItems) {
      if (opts.json) {
        try {
          console.log(JSON.stringify(item.parsed, null, 2));
        } catch {
          console.log(JSON.stringify(item));
        }
      } else {
        console.log(formatParsedMrz(item));
      }
    }

    const rawLines = result.textLineResultItems.map(
      (item) => item.text || item.rawText || ''
    );
    if (rawLines.length && !opts.json) {
      console.log('');
      console.log('Raw MRZ lines:');
      for (const line of rawLines) {
        console.log(`  ${line.replace(/\n/g, '\n  ')}`);
      }
    }
    console.log('');
  }

  // Terminate the worker pool so the Node.js process can exit.
  await CaptureVisionRouter.terminateIdleWorkers();
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});