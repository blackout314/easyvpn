'use strict';

const got = require('got');
const csv = require('csvtojson');
const through2 = require('through2');
const Promise = require('bluebird');
const os = require('os');
const VPN = require('./vpn');

const VPNGATE_API_URL = 'http://www.vpngate.net/api/iphone/';
const DEFAULT_ENCODE = 'utf8';

function networkError(err) {
  return `API request failed with code: ${err.statusCode}`;
}

function filter(chunk, enc, cb) {
  const createBuffer = data => new Buffer(data, DEFAULT_ENCODE);
  const lines = chunk.toString()
    .split(os.EOL)
    .filter(line => (line !== '*vpn_servers' && line !== '*'))
    .map((line) => {
      if (line.startsWith('#HostName')) {
        return line.replace('#HostName', 'HostName');
      }
      return line;
    })
    .join(os.EOL);

  this.push(createBuffer(lines));
  cb();
}

function request() {
  return new Promise((resolve, reject) => {
    got.stream(VPNGATE_API_URL)
      .on('error', err => reject(networkError(err)))
      .pipe(through2(filter))
      .pipe(csv())
      .on('error', (err) => {
        reject(err);
      })
      .on('end_parsed', resolve);
  });
}

module.exports = () => {
  return request()
    .then(list => Promise.resolve(list.map(vpn => new VPN(vpn))));
};
