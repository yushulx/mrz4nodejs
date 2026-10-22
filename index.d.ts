/**
 * Type definitions for mrz4nodejs.
 *
 * The package is CommonJS: `module.exports = MrzScanner`.
 */

declare class MrzScanner {
    static initLicense(license: string): number;
    static getVersionNumber(): string;

    /**
     * Kept for backward compatibility. The MRZ models ship with the npm package,
     * so the directory is only used when it contains a Capture Vision template
     * (`MRZ.json` with a `CaptureVisionTemplates` array).
     */
    loadModel(modelDir: string): number;

    /** Switch the preset used by decode*Async(). Defaults to 'ReadPassportAndId'. */
    setTemplate(templateName: MrzScanner.TemplateName): void;

    decodeFileAsync(filePath: string): Promise<MrzScanner.MrzLineResult[]>;

    /** Raw pixels. The format is inferred from the stride: width => gray, width*3 => RGB, width*4 => ARGB. */
    decodeBufferAsync(
        buffer: Uint8Array | Buffer,
        width: number,
        height: number,
        stride: number
    ): Promise<MrzScanner.MrzLineResult[]>;

    parseTwoLines(line1: string, line2: string): MrzScanner.MrzInfo | false;
    parseThreeLines(line1: string, line2: string, line3: string): MrzScanner.MrzInfo | false;
}

declare namespace MrzScanner {
    type TemplateName = 'ReadPassportAndId' | 'ReadPassport' | 'ReadId' | 'ReadVisa' | 'ReadMRZ';

    interface MrzLineResult {
        confidence: number;
        text: string;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        x3: number;
        y3: number;
        x4: number;
        y4: number;
    }

    interface MrzInfo {
        type: string;
        nationality: string;
        surname: string;
        givenname: string;
        passportnumber: string;
        issuecountry: string;
        birth: string;
        gender: string;
        expiry: string;
    }
}

export = MrzScanner;
