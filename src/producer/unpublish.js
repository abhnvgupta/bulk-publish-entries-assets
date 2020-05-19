const Queue = require('../util/queue');
let config = require('../../config');
const req = require('../util/request');
const {
  bulkUnPublish, UnpublishEntry, UnpublishAsset, iniatlizeLogger,
} = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');

const queue = new Queue();
const entryQueue = new Queue();
const assetQueue = new Queue();

let bulkUnPublishSet = [];
let bulkUnPulishAssetSet = [];
let logFileName;

function setConfig(conf) {
  if (conf.Unpublish.bulkUnpublish) {
    logFileName = 'bulkUnpublish';
    queue.consumer = bulkUnPublish;
  } else {
    logFileName = 'Unpublish';
    entryQueue.consumer = UnpublishEntry;
    assetQueue.consumer = UnpublishAsset;
  }
  config = conf;
  queue.config = conf;
  entryQueue.config = conf;
  assetQueue.config = conf;
}

let changedFlag = false;

setConfig(config);
iniatlizeLogger(logFileName);

function getQueryParams(filter) {
  let queryString = '';
  Object.keys(filter).forEach((key) => {
    if (filter[key]) {
      queryString = `${queryString}&${key}=${filter[key]}`;
    }
  });

  return queryString;
}

function bulkAction(items) {
  items.forEach((item, index) => {
    changedFlag = true;
    if (item.data.publish_details) {
      item.data.publish_details.version = item.data._version;
    }

    if (config.Unpublish.bulkUnpublish) {
      if (bulkUnPublishSet.length < 10 && item.type === 'entry_published') {
        bulkUnPublishSet.push({
          uid: item.data.uid,
          content_type: item.content_type_uid,
          locale: item.data.publish_details.locale || 'en-us',
          version: item.data._version,
          publish_details: [item.data.publish_details] || [],
        });
      }

      if (bulkUnPulishAssetSet.length < 10 && item.type === 'asset_published') {
        bulkUnPulishAssetSet.push({
          uid: item.data.uid,
          version: item.data._version,
          publish_details: [item.data.publish_details] || [],
        });
      }

      if (bulkUnPulishAssetSet.length === 10) {
        queue.Enqueue({
          assets: bulkUnPulishAssetSet, Type: 'asset', locale: config.Unpublish.filter.locale, environments: [config.Unpublish.filter.environment],
        });
        bulkUnPulishAssetSet = [];
        return;
      }

      if (bulkUnPublishSet.length === 10) {
        queue.Enqueue({
          entries: bulkUnPublishSet, locale: config.Unpublish.filter.locale, Type: 'entry', environments: [config.Unpublish.filter.environment],
        });
        bulkUnPublishSet = [];
        return;
      }
      if (index === items.length - 1 && bulkUnPulishAssetSet.length <= 10 && bulkUnPulishAssetSet.length > 0) {
        queue.Enqueue({
          assets: bulkUnPulishAssetSet, Type: 'asset', locale: config.Unpublish.filter.locale, environments: [config.Unpublish.filter.environment],
        });
        bulkUnPulishAssetSet = [];
        return;
      }

      if (index === items.length - 1 && bulkUnPublishSet.length <= 10 && bulkUnPublishSet.length > 0) {
        queue.Enqueue({
          entries: bulkUnPublishSet, locale: config.Unpublish.filter.locale, Type: 'entry', environments: [config.Unpublish.filter.environment],
        });
        bulkUnPublishSet = [];
      }
    } else {
      if (item.type === 'entry_published') {
        entryQueue.Enqueue({
          content_type: item.content_type_uid, publish_details: [item.data.publish_details], environments: [config.Unpublish.filter.environment], entryUid: item.data.uid, locale: item.data.publish_details.locale || 'en-us', Type: 'entry',
        });
      }
      if (item.type === 'asset_published') {
        assetQueue.Enqueue({
          assetUid: item.data.uid, publish_details: [item.data.publish_details], environments: [config.Unpublish.filter.environment], Type: 'entry',
        });
      }
    }
  });
}

async function getSyncEntries(locale, queryParams, paginationToken = null) {
  try {
    const conf = {
      uri: `${config.cdnEndPoint}/v${config.apiVersion}/stacks/sync?${paginationToken ? `pagination_token=${paginationToken}` : 'init=true'}${queryParams}`,
      headers: {
        api_key: config.apikey,
        access_token: config.Unpublish.deliveryToken,
      },
    };
    const entriesResponse = await req(conf);
    if (entriesResponse.items.length > 0) {
      bulkAction(entriesResponse.items);
    }
    if (entriesResponse.items.length === 0) {
      if (!changedFlag) console.log('No Entries/Assets Found published on specified environment');
      return Promise.resolve();
    }
    setTimeout(() => {
      getSyncEntries(locale, queryParams, null);
    }, 3000);
  } catch (Err) {
    console.log(Err);
  }
  return true;
}


module.exports = {
  getSyncEntries,
  setConfig,
  getQueryParams,
};

async function start() {
  const queryParams = getQueryParams(config.Unpublish.filter);
  await getSyncEntries(config.Unpublish.filter.locale, queryParams);
}


if (process.argv.slice(2)[0] === '-retryFailed') {
  if (typeof process.argv.slice(2)[1] === 'string' && process.argv.slice(2)[1]) {
    if (config.Unpublish.bulkPublish) {
      retryFailedLogs(process.argv.slice(2)[1], queue, 'bulk');
    } else {
      retryFailedLogs(process.argv.slice(2)[1], { entryQueue, assetQueue }, 'publish');
    }
  }
} else {
  start();
}

// start();
