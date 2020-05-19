const Queue = require('../util/queue');
let config = require('../../config');
const req = require('../util/request');
const { bulkPublish, publishEntry, iniatlizeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');

const queue = new Queue();
queue.consumer = bulkPublish;
let logFileName;
let bulkPublishSet = [];

let changedFlag = false;

function setConfig(conf) {
  if (config.addFields.bulkPublish) {
    logFileName = 'bulk_add_fields';
    queue.consumer = bulkPublish;
  } else {
    logFileName = 'addFields';
    queue.consumer = publishEntry;
  }
  config = conf;
  queue.config = conf;
}

setConfig(config);

iniatlizeLogger(logFileName);

async function getContentTypeSchema(contentType) {
  try {
    const conf = {
      uri: `${config.cdnEndPoint}/v${config.apiVersion}/content_types/${contentType}?include_global_field_schema=true`,
      headers: {
        api_key: config.apikey,
        authorization: config.manageToken,
      },
    };
    const content = await req(conf);
    return content.content_type.schema;
  } catch (err) {
    Promise.reject(err);
  }
  return true;
}

function removeUnwanted(entry, unwantedkeys) {
  unwantedkeys.forEach((key) => {
    delete entry[key];
  });
  return entry;
}


function fileFields(entry, uid, multiple) {
  if (entry[uid]) {
    if (typeof entry[uid] === 'object' || Array.isArray(entry[uid])) {
      if (multiple) {
        const temp = [];
        entry[uid].forEach((file) => {
          temp.push(file.uid);
        });
        entry[uid] = temp;
      } else {
        entry[uid] = entry[uid].uid;
      }
    }
  }
}


function addFields(contentType, entry) {
  contentType.forEach((schema) => {
    if (schema.uid && !schema.schema) {
      if (Object.prototype.hasOwnProperty.call(entry, schema.uid) && schema.data_type === 'file') {
        changedFlag = true;
        fileFields(entry, schema.uid, schema.multiple);
      }

      if (!Object.prototype.hasOwnProperty.call(entry, schema.uid)) {
        changedFlag = true;
        if (schema.multiple) {
          if (schema.field_metadata && schema.field_metadata.default_value) {
            if (schema.data_type === 'isodate') {
              entry[schema.uid] = [schema.field_metadata.default_value.date];
            } else {
              entry[schema.uid] = [schema.field_metadata.default_value];
            }
          } else {
            entry[schema.uid] = [];
          }
        } else if (schema.field_metadata && schema.field_metadata.default_value) {
          if (schema.data_type === 'isodate') {
            entry[schema.uid] = schema.field_metadata.default_value.date;
          } else {
            entry[schema.uid] = schema.field_metadata.default_value;
          }
        } else if (schema.enum) {
          entry[schema.uid] = null;
        } else if (Object.prototype.hasOwnProperty.call(config.addFields.defaults, schema.data_type)) {
          entry[schema.uid] = config.addFields.defaults[schema.data_type];
        } else {
          entry[schema.uid] = '';
        }
      }
    }

    if (schema.uid && schema.schema) {
      if (!entry[schema.uid]) {
        if (schema.multiple) {
          entry[schema.uid] = [];
        } else {
          entry[schema.uid] = {};
        }
      }
    }

    if (schema.data_type === 'group' && !schema.multiple) {
      addFields(schema.schema, entry[schema.uid]);
    }
    if (schema.data_type === 'group' && schema.multiple) {
      entry[schema.uid].forEach((field) => {
        addFields(schema.schema, field);
      });
    }
    if (schema.data_type === 'global_field' && !schema.multiple) {
      addFields(schema.schema, entry[schema.uid]);
    }
    if (schema.data_type === 'global_field' && schema.multiple) {
      entry[schema.uid].forEach((field) => {
        addFields(schema.schema, field);
      });
    }
    if (schema.data_type === 'blocks') {
      if (!entry[schema.uid] && !Array.isArray(entry[schema.uid])) {
        entry[schema.uid] = [];
      }

      schema.blocks.forEach((block) => {
        let filterBlockFields = entry[schema.uid].filter((blockField) => {
          if (Object.prototype.hasOwnProperty.call(blockField, block.uid)) {
            return blockField;
          }
          return false;
        });

        if (filterBlockFields.length > 0) {
          filterBlockFields.forEach((bfield) => {
            addFields(block.schema, bfield[block.uid]);
          });
        } else {
          entry[schema.uid].push({ [block.uid]: {} });
          filterBlockFields = entry[schema.uid].filter((blockField) => {
            if (Object.prototype.hasOwnProperty.call(blockField, block.uid)) {
              return blockField;
            }
            return false;
          });

          if (filterBlockFields.length > 0) {
            filterBlockFields.forEach((bfield) => {
              addFields(block.schema, bfield[block.uid]);
            });
          }
        }
      });
    }
  });
  return { entry, changedFlag };
}

async function updateEntry(updatedEntry, contentType, locale) {
  const entry = {
    entry: updatedEntry,
  };
  const conf = {
    uri: `${config.apiEndPoint}/v${config.apiVersion}/content_types/${contentType}/entries/${updatedEntry.uid}?locale=${locale || 'en-us'}`,
    method: 'PUT',
    headers: {
      api_key: config.apikey,
      authorization: config.manageToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...entry,
    }),
  };
  try {
    const update = await req(conf);
    if (update.notice) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  } catch (err) {
    console.log(err);
  }
  return Promise.resolve(false);
}

/* eslint-disable no-param-reassign */
async function getEntries(schema, contentType, locale, skip = 0) {
  console.log(contentType);
  console.log(locale);
  const conf = {
    uri: `${config.apiEndPoint}/v${config.apiVersion}/content_types/${contentType}/entries?locale=${locale || 'en-us'}&include_count=true&skip=${skip}&include_publish_details=true`,
    headers: {
      api_key: config.apikey,
      authorization: config.manageToken,
    },
  };
  try {
    const entriesResponse = await req(conf);
    skip += entriesResponse.entries.length;
    entriesResponse.entries.forEach(async (entry, index) => {
      let updatedEntry = addFields(schema, entry);
      if (updatedEntry.changedFlag) {
        updatedEntry = removeUnwanted(entry, config.addFields.deleteFields);
        const flag = await updateEntry(updatedEntry, contentType, locale);
        if (flag) {
          if (config.addFields.bulkPublish) {
            if (bulkPublishSet.length < 10) {
              bulkPublishSet.push({
                uid: entry.uid,
                content_type: contentType,
                locale,
                publish_details: entry.publish_details,
              });
            }
            if (bulkPublishSet.length === 10) {
              queue.Enqueue({
                entries: bulkPublishSet, locale, Type: 'entry', environments: config.addFields.environments,
              });
              bulkPublishSet = [];
              return;
            }
          } else {
            queue.Enqueue({
              content_type: contentType, publish_details: entry.publish_details || [], environments: config.addFields.environments, entryUid: entry.uid, locale, Type: 'entry',
            });
          }
        } else {
          console.log(`Update Failed for entryUid ${entry.uid} with contentType ${contentType}`);
        }
      } else {
        console.log(`No change Observed for contentType ${contentType} with entry ${entry.uid}`);
      }

      if (index === entriesResponse.entries.length - 1 && bulkPublishSet.length > 0 && bulkPublishSet.length < 10) {
        queue.Enqueue({
          entries: bulkPublishSet, locale, Type: 'entry', environments: config.addFields.environments,
        });
        bulkPublishSet = [];
      }
    });
    if (skip === entriesResponse.count) {
      return Promise.resolve();
    }
    return setTimeout(async () => getEntries(schema, contentType, locale, skip), 2000);
  } catch (err) {
    console.log(err);
  }
  return true;
}

/* eslint-disable no-await-in-loop */
/* eslint-disable no-loop-func */

function start() {
  for (let i = 0; i < config.addFields.contentTypes.length; i += 1) {
    getContentTypeSchema(config.addFields.contentTypes[i])
      .then(async (schema) => {
        for (let j = 0; j < config.addFields.locales.length; j += 1) {
          try {
            await getEntries(schema, config.addFields.contentTypes[i], config.addFields.locales[j]);
          } catch (err) {
            console.log(`Failed to get Entries with contentType ${config.addFields.contentTypes[i]} and locale ${config.addFields.locales[j]}`);
          }
        }
      })
      .catch((err) => {
        console.log(`Failed to fetch schema${JSON.stringify(err)}`);
      });
  }
}

module.exports = {
  start,
  getContentTypeSchema,
  getEntries,
  setConfig,
  removeUnwanted,
  addFields,
};

// start();
if (process.argv.slice(2)[0] === '-retryFailed') {
  if (typeof process.argv.slice(2)[1] === 'string') {
    if (config.addFields.bulkPublish) {
      retryFailedLogs(process.argv.slice(2)[1], queue, 'bulk');
    } else {
      retryFailedLogs(process.argv.slice(2)[1], { entryQueue: queue }, 'publish');
    }
  }
} else {
  start();
}
