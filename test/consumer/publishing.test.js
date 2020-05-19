const nock = require('nock');

const {
  bulkPublish,
  bulkUnPublish,
  iniatlizeLogger,
  publishEntry,
  publishAsset,
  UnpublishEntry,
  UnpublishAsset,
  publishUsingVersion,
} = require('../../src/consumer/publish');

const dummyConfig = require('../dummy/config');
const bulkPublishResponse = require('../dummy/bulkPublishResponse');
const entryPublishedResponse = require('../dummy/entrypublished');
const assetPublishedResponse = require('../dummy/assetpublished');

iniatlizeLogger('testLog');

describe('testing bulk entries publish', () => {
  const mockedlog = () => { };

  beforeEach(() => {
    console.log = mockedlog;

    // for bulk publish entries
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/bulk/publish`, {
        entries: [{
          uid: 'dummyEntryId',
          content_type: 'dummyContentType1',
          locale: 'en-us',
        }, {
          uid: 'dummyEntryId2',
          content_type: 'dummyContentType2',
          locale: 'en-us',
        }],
        locales: ['en-us'],
        environments: ['dummyEnvironment'],
      })
      .reply(200, bulkPublishResponse);

    // for bulk publish assets
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/bulk/publish`, {
        assets: [{
          uid: 'dummyAssetUid1',
        }, {
          uid: 'dummyAssetUid1',
        }],
        locales: ['en-us'],
        environments: ['dummyEnvironment'],
      })
      .reply(200, bulkPublishResponse);

    // for publishing entries
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/content_types/dummyContentType/entries/dummyEntryUid/publish?locale=en-us`, {
        entry: {
          environments: ['dummyEnvironment'],
          locales: ['en-us'],
        },
      })
      .reply(200, entryPublishedResponse);

    // for publishing entries with error_message
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/content_types/dummyContentType/entries/dummyEntryUid/publish?locale=en-error`, {
        entry: {
          environments: ['dummyEnvironment'],
          locales: ['en-error'],
        },
      })
      .reply(200, {
        ...entryPublishedResponse,
        error_message: 'this is a dummy error message',
      });

    // for publishing assets
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/assets/dummyAssetUid/publish`, {
        asset: {
          environments: ['dummyEnvironment'],
          locales: ['en-us'],
        },
      })
      .reply(200, assetPublishedResponse);

    // for publishing assets with error_message
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/assets/dummyAssetUid/publish`, {
        asset: {
          environments: ['dummyEnvironment'],
          locales: ['en-error'],
        },
      })
      .reply(200, {
        ...assetPublishedResponse,
        error_message: 'this is a dummy error message',
      });

    // for publishing entries using version
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/content_types/dummyContentType1/entries/dummyEntryId/publish`, {
        entry: {
          environments: ['dummyEnvironment'],
          locales: ['en-us'],
        },
        locale: 'en-us',
        version: 1,
      })
      .reply(200, entryPublishedResponse);

    // for publishing assets using version
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/assets/dummyAssetUid1/publish`, {
        asset: {
          environments: ['dummyEnvironment'],
          locales: ['en-us'],
        },
        version: 1,
      })
      .reply(200, entryPublishedResponse);

    // for unpublish entries
    nock(dummyConfig.apiEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/content_types/dummyContentType1/entries/dummyEntryId/unpublish?locale=en-us`, {
        entry: {
          environments: ['dummyEnvironment'],
          locales: ['en-us'],
        },
      })
      .reply(200, entryPublishedResponse);

    // for unpublish assets
    nock(dummyConfig.apiEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/assets/dummyAssetUid/unpublish?`, {
        asset: {
          environments: ['dummyEnvironment'],
          locales: ['en-us'],
        },
      })
      .reply(200, entryPublishedResponse);

    // for bulk unpublish
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'Content-Type': 'application/json',
      },
    })
      .post(`/v${dummyConfig.apiVersion}/bulk/unpublish`, {
        entries: [{
          uid: 'dummyEntryId',
          content_type: 'dummyContentType1',
          locale: 'en-us',
        }, {
          uid: 'dummyEntryId2',
          content_type: 'dummyContentType2',
          locale: 'en-us',
        }],
        locales: ['en-us'],
        environments: ['dummyEnvironment'],
      })
      .reply(200, entryPublishedResponse);
  });

  it('testing bulk publish entries function', async () => {
    const bulkPublishObject = {
      locale: 'en-us',
      entries: [{
        uid: 'dummyEntryId',
        content_type: 'dummyContentType1',
        locale: 'en-us',
      }, {
        uid: 'dummyEntryId2',
        content_type: 'dummyContentType2',
        locale: 'en-us',
      }],
      Type: 'entry',
      environments: ['dummyEnvironment'],
    };

    expect(await bulkPublish(bulkPublishObject, dummyConfig, 'bulkpublish')).toBeUndefined();
  });


  it('testing bulk publish assets function', async () => {
    const bulkPublishObject = {
      locale: 'en-us',
      assets: [{
        uid: 'dummyAssetUid1',
      }, {
        uid: 'dummyAssetUid1',
      }],
      Type: 'asset',
      environments: ['dummyEnvironment'],
    };

    expect(await bulkPublish(bulkPublishObject, dummyConfig, 'bulkpublish')).toBeUndefined();
  });

  it('testing bulk publish assets function with error', async () => {
    expect(await bulkPublish({ Type: 'asset', assets: [] }, dummyConfig, 'bulkpublish')).toBeUndefined();
  });

  it('testing bulk publish entries function with error', async () => {
    expect(await bulkPublish({ Type: 'entry', entries: [] }, dummyConfig, 'bulkpublish')).toBeUndefined();
  });

  it('testing bulk publish function with wrong type', async () => {
    expect(await bulkPublish({ Type: 'foo' }, dummyConfig, 'bulkpublish')).toBeUndefined();
  });

  it('testing publishEntry', async () => {
    const entryObj = {
      locale: 'en-us',
      content_type: 'dummyContentType',
      entryUid: 'dummyEntryUid',
      environments: ['dummyEnvironment'],
    };
    expect(await publishEntry(entryObj, dummyConfig)).toBeUndefined();
  });

  it('testing publishEntry with error', async () => {
    const entryObj = {
      locale: 'en-us',
      entryUid: 'dummyEntryUid',
    };
    expect(await publishEntry(entryObj, dummyConfig)).toBeUndefined();
  });

  it('testing publishEntry with error message', async () => {
    const entryObj = {
      locale: 'en-error',
      content_type: 'dummyContentType',
      entryUid: 'dummyEntryUid',
      environments: ['dummyEnvironment'],
    };
    expect(await publishEntry(entryObj, dummyConfig)).toBeUndefined();
  });

  it('testing publishAsset', async () => {
    const assetObj = {
      locale: 'en-us',
      assetUid: 'dummyAssetUid',
      environments: ['dummyEnvironment'],
    };
    expect(await publishAsset(assetObj, dummyConfig)).toBeUndefined();
  });

  it('testing publishAsset with error', async () => {
    const assetObj = {
      locale: 'en-us',
      assetUid: 'dummyAssetUid',
    };
    expect(await publishAsset(assetObj, dummyConfig)).toBeUndefined();
  });

  it('testing publishAsset', async () => {
    const assetObj = {
      locale: 'en-error',
      assetUid: 'dummyAssetUid',
      environments: ['dummyEnvironment'],
    };
    expect(await publishAsset(assetObj, dummyConfig)).toBeUndefined();
  });

  it('testing publishUsingVersion for entries', async () => {
    const bulkPublishObject = {
      Type: 'entry',
      entries: [{
        uid: 'dummyEntryId',
        content_type: 'dummyContentType1',
        locale: 'en-us',
        version: 1,
      }, {
        uid: 'dummyEntryId2',
        content_type: 'dummyContentType2',
        locale: 'en-us',
        version: 1,
      }],
      environments: ['dummyEnvironment'],
      locale: 'en-us',
    };
    expect(await publishUsingVersion(bulkPublishObject, dummyConfig)).toBeUndefined();
  });

  it('testing publishUsingVersion for entries', async () => {
    const bulkPublishObject = {
      Type: 'entry',
      entries: [{
        uid: 'dummyEntryId2',
        content_type: 'dummyContentType1',
        locale: 'en-us',
        version: 1,
      }, {
        uid: 'dummyEntryId3',
        content_type: 'dummyContentType2',
        locale: 'en-us',
        version: 1,
      }],
      environments: ['dummyEnvironment'],
      locale: 'en-us',
    };
    expect(await publishUsingVersion(bulkPublishObject, dummyConfig)).toBeUndefined();
  });

  it('testing publishUsingVersion for assets', async () => {
    const bulkPublishObject = {
      Type: 'asset',
      assets: [{
        uid: 'dummyAssetUid1',
        version: 1,
      }, {
        uid: 'dummyAssetUid2',
        version: 1,
      }],
      environments: ['dummyEnvironment'],
      locale: 'en-us',
    };
    expect(await publishUsingVersion(bulkPublishObject, dummyConfig)).toBeUndefined();
  });

  it('testing unpublish for entries', async () => {
    const entryObj = {
      locale: 'en-us',
      content_type: 'dummyContentType1',
      entryUid: 'dummyEntryId',
      environments: ['dummyEnvironment'],
    };
    expect(await UnpublishEntry(entryObj, dummyConfig)).toBeUndefined();
  });

  it('testing unpublish for entries with error', async () => {
    const entryObj = {
      locale: 'en-us',
      content_type: 'dummyContentType1',
      entryUid: 'dummyEntryId',
    };
    expect(await UnpublishEntry(entryObj, dummyConfig)).toBeUndefined();
  });

  it('testing unpublish for assets', async () => {
    const assetObj = {
      locale: 'en-us',
      assetUid: 'dummyAssetUid',
      environments: ['dummyEnvironment'],
    };
    expect(await UnpublishAsset(assetObj, dummyConfig)).toBeUndefined();
  });

  it('testing unpublish for assets with error', async () => {
    const assetObj = {
      locale: 'en-us',
      assetUid: 'dummyAssetUid',
    };
    expect(await UnpublishAsset(assetObj, dummyConfig)).toBeUndefined();
  });

  it('testing bulkUnpublish for entries with error', async () => {
    const entryObj = {
      entries: [{
        uid: 'dummyEntryId',
        content_type: 'dummyContentType1',
        locale: 'en-us',
      }, {
        uid: 'dummyEntryId2',
        content_type: 'dummyContentType2',
        locale: 'en-us',
      }],
      locales: 'en-as',
      environments: ['dummyEnvironment'],
      Type: 'entry',
    };
    expect(await bulkUnPublish(entryObj, dummyConfig)).toBeUndefined();
  });
  // it('logging testing', async () => {
  //   const data = {
  //     case: 'dummyCase',
  //     uid: 'dummy',
  //   };

  //   const loggingResponse = await addlogs(data);
  // });
});
