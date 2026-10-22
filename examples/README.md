# Examples

## Command line

Scans one or more images and prints the MRZ lines plus the parsed fields. No native dependency and no
`npm install` needed - it uses the `mrz4nodejs` source in this repository.

```bash
node app.js                          # scans images/1.png
node app.js ../images/3.jpg          # scans a specific file
node app.js ../images/*.png --json   # raw line results as JSON
```

Sample output:

```
File: /path/to/mrz4nodejs/images/1.png
  P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
  L898902C36UTO7408122F1204159ZE184226B<<<<<10
  confidence: 97%, box: 35,409
  ---
  type:           PASSPORT (TD-3)
  nationality:    UTO
  surname:        ERIKSSON
  givenname:      ANNA MARIA
  passportnumber: L898902C3
  issuecountry:   UTO
  birth:          1974-08-12
  gender:         F
  expiry:         2012-04-15
```

## Official command-line example

[`official/mrz.js`](./official/mrz.js) talks to `dynamsoft-capture-vision-for-node` directly, without the
`mrz4nodejs` wrapper. It has its own `package.json`, so install its dependencies first:

```bash
cd official
npm install
node mrz.js ../../images/1.png
node mrz.js ../../images/3.jpg --template ReadId
```
