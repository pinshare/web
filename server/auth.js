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

module.exports = class Auth {

  static bind(app) {
    const auth = new Auth();
    app.get('/auth', auth.handleAuth.bind(auth));
    app.get('/auth/callback', auth.handleCallback.bind(auth));
  }

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
      .then(user => service.authenticate(user))
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
