if (process.platform === 'win32') {
    console.log('Windows');
}
else if (process.platform === 'linux') {
    console.log('Linux');
}
else if (process.platform === 'darwin') {
    console.log('macOS');
}
else {
    console.log('Unknown Operating System');
}

const mrzscanner = require('./build/Release/mrzscanner');
const fs = require('fs');
const path = require('path');

class MrzScanner {
    obj: any;
    constructor() {
        this.obj = mrzscanner.MrzScanner();
    }

    static initLicense(license): number {
        return mrzscanner.initLicense(license);
    }

    static getVersionNumber(): string {
        return mrzscanner.getVersionNumber();
    }

    loadModel(modelDir: string): number {
        let modelPath = path.join(modelDir, 'MRZ.json');
        let json = fs.readFileSync(modelPath);
        let config = JSON.parse(json);
        if (config['CharacterModelArray'][0]['DirectoryPath'] === 'model') {
            config['CharacterModelArray'][0]['DirectoryPath'] = path.join(modelDir, 'model');
            // fs.writeFileSync(modelPath, JSON.stringify(config));
        }
        return this.obj.loadModel(JSON.stringify(config));
    }

    decodeFileAsync(filePath: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.obj.decodeFileAsync(filePath, (err, result) => {
                setTimeout(() => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                }, 0);

            });
        });
    }

    decodeBufferAsync(buffer: Buffer, width: number, height: number, stride: number): Promise<any> {
        return new Promise((resolve, reject) => {
            this.obj.decodeBufferAsync(buffer, width, height, stride, (err, result) => {
                setTimeout(() => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                }, 0);
            });
        });
    }

    parseTwoLines(line1: string, line2: string): any {
        let mrzInfo: any = {};
        let type = line1.substring(0, 1);
        if (!(/[I|P|V]/.test(type))) return false;
        if (type === 'P') {
            mrzInfo.type = 'PASSPORT (TD-3)';
        } else if (type === 'V') {
            if (line1.length === 44) {
                mrzInfo.type = 'VISA (MRV-A)';
            } else if (line1.length === 36) {
                mrzInfo.type = 'VISA (MRV-B)';
            }
        } else if (type === 'I') {
            mrzInfo.type = 'ID CARD (TD-2)'
        }
        // Get issuing State infomation
        let nation = line1.substring(2, 5);
        if (/[0-9]/.test(nation)) return false;
        if (nation[nation.length - 1] === '<') {
            nation = nation.substr(0, 2);
        }
        mrzInfo.nationality = nation;
        // Get surname information
        line1 = line1.substring(5);
        var pos = line1.indexOf("<<");
        let surName = line1.substring(0, pos);
        if (/[0-9]/.test(surName)) return false;
        surName = surName.replace(/\</g, " ");
        mrzInfo.surname = surName;
        // Get givenname information
        let givenName = line1.substring(surName.length + 2);
        if (/[0-9]/.test(givenName)) return false;
        givenName = givenName.replace(/\</g, " ");
        givenName = givenName.trim();
        mrzInfo.givenname = givenName;
        // Get passport number information
        let passportNumber: string;
        passportNumber = line2.substring(0, 9);
        passportNumber = passportNumber.replace(/\</g, " ");
        mrzInfo.passportnumber = passportNumber;
        // Get Nationality information
        let issueCountry = line2.substr(10, 3);
        if (/[0-9]/.test(issueCountry)) return false;
        if (issueCountry[issueCountry.length - 1] == '<') {
            issueCountry = issueCountry.substr(0, 2);
        }
        mrzInfo.issuecountry = issueCountry;
        // Get date of birth information
        let birth = line2.substr(13, 6);
        let date = new Date();
        let currentYear = date.getFullYear();
        if (parseInt(birth.substr(0, 2)) > (currentYear % 100)) {
            birth = "19" + birth;
        } else {
            birth = "20" + birth;
        }
        birth = birth.slice(0, 4) + "-" + birth.slice(4, 6) + "-" + birth.slice(6);
        if (/[A-Za-z]/.test(birth)) return false;
        mrzInfo.birth = birth;
        // Get gender information
        let gender = line2[20];
        if (!(/[M|F|x|<]/.test(gender))) return false;
        mrzInfo.gender = gender;
        // Get date of expiry information
        let expiry = line2.substr(21, 6);
        if (/[A-Za-z]/.test(expiry)) return false;
        if (parseInt(expiry.substring(0, 2)) >= 60) {
            expiry = '19' + expiry;
        } else {
            expiry = '20' + expiry;
        }
        expiry = expiry.slice(0, 4) + "-" + expiry.slice(4, 6) + "-" + expiry.slice(6);
        mrzInfo.expiry = expiry;
        return mrzInfo;
    };

    parseThreeLines(line1: string, line2: string, line3: string): any {
        let mrzInfo: any = {};
        let type = line1.substring(0, 1);
        if (!(/[I|P|V]/.test(type))) return false;
        mrzInfo.type = 'ID CARD (TD-1)';
        // Get nationality infomation
        let nation = line2.substring(15, 18);
        if (/[0-9]/.test(nation)) return false;
        nation = nation.replace(/\</g, '');
        mrzInfo.nationality = nation;
        // Get surname information
        var pos = line3.indexOf("<<");
        let surName = line3.substring(0, pos);
        if (/[0-9]/.test(surName)) return false;
        surName = surName.replace(/\</g, " ");
        mrzInfo.surname = surName;
        // Get givenname information
        let givenName = line3.substring(surName.length + 2);
        if (/[0-9]/.test(givenName)) return false;
        givenName = givenName.replace(/\</g, " ");
        givenName = givenName.trim();
        mrzInfo.givenname = givenName;
        // Get passport number information
        let passportNumber: string;
        passportNumber = line1.substring(5, 14);
        passportNumber = passportNumber.replace(/\</g, " ");
        mrzInfo.passportnumber = passportNumber;
        // Get issuing country or organization information
        let issueCountry = line1.substring(2, 5);
        if (/[0-9]/.test(issueCountry)) return false;
        issueCountry = issueCountry.replace(/\</g, '');
        mrzInfo.issuecountry = issueCountry;
        // Get date of birth information
        let birth = line2.substring(0, 6);
        if (/[A-Za-z]/.test(birth)) return false;
        let date = new Date();
        let currentYear = date.getFullYear();
        if (parseInt(birth.substr(0, 2)) > (currentYear % 100)) {
            birth = "19" + birth;
        } else {
            birth = "20" + birth;
        }
        birth = birth.slice(0, 4) + "-" + birth.slice(4, 6) + "-" + birth.slice(6);
        mrzInfo.birth = birth;
        // Get gender information
        let gender = line2[7];
        if (!(/[M|F|X|<]/.test(gender))) return false;
        gender = gender.replace('<', 'X');
        mrzInfo.gender = gender;
        // Get date of expiry information
        let expiry = "20" + line2.substring(8, 14);
        if (/[A-Za-z]/.test(expiry)) return false;
        expiry = expiry.slice(0, 4) + "-" + expiry.slice(4, 6) + "-" + expiry.slice(6);
        mrzInfo.expiry = expiry;
        return mrzInfo;
    }
}

module.exports = MrzScanner;

