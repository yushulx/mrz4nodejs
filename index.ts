if (process.platform === 'win32') {
    console.log('Windows');
}
else if(process.platform === 'linux') {
    console.log('Linux');
}
else if(process.platform === 'darwin') {
    console.log('macOS');
}
else {
    console.log('Unknown Operating System');
}

const mrzscanner = require('./build/Release/mrzscanner');
const fs = require('fs');
const path = require('path');

class MrzScanner {
    obj : any;
    constructor() {
        this.obj = mrzscanner.MrzScanner();
    }

    static initLicense(license): number {
        return mrzscanner.initLicense(license);
    }

    static getVersionNumber(): string {
        return mrzscanner.getVersionNumber();
    }

    loadModel(): number {
        let modelPath = path.join(process.cwd(), 'MRZ.json');
        let json = fs.readFileSync(modelPath);
        let config = JSON.parse(json);
        if (config['CharacterModelArray'][0]['DirectoryPath'] === 'model') {
            config['CharacterModelArray'][0]['DirectoryPath'] = path.join(process.cwd(), 'model');
            fs.writeFileSync(modelPath, JSON.stringify(config));
        }
        return this.obj.loadModel(modelPath);
    }

    decodeFileAsync(filePath: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.obj.decodeFileAsync(filePath, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
}

module.exports = MrzScanner;

