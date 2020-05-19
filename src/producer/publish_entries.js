const Queue = require('../util/queue');
let config = require('../../config');
const req = require('../util/request');
const { bulkPublish, publishEntry, iniatlizeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');

const queue = new Queue();

let skipCount;
let logFileName;
let contentTypesList = [];
let allContentTypes = [];
let bulkPublishSet = [];

queue.consumer = bulkPublish;
logFileName = 'bulkPublishEntries';

function setConfig(conf) {
  if (conf.publish_entries.bulkPublish) {
    queue.consumer = bulkPublish;
    logFileName = 'bulkPublishEntries';
  } else {
    queue.consumer = publishEntry;
    logFileName = 'PublishEntries';
  }
  config = conf;
  queue.config = conf;
}

setConfig(config);

iniatlizeLogger(logFileName);


async function getEntries(contentType, locale, skip = 0) {
  skipCount = skip;
  try {
    const conf = {
      uri: `${config.apiEndPoint}/v${config.apiVersion}/content_types/${contentType}/entries?locale=${locale || 'en-us'}&include_count=true&skip=${skipCount}&include_publish_details=true`,
      headers: {
        api_key: config.apikey,
        authorization: config.manageToken,
      },
    };
    const entriesResponse = await req(conf);
    skipCount += entriesResponse.entries.length;
    entriesResponse.entries.forEach((entry, index) => {
      if (config.publish_entries.bulkPublish) {
        if (bulkPublishSet.length < 10) {
          bulkPublishSet.push({
            uid: entry.uid,
            content_type: contentType,
            locale,
            publish_details: entry.publish_details || [],
          });
        }

        if (bulkPublishSet.length === 10) {
          queue.Enqueue({
            entries: bulkPublishSet, locale, Type: 'entry', environments: config.publish_entries.environments,
          });
          bulkPublishSet = [];
          return;
        }

        if (index === entriesResponse.entries.length - 1 && bulkPublishSet.length <= 10) {
          queue.Enqueue({
            entries: bulkPublishSet, locale, Type: 'entry', environments: config.publish_entries.environments,
          });
          bulkPublishSet = [];
        } // bulkPublish
      } else {
        queue.Enqueue({
          content_type: contentType, publish_details: entry.publish_details || [], environments: config.publish_entries.environments, entryUid: entry.uid, locale, Type: 'entry',
        });
      }
    });
    if (entriesResponse.count === skipCount) {
      bulkPublishSet = [];
      return Promise.resolve();
    }
    return await getEntries(contentType, locale, skipCount);
  } catch (Err) {
    console.log(Err);
  }
  return true;
}

async function getContentTypes(skip = 0, contentTypes = []) {
  skipCount = skip;
  contentTypesList = contentTypes;
  const conf = {
    uri: `${config.cdnEndPoint}/v${config.apiVersion}/content_types?include_count=true&skip=${skipCount}`,
    headers: {
      api_key: config.apikey,
      authorization: config.manageToken,
    },
  };
  try {
    const contentTypeResponse = await req(conf);
    if (contentTypeResponse.content_types.length) {
      contentTypesList = [...contentTypesList, ...contentTypeResponse.content_types];
      skipCount += contentTypeResponse.content_types.length;
      if (skipCount < contentTypeResponse.count) {
        return getContentTypes(skipCount, contentTypesList);
      }
      return contentTypesList;
    }
    // return content_types
  } catch (err) {
    console.log(err);
  }
  return true;
}

async function start() {
  if (process.argv.slice(2)[0] === '-retryFailed') {
    if (typeof process.argv.slice(2)[1] === 'string' && process.argv.slice(2)[1]) {
      if (config.publish_entries.bulkPublish) {
        retryFailedLogs(process.argv.slice(2)[1], queue, 'bulk');
      } else {
        retryFailedLogs(process.argv.slice(2)[1], { entryQueue: queue }, 'publish');
      }
    }
  } else {
    try {
      if (config.publish_entries.publishAllContentTypes === true) {
        allContentTypes = await getContentTypes();
      } else {
        allContentTypes = config.publish_entries.contentTypes;
      }
      for (let loc = 0; loc < config.publish_entries.locales.length; loc += 1) {
        for (let i = 0; i < allContentTypes.length; i += 1) {
          try {
            /* eslint-disable no-await-in-loop */
            await getEntries(allContentTypes[i].uid || allContentTypes[i], config.publish_entries.locales[loc]);
            /* eslint-enable no-await-in-loop */
          } catch (err) {
            console.log(err);
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
}

start();

module.exports = {
  getEntries,
  setConfig,
  getContentTypes,
  start,
};
