const nock = require('nock');
const { getSyncEntries, setConfig, getQueryParams } = require('../../src/producer/cross_publish');
// const environmentResponse = require('../dummy/environment');
const dummyConfig = require('../dummy/config');
// const entriesResponse = require('../dummy/entriesResponse');
// const entryPublishResponse = require('../dummy/entrypublished');
const syncEntriesResponse = require('../dummy/unpublish_response');


describe('testing unpublish case', () => {
  const mockedlog = () => {};

  beforeEach(() => {
    console.log = mockedlog;

    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        access_token: dummyConfig.cross_env_publish.deliveryToken,
      },
    })
      .get(`/v${dummyConfig.apiVersion}/stacks/sync`)
      .query({
        init: true,
        type: 'asset_published,entry_published',
        locale: 'en-us',
        environment: 'dummyEnvironment',
        content_type_uid: 'dummyContentType',
      })
      .reply(200, syncEntriesResponse);
  });


  it('testing syncEntries call', async () => {
    setConfig(dummyConfig);

    const queryParams = getQueryParams(dummyConfig.cross_env_publish.filter);
    expect(await getSyncEntries(queryParams)).toBeUndefined();
  });

  it('testing syncEntries with regular unpublish', async () => {
    dummyConfig.cross_env_publish.bulkPublish = false;
    setConfig(dummyConfig);
    const queryParams = getQueryParams(dummyConfig.cross_env_publish.filter);
    expect(await getSyncEntries(queryParams)).toBeTruthy();
  });
});
