const Queue = require('../util/queue');
const req = require('../util/request');
const { bulkPublish, publishEntry, iniatlizeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');
let config = require('../../config');

let skipCount;
const queue = new Queue();
let changedFlag = false;
let bulkPublishSet = [];
let logFileName;

iniatlizeLogger(logFileName);

async function getEnvironment(environmentName) {
  try {
    const options = {
      uri: `${config.cdnEndPoint}/v${config.apiVersion}/environments/${environmentName}`,
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

async function getEntries(contentType, environmentUid, locale, skip = 0) {
  skipCount = skip;
  try {
    const conf = {
      uri: `${config.apiEndPoint}/v${config.apiVersion}/content_types/${contentType}/entries`,
      qs: {
        include_count: true,
        skip: skipCount,
        include_publish_details: true,
        locale,
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
        const publishedEntry = entry.publish_details.find((publishEnv) => publishEnv.environment === environmentUid && publishEnv.locale === locale);
        if (publishedEntry && publishedEntry.version < entry._version) {
          changedFlag = true;
          if (config.publish_edits_on_env.bulkPublish) {
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
              content_type: contentType, publish_details: entry.publish_details || [], environments: config.publish_edits_on_env.environments, entryUid: entry.uid, locale, Type: 'entry',
            });
          }
        }
        if (bulkPublishSet.length === 10) {
          queue.Enqueue({
            entries: bulkPublishSet, locale, Type: 'entry', environments: config.publish_edits_on_env.environments,
          });
          bulkPublishSet = [];
          return;
        }
        if (index === responseEntries.entries.length - 1 && bulkPublishSet.length > 0 && bulkPublishSet.length <= 10) {
          queue.Enqueue({
            entries: bulkPublishSet, locale, Type: 'entry', environments: config.publish_edits_on_env.environments,
          });
          bulkPublishSet = [];
        }
      });
    }
    if (responseEntries.count === skipCount) {
      if (!changedFlag) console.log(`No Edits Were observed on specified Environment for contentType ${contentType}`);
      bulkPublishSet = [];
      return Promise.resolve();
    }
    return await getEntries(contentType, environmentUid, locale, skipCount);
  } catch (error) {
    return Promise.reject(error);
  }
}

function setConfig(conf) {
  if (conf.publish_edits_on_env.bulkPublish) {
    logFileName = 'bulk_publish_edits';
    queue.consumer = bulkPublish;
  } else {
    logFileName = 'publish_edits';
    queue.consumer = publishEntry;
  }
  config = conf;
  queue.config = config;
}

setConfig(config);

async function start() {
  if (process.argv.slice(2)[0] === '-retryFailed') {
    if (typeof process.argv.slice(2)[1] === 'string') {
      if (config.publish_edits_on_env.bulkPublish) {
        retryFailedLogs(process.argv.slice(2)[1], queue, 'bulk');
      } else {
        retryFailedLogs(process.argv.slice(2)[1], { entryQueue: queue }, 'publish');
      }
    }
  } else {
    if (config.publish_edits_on_env.sourceEnv) {
      try {
        const environmentDetails = await getEnvironment(config.publish_edits_on_env.sourceEnv);
        for (let i = 0; i < config.publish_edits_on_env.contentTypes.length; i += 1) {
          for (let j = 0; j < config.publish_edits_on_env.locales.length; j += 1) {
            try {
              /* eslint-disable no-await-in-loop */
              await getEntries(config.publish_edits_on_env.contentTypes[i], environmentDetails.environment.uid, config.publish_edits_on_env.locales[j]);
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
}

start();

module.exports = {
  getEntries,
  getEnvironment,
  setConfig,
  start,
};
