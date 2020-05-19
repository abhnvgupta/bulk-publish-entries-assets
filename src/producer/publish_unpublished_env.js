const Queue = require('../util/queue');
let config = require('../../config');
const req = require('../util/request');
const { bulkPublish, publishEntry, iniatlizeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');

const queue = new Queue();
let skipCount;
let changedFlag = false;
let logFileName = 'publish_unpublished_env';
let bulkPublishSet = [];

function setConfig(conf) {
  if (conf.publish_unpublished_env.bulkPublish) {
    logFileName = 'Bulk_publish_draft';
    queue.consumer = bulkPublish;
  } else {
    logFileName = 'publish_draft';
    queue.consumer = publishEntry;
  }
  config = conf;
  queue.config = config;
}

setConfig(config);

iniatlizeLogger(logFileName);

async function getEnvironment(environmentName) {
  try {
    const options = {
      url: `${config.cdnEndPoint}/v${config.apiVersion}/environments/${environmentName}`,
      headers: {
        api_key: config.apikey,
        authorization: config.manageToken,
      },
    };
    const environment = await req(options);
    return environment;
  } catch (err) {
    return Promise.reject(err);
  }
}

async function getEntries(contentType, environmentUid, skip = 0) {
  skipCount = skip;
  try {
    const conf = {
      url: `${config.apiEndPoint}/v${config.apiVersion}/content_types/${contentType}/entries`,
      qs: {
        include_count: true,
        skip: skipCount,
        include_publish_details: true,
      },
      headers: {
        api_key: config.apikey,
        authorization: config.manageToken,
      },
    };
    const responseEntries = await req(conf);
    skipCount += responseEntries.entries.length;
    if (responseEntries.entries.length > 0) {
      responseEntries.entries.forEach((entry, index) => {
        const locale = config.publish_unpublished_env.locale || 'en-us';
        const publishedEntry = entry.publish_details.find((publishEnv) => (publishEnv.environment === environmentUid && publishEnv.locale === locale));
        if (!publishedEntry) {
          changedFlag = true;
          if (config.publish_unpublished_env.bulkPublish) {
            if (bulkPublishSet.length < 10) {
              bulkPublishSet.push({
                uid: entry.uid,
                content_type: contentType,
                locale,
                publish_details: entry.publish_details || [],
              });
            }
          } else {
            queue.Enqueue({
              content_type: contentType, publish_details: entry.publish_details, environments: config.publish_entries.environments, entryUid: entry.uid, locale, Type: 'entry',
            });
          }
        }
        if (config.publish_unpublished_env.bulkPublish) {
          if (bulkPublishSet.length === 10) {
            queue.Enqueue({
              entries: bulkPublishSet, locale, Type: 'entry', environments: config.publish_unpublished_env.environments,
            });
            bulkPublishSet = [];
            return;
          }
          if (index === responseEntries.entries.length - 1 && bulkPublishSet.length < 10 && bulkPublishSet.length > 0) {
            queue.Enqueue({
              entries: bulkPublishSet, locale, Type: 'entry', environments: config.publish_unpublished_env.environments,
            });
            bulkPublishSet = [];
          }
        }
      });
    }
    if (responseEntries.count === skipCount) {
      if (!changedFlag) console.log(`No Draft Entries of contentType ${contentType} was found`);
      bulkPublishSet = [];
      return Promise.resolve();
    }
    return await getEntries(contentType, environmentUid, skipCount);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function start() {
  try {
    if (config.publish_unpublished_env.sourceEnv) {
      const environmentDetails = await getEnvironment(config.publish_unpublished_env.sourceEnv);
      for (let i = 0; i < config.publish_unpublished_env.contentTypes.length; i += 1) {
        try {
          /* eslint-disable no-await-in-loop */
          await getEntries(config.publish_unpublished_env.contentTypes[i], environmentDetails.environment.uid);
          /* eslint-enable no-await-in-loop */
          changedFlag = false;
        } catch (err) {
          console.log(err);
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  getEntries,
  getEnvironment,
  setConfig,
  start,
};

if (process.argv.slice(2)[0] === '-retryFailed') {
  if (typeof process.argv.slice(2)[1] === 'string') {
    if (config.publish_unpublished_env.bulkPublish) {
      retryFailedLogs(process.argv.slice(2)[1], queue, 'bulk');
    } else {
      retryFailedLogs(process.argv.slice(2)[1], { entryQueue: queue }, 'publish');
    }
  }
} else {
  start();
}
// start()
