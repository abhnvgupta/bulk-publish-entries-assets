const nock = require('nock');
const { setConfig, getEntries, start } = require('../../src/producer/nonlocalized_field_changes');
const dummyConfig = require('../dummy/config');

const languagesResponse = require('../dummy/languages');
const contentTypeResponse = require('../dummy/contentTypeResponse');
const localizedEntryResponse = require('../dummy/entry');
const masterEntry = require('../dummy/masterEntry');

function fillArray(value, len) {
  if (len === 0) return [];
  let a = [value];
  while (a.length * 2 <= len) a = a.concat(a);
  if (a.length < len) a = a.concat(a.slice(0, len - a.length));
  return a;
}

const languages = [{
  code: 'ar-eg',
  fallback_locale: 'en-us',
  uid: 'blt46831ceb05e16e47',
  created_by: 'blt7d7118ed69e5742a',
  updated_by: 'blt7d7118ed69e5742a',
  created_at: '2020-02-24T18:50:48.843Z',
  updated_at: '2020-02-24T18:50:48.843Z',
  name: 'Arabic - Egypt',
  ACL: [],
  _version: 1,
}];

describe('testing nonlocalized field changes', () => {
  const mockedLog = () => { };

  beforeEach(() => {
    console.log = mockedLog;

    // for getLanguages
    nock(`${dummyConfig.apiEndPoint}`, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
        'content-Type': 'application/json',
      },
    })
      .get(`/v${dummyConfig.apiVersion}/locales`)
      .reply(200, languagesResponse);

    // for getting contentType schema
    nock(`${dummyConfig.cdnEndPoint}`, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
      },
    })
      .get(/\/content_types\/([a-zA-Z_])/)
      .query({
        include_global_field_schema: true,
      })
      .reply(200, contentTypeResponse);

    // for getting entry response
    nock(dummyConfig.apiEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
      },
    })
      .get(`/v${dummyConfig.apiVersion}/content_types/helloworld/entries`)
      .query({
        locale: 'en-us',
        environment: `${dummyConfig.nonlocalized_field_changes.sourceEnv}`,
        include_count: true,
        skip: 0,
      })
      .reply(200, {
        entries: fillArray(masterEntry.entries[0], 12),
        count: 12,
      });

    // for getting localized entry response
    nock(dummyConfig.cdnEndPoint, {
      reqheaders: {
        api_key: dummyConfig.apikey,
        authorization: dummyConfig.manageToken,
      },
    })
      .get(`/v${dummyConfig.apiVersion}/content_types/helloworld/entries/dummyEntryId`)
      .query({
        locale: 'ar-eg',
        environment: `${dummyConfig.nonlocalized_field_changes.sourceEnv}`,
        include_publish_details: true,
      })
      .reply(200, localizedEntryResponse);
  });

  setConfig(dummyConfig);

  it('testing getEntries with an error', async () => {
    expect(await getEntries(contentTypeResponse.content_type.schema, 'wonderland', languages, 'en-us')).toBeUndefined();
  });

  it('testing getEntries', async () => {
    expect(await getEntries(contentTypeResponse.content_type.schema, 'helloworld', languages, 'en-us')).toBeUndefined();
  });

  it('testing getEntries with bulkPublish', async () => {
    dummyConfig.nonlocalized_field_changes.bulkPublish = true;
    setConfig(dummyConfig);
    expect(await getEntries(contentTypeResponse.content_type.schema, 'helloworld', languages, 'en-us')).toBeUndefined();
  });

  it('testing start', async () => {
    expect(await start()).toBeUndefined();
  });
});
