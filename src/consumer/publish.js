const chalk = require('chalk');
const req = require('../util/request');

const { getLoggerInstance, addLogs } = require('../util/logger');

let logger;
let fileNme;

function iniatlizeLogger(fileName) {
  fileNme = fileName;
  fileNme = `${Date.now()}.${fileNme}`;
  logger = getLoggerInstance(fileNme);
  return logger;
}

/* eslint-disable camelcase */
function removePublishDetails(elements) {
  if (elements && elements.length > 0) {
    return elements.map(({ publish_details, ...rest }) => rest);
  }
  return elements;
}

async function publishEntry(entryObj, config) {
  const lang = [];
  lang.push(entryObj.locale);
  const conf = {
    url: `${config.cdnEndPoint}/v${config.apiVersion}/content_types/${entryObj.content_type}/entries/${entryObj.entryUid}/publish?locale=${entryObj.locale ? entryObj.locale : 'en-us'}`,
    method: 'POST',
    headers: {
      api_key: config.apikey,
      authorization: config.manageToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entry: {
        environments: entryObj.environments,
        locales: lang,
      },
    }),
  };

  try {
    const publishEntryResponse = await req(conf);
    if (!publishEntryResponse.error_message) {
      console.log(chalk.green(`entry published with contentType Uid =${entryObj.content_type} entry Uid =${entryObj.entryUid} locale =${entryObj.locale}`));
      addLogs(logger, { options: entryObj, api_key: config.apikey }, 'info');
    } else {
      throw publishEntryResponse;
    }
  } catch (error) {
    console.log(chalk.red(`entry could not be published with contentType Uid =${entryObj.content_type} entry Uid =${entryObj.entryUid} locale =${entryObj.locale} ${JSON.stringify(error.message || error)}`));
    addLogs(logger, { options: entryObj, api_key: config.apikey }, 'error');
  }
}

async function publishAsset(assetobj, config) {
  const conf = {
    uri: `${config.cdnEndPoint}/v${config.apiVersion}/assets/${assetobj.assetUid}/publish`,
    method: 'POST',
    headers: {
      api_key: config.apikey,
      authorization: config.manageToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      asset: {
        environments: assetobj.environments,
        locales: [assetobj.locale || 'en-us'],
      },
    }),
  };
  try {
    const publishAssetResponse = await req(conf);
    if (!publishAssetResponse.error_message) {
      console.log(chalk.green(`asset published with asset Uid =${assetobj.assetUid}`));
      addLogs(logger, { options: assetobj, api_key: config.apikey }, 'info');
    } else {
      throw publishAssetResponse;
    }
  } catch (error) {
    console.log(chalk.red(`Could not publish Error ${JSON.stringify(error)}`));
    addLogs(logger, { options: assetobj, api_key: config.apikey }, 'error');
  }
}

async function UnpublishEntry(entryObj, config) {
  const lang = [];
  lang.push(entryObj.locale);
  const conf = {
    url: `${config.apiEndPoint}/v${config.apiVersion}/content_types/${entryObj.content_type}/entries/${entryObj.entryUid}/unpublish?locale=${entryObj.locale ? entryObj.locale : 'en-us'}`,
    method: 'POST',
    headers: {
      api_key: config.apikey,
      authorization: config.manageToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entry: {
        environments: entryObj.environments,
        locales: lang,
      },
    }),
  };

  try {
    const publishEntryResponse = await req(conf);
    if (!publishEntryResponse.error_message) {
      console.log(chalk.green(`entry Unpublished with contentType Uid =${entryObj.content_type} entry Uid =${entryObj.entryUid} locale =${entryObj.locale}`));
      addLogs(logger, { options: entryObj, api_key: config.apikey }, 'info');
    } else {
      throw publishEntryResponse;
    }
  } catch (error) {
    console.log(chalk.red(`entry could not be Unpublished with contentType Uid =${entryObj.content_type} entry Uid =${entryObj.entryUid} locale =${entryObj.locale} ${JSON.stringify(error.message || error)}`));
    addLogs(logger, { options: entryObj, api_key: config.apikey }, 'error');
  }
}
async function UnpublishAsset(assetobj, config) {
  const conf = {
    uri: `${config.apiEndPoint}/v${config.apiVersion}/assets/${assetobj.assetUid}/unpublish`,
    method: 'POST',
    headers: {
      api_key: config.apikey,
      authorization: config.manageToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      asset: {
        environments: assetobj.environments,
        locales: [assetobj.locale || 'en-us'],
      },
    }),
  };
  try {
    const publishAssetResponse = await req(conf);
    if (!publishAssetResponse.error_message) {
      console.log(`asset Unpublished with asset Uid =${assetobj.assetUid}`);
      addLogs(logger, { options: assetobj, api_key: config.apikey }, 'info');
    } else {
      throw publishAssetResponse;
    }
  } catch (error) {
    console.log(chalk.red(`Could not Unpublish Error ${JSON.stringify(error)}`));
    addLogs(logger, { options: assetobj, api_key: config.apikey }, 'error');
  }
}

async function bulkPublish(bulkPublishObj, config) {
  let conf;
  // addLogs(logger,bulkPublishObj);
  switch (bulkPublishObj.Type) {
    case 'entry':
      conf = {
        uri: `${config.cdnEndPoint}/v${config.apiVersion}/bulk/publish`,
        method: 'POST',
        headers: {
          api_key: config.apikey,
          authorization: config.manageToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: removePublishDetails(bulkPublishObj.entries),
          locales: [bulkPublishObj.locale],
          environments: bulkPublishObj.environments,
        }),
      };
      try {
        const bulkPublishEntriesResponse = await req(conf);
        if (bulkPublishEntriesResponse.notice && !bulkPublishEntriesResponse.error_message) {
          console.log(chalk.green(`Bulk entries sent for publish  ${JSON.stringify(removePublishDetails(bulkPublishObj.entries))}`));
          addLogs(logger, { options: bulkPublishObj, api_key: config.apikey }, 'info');
        } else {
          throw bulkPublishEntriesResponse;
        }
      } catch (error) {
        console.log(chalk.red(`Bulk entries ${JSON.stringify(removePublishDetails(bulkPublishObj.entries))} failed to publish with error ${JSON.stringify(error)}`));
        addLogs(logger, { options: bulkPublishObj, api_key: config.apikey }, 'error');
      }
      break;
    case 'asset':
      conf = {
        uri: `${config.cdnEndPoint}/v${config.apiVersion}/bulk/publish`,
        method: 'POST',
        headers: {
          api_key: config.apikey,
          authorization: config.manageToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assets: removePublishDetails(bulkPublishObj.assets),
          locales: ['en-us'],
          environments: bulkPublishObj.environments,
        }),
      };
      try {
        const bulkPublishAssetsResponse = await req(conf);
        if (bulkPublishAssetsResponse.notice && !bulkPublishAssetsResponse.error_message) {
          console.log(chalk.green(`Bulk assets sent for publish ${JSON.stringify(removePublishDetails(bulkPublishObj.assets))}`));
          addLogs(logger, { options: bulkPublishObj, api_key: config.apikey }, 'info');
        } else {
          throw bulkPublishAssetsResponse;
        }
      } catch (error) {
        console.log(chalk.red(`Bulk assets ${JSON.stringify(removePublishDetails(bulkPublishObj.assets))} failed to publish with error ${JSON.stringify(error.message || error)}`));
        addLogs(logger, { options: bulkPublishObj, api_key: config.apikey }, 'error');
      }
      break;
    default:
      console.log('No such type');
  }
}

async function bulkUnPublish(bulkUnPublishObj, config) {
  let conf;
  // addLogs(logger,bulkPublishObj);
  switch (bulkUnPublishObj.Type) {
    case 'entry':
      conf = {
        uri: `${config.cdnEndPoint}/v${config.apiVersion}/bulk/unpublish`,
        method: 'POST',
        headers: {
          api_key: config.apikey,
          authorization: config.manageToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: removePublishDetails(bulkUnPublishObj.entries),
          locales: [bulkUnPublishObj.locale],
          environments: bulkUnPublishObj.environments,
        }),
      };
      try {
        const bulkUnPublishEntriesResponse = await req(conf);
        if (bulkUnPublishEntriesResponse.notice && !bulkUnPublishEntriesResponse.error_message) {
          console.log(chalk.green(`Bulk entries sent for Unpublish  ${JSON.stringify(removePublishDetails(bulkUnPublishObj.entries))}`));
          addLogs(logger, { options: bulkUnPublishObj, api_key: config.apikey }, 'info');
        } else {
          throw bulkUnPublishEntriesResponse;
        }
      } catch (error) {
        console.log(chalk.red(`Bulk entries ${JSON.stringify(removePublishDetails(bulkUnPublishObj.entries))} failed to Unpublish with error ${JSON.stringify(error)}`));
        addLogs(logger, { options: bulkUnPublishObj, api_key: config.apikey }, 'error');
      }
      break;
    case 'asset':
      conf = {
        uri: `${config.cdnEndPoint}/v${config.apiVersion}/bulk/unpublish`,
        method: 'POST',
        headers: {
          api_key: config.apikey,
          authorization: config.manageToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assets: removePublishDetails(bulkUnPublishObj.assets),
          locales: [bulkUnPublishObj.locale || 'en-us'],
          environments: bulkUnPublishObj.environments,
        }),
      };
      try {
        const bulkUnPublishAssetsResponse = await req(conf);
        if (bulkUnPublishAssetsResponse.notice && !bulkUnPublishAssetsResponse.error_message) {
          console.log(chalk.green(`Bulk assets sent for Unpublish ${JSON.stringify(removePublishDetails(bulkUnPublishObj.assets))}`));
          addLogs(logger, { options: bulkUnPublishObj, api_key: config.apikey }, 'info');
        } else {
          throw bulkUnPublishAssetsResponse;
        }
      } catch (error) {
        console.log(chalk.red(`Bulk assets ${JSON.stringify(removePublishDetails(bulkUnPublishObj.assets))} failed to Unpublish with error ${JSON.stringify(error)}`));
        addLogs(logger, { options: bulkUnPublishObj, api_key: config.apikey }, 'error');
      }
      break;
    default:
      console.log('No such type');
  }
}
// short-term fix for reverting to previous versions
/* eslint-disable no-case-declarations */
async function publishUsingVersion(bulkPublishObj, config) {
  let conf;
  let successfullyPublished = [];
  let failedToPublish = [];
  let counter = 0;
  // addLogs(logger,bulkPublishObj);
  switch (bulkPublishObj.Type) {
    case 'entry':
      successfullyPublished = [];
      failedToPublish = [];
      counter = 0;
      const aggregatedEntries = {
        ...bulkPublishObj,
      };
      bulkPublishObj.entries.forEach(async (entry) => {
        conf = {
          uri: `${config.cdnEndPoint}/v${config.apiVersion}/content_types/${entry.content_type}/entries/${entry.uid}/publish`,
          method: 'POST',
          headers: {
            api_key: config.apikey,
            authorization: config.manageToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entry: {
              environments: bulkPublishObj.environments,
              locales: [bulkPublishObj.locale],
            },
            locale: bulkPublishObj.locale,
            version: entry.version,
          }),
        };

        try {
          const publishEntriesResponse = await req(conf);
          if (publishEntriesResponse.notice && !publishEntriesResponse.error_message) {
            console.log(chalk.green(`Entry sent for publish ${JSON.stringify(entry)}`));

            counter += 1;

            successfullyPublished.push({
              ...entry,
            });

            if (counter === bulkPublishObj.entries.length) {
              if (successfullyPublished.length > 0) {
                aggregatedEntries.entries = successfullyPublished;
                addLogs(logger, { options: aggregatedEntries, api_key: config.apikey }, 'info');
              }

              if (failedToPublish.length > 0) {
                aggregatedEntries.entries = failedToPublish;
                addLogs(logger, { options: bulkPublishObj, api_key: config.apikey }, 'error');
              }
            }
          } else {
            failedToPublish.push({
              ...entry,
            });

            // throw bulkPublishEntriesResponse;
          }
        } catch (error) {
          counter += 1;

          failedToPublish.push({
            ...entry,
          });

          if (counter === bulkPublishObj.entries.length) {
            if (successfullyPublished.length > 0) {
              aggregatedEntries.entries = successfullyPublished;
              addLogs(logger, { options: aggregatedEntries, api_key: config.apikey }, 'info');
            }

            if (failedToPublish.length > 0) {
              aggregatedEntries.entries = failedToPublish;
              addLogs(logger, { options: bulkPublishObj, api_key: config.apikey }, 'error');
            }
          }

          console.log(chalk.red(`Entry ${JSON.stringify(entry)} failed to publish with error ${JSON.stringify(error)}`));
        }
      });
      break;
    case 'asset':
      successfullyPublished = [];
      failedToPublish = [];
      counter = 0;
      const aggregatedAssets = {
        ...bulkPublishObj,
      };
      bulkPublishObj.assets.forEach(async (asset) => {
        conf = {
          uri: `${config.cdnEndPoint}/v${config.apiVersion}/assets/${asset.uid}/publish`,
          method: 'POST',
          headers: {
            api_key: config.apikey,
            authorization: config.manageToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            asset: {
              environments: bulkPublishObj.environments,
              locales: [bulkPublishObj.locale],
            },
            version: asset.version,
          }),
        };

        try {
          const publishAssetsResponse = await req(conf);
          if (publishAssetsResponse.notice && !publishAssetsResponse.error_message) {
            console.log(chalk.green(`Asset sent for publish ${JSON.stringify(asset)}`));

            counter += 1;

            successfullyPublished.push({
              ...asset,
            });

            if (counter === bulkPublishObj.assets.length) {
              if (successfullyPublished.length > 0) {
                aggregatedAssets.assets = successfullyPublished;
                addLogs(logger, { options: aggregatedAssets, api_key: config.apikey }, 'info');
              }

              if (failedToPublish.length > 0) {
                aggregatedAssets.assets = failedToPublish;
                addLogs(logger, { options: bulkPublishObj, api_key: config.apikey }, 'error');
              }
            }
          } else {
            failedToPublish.push({
              ...asset,
            });

            // throw bulkPublishAssetsResponse;
          }
        } catch (error) {
          counter += 1;

          failedToPublish.push({
            ...asset,
          });

          if (counter === bulkPublishObj.assets.length) {
            if (successfullyPublished.length > 0) {
              aggregatedAssets.assets = successfullyPublished;
              addLogs(logger, { options: aggregatedAssets, api_key: config.apikey }, 'info');
            }

            if (failedToPublish.length > 0) {
              aggregatedAssets.assets = failedToPublish;
              addLogs(logger, { options: bulkPublishObj, api_key: config.apikey }, 'error');
            }
          }

          console.log(chalk.red(`Asset ${JSON.stringify(asset)} failed to publish with error ${JSON.stringify(error)}`));
        }
      });

      break;
    default:
      console.log('No such type');
  }
}

module.exports = {
  bulkPublish,
  bulkUnPublish,
  iniatlizeLogger,
  publishEntry,
  publishAsset,
  UnpublishEntry,
  UnpublishAsset,
  publishUsingVersion,
};
