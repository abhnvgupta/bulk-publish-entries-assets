const { getAllLogs } = require('./logger');

module.exports = async (filename, queue, Type) => {
  const logs = await getAllLogs(filename);
  if (logs.file.length > 0) {
    logs.file.forEach((log) => {
      if (Type === 'bulk') {
        queue.Enqueue(log.message.options);
      }
      if (Type === 'publish') {
        if (log.message.options.Type === 'entry') {
          queue.entryQueue.Enqueue({
            content_type: log.message.options.content_type, publish_details: log.message.options.publish_details, environments: log.message.options.environments, entryUid: log.message.options.entryUid, locale: log.message.options.locale, Type: 'entry',
          });
        } else {
          queue.assetQueue.Enqueue({
            assetUid: log.message.options.assetUid, publish_details: log.message.options.publish_assets, environments: log.message.options.environments, Type: 'asset',
          });
        }
      }
    });
  } else {
    console.log('NO FAILURE LOGS WERE FOUND');
  }
};
