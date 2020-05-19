const yesno = require('yesno');
const chalk = require('chalk');
const { getAllLogs } = require('../util/logger');
const Queue = require('../util/queue');
const { validateFile } = require('../util/fs');
let config = require('../../config');
const req = require('../util/request');
const { iniatlizeLogger, bulkUnPublish, publishUsingVersion } = require('../consumer/publish');

// for checking if a logfile has been provided by user
function getRevertAndLogfile(args) {
  if (args.length === 2) {
    console.error('Please provide a logfile to use for unpublishing.');
  }
  const logfilenameProvidedByUser = args[args.length - 1];
  return logfilenameProvidedByUser;
}

const logfilenameProvidedByUser = getRevertAndLogfile(process.argv);
const intervalBetweenPublishRequests = 3; // interval in seconds

const unpublishQueue = new Queue();
const publishQueue = new Queue();

const revertLogFileName = 'revert';


function setConfig(conf) {
  config = conf;
  unpublishQueue.config = conf;
  publishQueue.config = conf;
  unpublishQueue.consumer = bulkUnPublish;
  publishQueue.consumer = publishUsingVersion;
}

function getLogFileDataType(data) {
  const element = data[0];
  if (element.message.options.Type) {
    return element.message.options.Type;
  }
  if (element.message.options.entryUid) {
    return 'entry';
  }
  return 'asset';
}

async function getEnvironmentUids(environments) {
  try {
    const options = {
      method: 'GET',
      uri: `${config.apiEndPoint}/v${config.apiVersion}/environments`,
      headers: {
        api_key: config.apikey,
        authorization: config.manageToken,
      },
    };
    const allEnvironments = await req(options);
    const filteredEnvironments = allEnvironments.environments.filter((environment) => environments.indexOf(environment.name) !== -1).map(({ name, uid }) => ({ name, uid }));
    return filteredEnvironments;
  } catch (error) {
    throw new Error(error);
  }
}

function filterPublishDetails(elements, environments, locale) {
  if (locale && locale.length > 0) {
    locale.forEach((loc) => {
      elements[loc].forEach((entry) => {
        if (entry.publish_details.length > 0) {
          entry.publish_details = entry.publish_details.filter((element) => environments.indexOf(element.environment) !== -1 && element.locale === loc);
        }
      });
    });
  } else {
    for (let i = 0; i < elements.length; i += 1) {
      if (elements[i].publish_details.length > 0) {
        elements[i].publish_details = elements[i].publish_details.filter((element) => environments.indexOf(element.environment) !== -1);
      }
    }
  }
  return elements;
}

async function formatLogData(data) {
  const formattedLogs = {};
  const type = getLogFileDataType(data);

  switch (type) {
    case 'entry':
      formattedLogs.entries = {};
      formattedLogs.locale = [];
      for (let i = 0; i < data.length; i += 1) {
        if (formattedLogs.locale.indexOf(data[i].message.options.locale) === -1) {
          formattedLogs.locale.push(data[i].message.options.locale);
        }
        if (!formattedLogs.entries[data[i].message.options.locale]) formattedLogs.entries[data[i].message.options.locale] = [];
        if (data[i].message.options.entries) {
          // for handling bulk-publish-entries logs
          formattedLogs.entries[data[i].message.options.locale] = formattedLogs.entries[data[i].message.options.locale].concat(data[i].message.options.entries);
        } else {
          // for handling logs created by publishing in a regular way
          formattedLogs.entries[data[i].message.options.locale].push({
            uid: data[i].message.options.entryUid,
            content_type: data[i].message.options.content_type,
            locale: data[i].message.options.locale,
            publish_details: data[i].message.options.publish_details,
          });
        }
        if (!formattedLogs.environments) formattedLogs.environments = data[i].message.options.environments;
        if (!formattedLogs.api_key) formattedLogs.api_key = data[i].message.api_key;
      }
      break;
    case 'asset':
      formattedLogs.assets = [];
      for (let i = 0; i < data.length; i += 1) {
        if (data[i].message.options.assets) {
          // for handling bulk-publish-assets logs
          formattedLogs.assets = formattedLogs.assets.concat(data[i].message.options.assets);
        } else {
          // for handling logs created by publishing assets in a regular way
          formattedLogs.assets.push({
            uid: data[i].message.options.assetUid,
            publish_details: data[i].message.options.publish_details,
          });
        }
        if (!formattedLogs.environments) formattedLogs.environments = data[i].message.options.environments;
        if (!formattedLogs.api_key) formattedLogs.api_key = data[i].message.api_key;
      }
      break;
    default: break;
  }

  formattedLogs.environments = await getEnvironmentUids(formattedLogs.environments);
  formattedLogs.type = type;
  if (type === 'entry') {
    formattedLogs.entries = filterPublishDetails(formattedLogs.entries, formattedLogs.environments.map(({ uid }) => uid), formattedLogs.locale);
  } else {
    formattedLogs.assets = filterPublishDetails(formattedLogs.assets, formattedLogs.environments.map(({ uid }) => uid));
  }

  return formattedLogs;
}

async function mapSeries(iterable, action) {
  for (x of iterable) {
    await action(x);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function processPublishRequests(data) {
  return sleep(intervalBetweenPublishRequests * 1000).then(() => {
    publishQueue.Enqueue(data);
  });
}

async function revertUsingLogs(logFileName) {
  let bulkUnpublishSet = [];
  const setOfBulkPublishRequestPayloads = [];
  let bulkPublishSet = [];
  // const bulkPublishRegex = new RegExp(`bulkPublishEntries`);

  if (validateFile(logFileName)) {
    const response = await getAllLogs(logFileName);
    let logs;

    if (response.file.length > 0) {
      iniatlizeLogger(revertLogFileName);
      logs = await formatLogData(response.file);

      logs.environments.forEach((environment, envIndex) => {
        switch (logs.type) {
          case 'entry':
            logs.locale.forEach((loc, locIndex) => {
              logs.entries[loc].forEach(({
                publish_details, uid, locale, content_type,
              }, entryIndex) => {
                const publishDetailsForThisEnvironment = publish_details.filter((publishDetail) => publishDetail.environment === environment.uid);

                if (publishDetailsForThisEnvironment.length > 0) {
                  // handle revert case

                  publishDetailsForThisEnvironment.forEach((publishDetail) => {
                    if (bulkPublishSet.length < 10) {
                      bulkPublishSet.push({
                        uid,
                        version: publishDetail.version,
                        locale,
                        content_type,
                        publish_details: [publishDetail],
                      });
                    }

                    if (bulkPublishSet.length === 10) {
                      const data = {
                        entries: bulkPublishSet,
                        environments: [environment.name],
                        locale: loc,
                        Type: 'entry',
                      };
                      setOfBulkPublishRequestPayloads.push(data);
                      bulkPublishSet = [];
                    }
                  });
                } else {
                  if (bulkUnpublishSet.length < 10) {
                    bulkUnpublishSet.push({
                      uid,
                      locale,
                      content_type,
                      publish_details: [],
                    });
                  }

                  if (bulkUnpublishSet.length === 10) {
                    unpublishQueue.Enqueue({
                      entries: bulkUnpublishSet, environments: [environment.name], locale: loc, Type: 'entry',
                    });
                    bulkUnpublishSet = [];
                  }
                }

                if (entryIndex === logs.entries[loc].length - 1) {
                  if (bulkUnpublishSet.length <= 10 && bulkUnpublishSet.length !== 0) {
                    unpublishQueue.Enqueue({
                      entries: bulkUnpublishSet, environments: [environment.name], locale: loc, Type: 'entry',
                    });
                    bulkUnpublishSet = [];
                  }

                  if (bulkPublishSet.length <= 10 && bulkPublishSet.length !== 0) {
                    const data = {
                      entries: bulkPublishSet,
                      environments: [environment.name],
                      locale: loc,
                      Type: 'entry',
                    };
                    setOfBulkPublishRequestPayloads.push(data);
                    bulkPublishSet = [];
                  }
                }

                if (envIndex === logs.environments.length - 1 && locIndex === logs.locale.length - 1 && entryIndex === logs.entries[loc].length - 1) {
                  mapSeries(setOfBulkPublishRequestPayloads, processPublishRequests);
                }
              });
            });
            break;
          case 'asset':
            logs.assets.forEach(({ publish_details, uid }, assetIndex) => {
              const publishDetailsForThisEnvironment = publish_details.filter((publishDetail) => publishDetail.environment === environment.uid);

              if (publishDetailsForThisEnvironment.length > 0) {
                // handle revert case

                publishDetailsForThisEnvironment.forEach((publishDetail) => {
                  if (bulkPublishSet.length < 10) {
                    bulkPublishSet.push({
                      uid,
                      version: publishDetail.version,
                      publish_details: [publishDetail],
                    });
                  }

                  if (bulkPublishSet.length === 10) {
                    const data = {
                      assets: bulkPublishSet,
                      environments: [environment.name],
                      locale: 'en-us',
                      Type: 'asset',
                    };
                    setOfBulkPublishRequestPayloads.push(data);
                    bulkPublishSet = [];
                  }
                });
              } else {
                if (bulkUnpublishSet.length < 10) {
                  bulkUnpublishSet.push({
                    uid,
                    publish_details: [],
                  });
                }

                if (bulkUnpublishSet.length === 10) {
                  unpublishQueue.Enqueue({ assets: bulkUnpublishSet, environments: [environment.name], Type: 'asset' });
                  bulkUnpublishSet = [];
                }
              }

              if (assetIndex === logs.assets.length - 1) {
                if (bulkUnpublishSet.length <= 10 && bulkUnpublishSet.length !== 0) {
                  unpublishQueue.Enqueue({ assets: bulkUnpublishSet, environments: [environment.name], Type: 'asset' });
                  bulkUnpublishSet = [];
                }

                if (bulkPublishSet.length <= 10 && bulkPublishSet.length !== 0) {
                  const data = {
                    assets: bulkPublishSet,
                    environments: [environment.name],
                    locale: 'en-us',
                    Type: 'asset',
                  };
                  setOfBulkPublishRequestPayloads.push(data);
                  bulkPublishSet = [];
                }
              }

              if (envIndex === logs.environments.length - 1 && assetIndex === logs.assets.length - 1) {
                mapSeries(setOfBulkPublishRequestPayloads, processPublishRequests);
              }
            });
            break;
          default: break;
        }
      });
    } else {
      console.log(chalk.red('Error: This log file is empty. Please check error logs if any'));
    }
  }
}

setConfig(config);

async function start() {
  // const ok = await yesno({
  //   question: `Are you sure you want to revert using the file "${logfilenameProvidedByUser}" ?`,
  // });
  // if (ok) {
  revertUsingLogs(logfilenameProvidedByUser);
  // }
}

module.exports = {
  setConfig,
  revertUsingLogs,
};

if (process.argv.slice(2)[0] === '-retryFailed') {
  if (typeof process.argv.slice(2)[1] === 'string') {
    revertUsingLogs(process.argv.slice(2)[1]);
  }
} else {
  start();
}
