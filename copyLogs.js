const fs = require('fs');
const path = require('path');

const logFileDir = 'logs';
const dummyDir = 'test/dummy/';

if (!fs.existsSync(path.join(__dirname, logFileDir))) {
  fs.mkdirSync(path.join(__dirname, logFileDir));
}

const logs = [
  '1587758242717.bulkPublishEntries.success',
  '1587758242717.PublishEntries',
  '1587758242717.PublishEntries.success',
  '1587758242717.publishentries.success',
  '1587758242717.PublishEntries.txt',
  '1587758242718.bulkPublishEntries.success',
  '1587758242718.PublishEntries.success',
  '1587758242719.PublishEntries.success',
  '1587956283100.PublishAssets.success',
];

logs.forEach((element) => {
  fs.createReadStream(path.join(__dirname, dummyDir, element)).pipe(fs.createWriteStream(path.join(__dirname, logFileDir, element)));
});
