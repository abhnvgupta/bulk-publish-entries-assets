const Queue = require('../util/queue');
let config = require('../../config');
const req = require('../util/request');
const { bulkPublish, publishAsset, iniatlizeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');

const queue = new Queue();
let logFileName;
let bulkPublishSet = [];

function setConfig(conf) {
  if (conf.publish_assets.bulkPublish) {
    queue.consumer = bulkPublish;
    logFileName = 'bulkPublishAssets';
  } else {
    queue.consumer = publishAsset;
    logFileName = 'PublishAssets';
  }
  config = conf;
  queue.config = conf;
}

setConfig(config);
iniatlizeLogger(logFileName);

/* eslint-disable no-param-reassign */

async function getAssets(folder = 'cs_root', skip = 0) {
  const conf = {
    uri: `${config.apiEndPoint}/v${config.apiVersion}/assets?folder=${folder}&skip=${skip}&include_count=true&include_folders=true&include_publish_details=true`,
    headers: {
      api_key: config.apikey,
      authorization: config.manageToken,
    },
  };
  try {
    const assetResponse = await req(conf);
    if (assetResponse && assetResponse.assets.length) {
      skip += assetResponse.assets.length;
      assetResponse.assets.forEach((asset, index) => {
        if (asset.is_dir === true) {
          return getAssets(asset.uid, 0);
        }
        if (config.publish_assets.bulkPublish) {
          if (bulkPublishSet.length < 10) {
            bulkPublishSet.push({
              uid: asset.uid,
              publish_details: asset.publish_details || [],
            });
          }
          if (bulkPublishSet.length === 10) {
            queue.Enqueue({ assets: bulkPublishSet, Type: 'asset', environments: config.publish_assets.environments });
            bulkPublishSet = [];
          }

          if (assetResponse.assets.length - 1 === index && bulkPublishSet.length > 0 && bulkPublishSet.length < 10) {
            queue.Enqueue({ assets: bulkPublishSet, Type: 'asset', environments: config.publish_assets.environments });
            bulkPublishSet = [];
          }
        } else {
          queue.Enqueue({
            assetUid: asset.uid, publish_details: asset.publish_details || [], environments: config.publish_assets.environments, Type: 'asset',
          });
        }
        return true;
      });
      if (skip === assetResponse.count) {
        return Promise.resolve(true);
      }
      return await getAssets(folder, skip);
    }
  } catch (error) {
    console.log(error);
  }
  return true;
}

function start() {
  if (process.argv.slice(2)[0] === '-retryFailed') {
    if (config.publish_assets.bulkPublish) {
      retryFailedLogs(process.argv.slice(2)[1], queue, 'bulk');
    } else {
      retryFailedLogs(process.argv.slice(2)[1], { assetQueue: queue }, 'publish');
    }
  } else {
    if (config.publish_assets.folderUid) {
      getAssets(config.publish_assets.folderUid);
    }
  }
}

module.exports = {
  getAssets,
  setConfig,
  start,
};

start();
