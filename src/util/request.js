const Bluebird = require('bluebird');
const request = Bluebird.promisify(require('request'));
const debug = require('debug')('requests');
const config = require('../../config');

const MAX_RETRY_LIMIT = 8;

var makeCall = module.exports = function (req, RETRY) {
  return new Bluebird(((resolve, reject) => {
    try {
      if (typeof RETRY !== 'number') {
        RETRY = 1;
      } else if (RETRY > MAX_RETRY_LIMIT) {
        return reject(new Error('Max retry limit exceeded!'));
      }
      if(!req.headers) {
        req.headers = {};
      } 
      req.headers['X-User-Agent'] = `bulk-publish-entries-assets/v${config.apiVersion}`;
      return request(req).then((response) => {
        let timeDelay;
        if (response.statusCode >= 200 && response.statusCode <= 399) {
          return resolve(JSON.parse(response.body));
        } if (response.statusCode === 429) {
          timeDelay = Math.pow(Math.SQRT2, RETRY) * 100;
          debug(`API rate limit exceeded.\nReceived ${response.statusCode} status\nBody ${JSON.stringify(response)}`);
          debug(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`);
          return setTimeout((req, RETRY) => makeCall(req, RETRY)
            .then(resolve)
            .catch(reject), timeDelay, req, RETRY);
        } if (response.statusCode >= 500) {
          // retry, with delay
          timeDelay = Math.pow(Math.SQRT2, RETRY) * 100;
          debug(`Recevied ${response.statusCode} status\nBody ${JSON.stringify(response)}`);
          debug(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`);
          RETRY++;
          return setTimeout((req, RETRY) => makeCall(req, RETRY)
            .then(resolve)
            .catch(reject), timeDelay, req, RETRY);
        }
        debug(`Request failed\n${JSON.stringify(req)}`);
        debug(`Response received\n${JSON.stringify(response)}`);
        return reject(response.body);
      }).catch(reject);
    } catch (error) {
      debug(error);
      return reject(error);
    }
  }));
};


