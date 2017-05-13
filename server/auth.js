'use strict';

const url = require('url');
const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');
const service = require('../lib/service');

const CLIENT_ID = process.env.PINSHARE_CLIENT_ID;
const CLIENT_SECRET = process.env.PINSHARE_CLIENT_SECRET;

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_USER_URL = 'https://api.github.com/user';

/**
 * User authentication class
 *
 * @class Auth
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 */
class Auth {

  /**
   * Bind route
   *
   * @static
   * @param {Object} app express app
   * @return {Void} -
   */
  static bind(app) {
    const auth = new Auth();
    app.get('/auth', auth.handleAuth.bind(auth));
    app.get('/auth/callback', auth.handleCallback.bind(auth));
  }

  /**
   * Auth init handler
   *
   * @route /auth
   * @param {Object} req express request
   * @param {Object} res express response
   * @return {Void} -
   */
  handleAuth(req, res) {
    const urlObj = url.parse(GITHUB_AUTHORIZE_URL);
    /* eslint-disable camelcase */
    urlObj.query = {
      client_id: CLIENT_ID,
      state: crypto.randomBytes(16).toString('hex'),
      redirect_uri: 'http://localhost:5000/auth/callback'
    };
    /* eslint-enable camelcase */

    res.redirect(urlObj.format());
  }

  /**
   * Auth callback handler
   *
   * @route /auth/callback
   * @param {Object} req express request
   * @param {Object} res express response
   * @return {Void} -
   */
  handleCallback(req, res) {
    /* eslint-disable camelcase */
    const query = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: 'http://localhost:5000/auth/callback',
      code: req.query.code,
      state: req.query.state
    };
    /* eslint-enable camelcase */

    this.sendRequest('POST', `${GITHUB_ACCESS_TOKEN_URL}?${querystring.stringify(query)}`)
      .then(token => {
        const accessToken = querystring.parse(token).access_token;
        return this.sendRequest('GET', GITHUB_API_USER_URL, {
          'Authorization': `token ${accessToken}`,
          'User-Agent': req.headers['user-agent']
        });
      })
      .then(user => service.authenticate(JSON.parse(user)))
      .then(token => {
        res.cookie('pstoken', token, {
          maxAge: 60 * 60 * 24 * 30,
          httpOnly: true
        });
        res.render('auth/success');
      })
      .catch(err => {
        console.log(err);
        res.render('error');
      })
    ;
  }

  /**
   * Send Github auth/api request
   *
   * @param {String} method request method
   * @param {string} requestUrl request URL
   * @param {Object} headers custom headers
   * @return {Promise} -
   */
  sendRequest(method, requestUrl, headers = {}) {
    const urlObj = url.parse(requestUrl);
    const options = {
      hostname: urlObj.hostname,
      protocol: 'https:',
      port: 443,
      path: urlObj.path,
      method: method.toUpperCase(),
      headers: headers
    };

    return new Promise((resolve, reject) => {
      const request = https.request(options, resp => {
        let data = '';

        resp.on('data', chunk => {
          data += chunk;
        });
        resp.on('error', msg => reject(msg));
        resp.on('end', () => resolve(data));
      });
      request.end();
    });
  }
}

module.exports = Auth;
