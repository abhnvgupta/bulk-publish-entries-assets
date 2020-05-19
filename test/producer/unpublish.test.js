const nock = require('nock');
const { getSyncEntries, setConfig, getQueryParams } = require('../../src/producer/unpublish');
// const environmentResponse = require('../dummy/environment');
const dummyConfig = require('../dummy/config');
// const entriesResponse = require('../dummy/entriesResponse');
// const entryPublishResponse = require('../dummy/entrypublished');
const syncEntriesResponse = require('../dummy/unpublish_response');
const bulkUnpublishResponse = require('../dummy/bulkUnpublishResponse');


describe('testing unpublish case', () => {
  const mockedlog = () => { };

  beforeEach(() => {
    console.log = mockedlog;

    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        access_token: dummyConfig.Unpublish.deliveryToken,
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

    // for unpublish entries
    nock(dummyConfig.apiEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(/content_types\/([a-zA-Z0-9]*)\/entries\/([a-zA-Z0-9]*)\/unpublish/)
      .reply(200, bulkUnpublishResponse);

    // for unpublish assets
    nock(dummyConfig.apiEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(/assets\/([a-zA-Z0-9]*)\/unpublish/)
      .reply(200, bulkUnpublishResponse);

    // for bulk unpublish
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/bulk/unpublish`)
      .reply(200, bulkUnpublishResponse);

    // nock(dummyConfig.cdnEndPoint, {
    //   reqheaders: {
    //     api_key: dummyConfig.apikey,
    //     access_token: dummyConfig.Unpublish.deliveryToken,
    //   },
    // })
    //   .post(`/v${dummyConfig.apiVersion}/bulk/unpublish`)
    //   .reply(200, bulkUnpublishResponse);

    // nock(dummyConfig.cdnEndPoint, {
    //   reqheaders: {
    //     api_key: dummyConfig.apikey,
    //     access_token: dummyConfig.Unpublish.deliveryToken,
    //   },
    // })
    //   .post(`/v${dummyConfig.apiVersion}/bulk/unpublish`)
    //   .reply(200, bulkUnpublishResponse);
  });


  it('testing syncEntries call', async () => {
    setConfig(dummyConfig);

    const queryParams = getQueryParams(dummyConfig.Unpublish.filter);
    expect(await getSyncEntries('en-us', queryParams)).toBeTruthy();
  });

  it('testing syncEntries with regular unpublish', async () => {
    dummyConfig.Unpublish.bulkUnpublish = false;
    setConfig(dummyConfig);
    const queryParams = getQueryParams(dummyConfig.Unpublish.filter);
    expect(await getSyncEntries('en-us', queryParams)).toBeTruthy();
  });
});
