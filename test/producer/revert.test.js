const nock = require('nock');
// const fs = require('fs');
// const path = require('path');

const entriesLogFileName = '1587758242717.PublishEntries.success';
const assetLogFileName = '1587956283100.PublishAssets.success';

// fs.createReadStream(path.join(__dirname, '../', 'dummy/', entriesLogFileName))
//   .pipe(fs.createWriteStream(path.join(__dirname, '../', '../', 'logs/', entriesLogFileName)));

// fs.createReadStream(path.join(__dirname, '../', 'dummy/', assetLogFileName))
//   .pipe(fs.createWriteStream(path.join(__dirname, '../', '../', 'logs/', assetLogFileName)));

const {
  setConfig, revertUsingLogs,
} = require('../../src/producer/revert');

const dummyConfig = require('../dummy/config');
// const bulkentriesResponse1 = require('../dummy/bulkentries1');
// const bulkentriesResponse2 = require('../dummy/bulkentries2');
const entryPublishResponse = require('../dummy/entrypublished');
// const contentTypesResponse = require('../dummy/bulkContentTypeResponse');

const environmentsResponse = require('../dummy/environments');

describe('testing bulk entries publish', () => {
  const mockedlog = () => { };

  beforeEach(() => {
    console.log = mockedlog;

    nock(dummyConfig.apiEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
      },
    })
      .get(`/v${dummyConfig.apiVersion}/environments`)
      .reply(200, environmentsResponse);

    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
      },
    })
      .post(`/v${dummyConfig.apiVersion}/bulk/publish`)
      .reply(200, entryPublishResponse);

    nock(dummyConfig.apiEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authtoken: dummyConfig.authToken,
        'Content-Type': 'application/json',
      },
    })
      .post(/\/entries\/([a-zA-Z0-9])*\/publish/, {
        entry: {
          environments: ['dummyEnvironment'],
          locales: ['en-us'],
        },
      })
      .reply(200, entryPublishResponse);
  });

  setConfig(dummyConfig);

  it('testing for entries log', async () => {
    expect(await revertUsingLogs(entriesLogFileName)).toBeUndefined();
  });

  it('testing for entries log', async () => {
    expect(await revertUsingLogs(assetLogFileName)).toBeUndefined();
  });

  it('testing with a wrong log file', async () => {
    const lf = '1587758242717.PublishEntries.txt';
    expect(await revertUsingLogs(lf)).toBeUndefined();
  });

  it('testing with a wrong log file', async () => {
    const lf = '1587758242717.PublishEntries';
    expect(await revertUsingLogs(lf)).toBeUndefined();
  });

  it('testing with a wrong log file', async () => {
    const lf = '1587758242717.publishentries.success';
    expect(await revertUsingLogs(lf)).toBeUndefined();
  });
});
