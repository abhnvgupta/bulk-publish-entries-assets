const nock = require('nock');
const { setConfig, getAssets, start } = require('../../src/producer/publish_assets');
const dummyConfig = require('../dummy/config');
const bulkassetResponse1 = require('../dummy/bulkasset1');
const bulkassetResponse2 = require('../dummy/bulkasset2');

const assetPublishResponse = require('../dummy/assetpublished');

const bulkPublishEntriesLog = '1587758242717.bulkPublishEntries.success';
const publishAssetLog = '1587956283100.PublishAssets.success';

describe('testing asset bulk publish', () => {
  const mockedlog = () => {};

  beforeEach(() => {
    console.log = mockedlog;
    nock(dummyConfig.apiEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
      },
    })
      .get(`/v${dummyConfig.apiVersion}/assets`)
      .query({
        folder: 'cs_root',
        include_count: true,
        skip: 0,
        include_folders: true,
        include_publish_details: true,
      })
      .reply(200, bulkassetResponse1);

    nock(dummyConfig.apiEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
      },
    })
      .get(`/v${dummyConfig.apiVersion}/assets`)
      .query({
        folder: 'cs_root',
        include_count: true,
        skip: 2,
        include_folders: true,
        include_publish_details: true,
      })
      .reply(200, bulkassetResponse2);

    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
      },
    })
      .post(`/v${dummyConfig.apiVersion}/bulk/publish`)
      .reply(200, assetPublishResponse);

    nock(dummyConfig.apiEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
      },
    })
      .get(`/v${dummyConfig.apiVersion}/assets`)
      .query({
        folder: 'cs_root',
        include_count: true,
        skip: 3,
        include_folders: true,
        include_publish_details: true,
      })
      .reply(200, bulkassetResponse2);

    // nock(dummyConfig.cdnEndPoint, {
    //   reqheaders: {
    //     api_key: dummyConfig.apikey,
    //     authorization: dummyConfig.manageToken,
    //   },
    // })
    //   .post(`/v${dummyConfig.apiVersion}/bulk/publish`, {
    //     assets: [{
    //       uid: 'dummyAssetId',
    //     }, {
    //       uid: 'dummyAssetId2',
    //     }],
    //     locales: ['en-us'],
    //     environments: ['dummyEnvironment'],
    //   })
    //   .replyWithError('Some Error');
  });

  setConfig(dummyConfig);

  it('testing get Assets and publish function', async () => {
    expect(await getAssets('cs_root')).toBeTruthy();
  });

  it('testing get Assets and bulk publish function', async () => {
    dummyConfig.publish_assets.bulkPublish = true;
    setConfig(dummyConfig);
    expect(await getAssets('cs_root')).toBeTruthy();
  });

  it('testing for errors inside get assets call', async () => {
    expect(await getAssets('cs_root', 3)).toBeTruthy();
  });

  it('testing for errors inside get assets call', async () => {
    process.argv = ['stuff', 'stuff', '-retryFailed', bulkPublishEntriesLog];
    expect(await start()).toBeUndefined();
  });

  it('testing for errors inside get assets call', async () => {
    dummyConfig.publish_assets.bulkPublish = false;
    setConfig(dummyConfig);
    process.argv = ['stuff', 'stuff', '-retryFailed', publishAssetLog];
    expect(await start()).toBeUndefined();
  });
});
