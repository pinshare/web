const grpc = require('grpc');
const loader = require('spec');

const authenticate = user => {
  const service = loader.loadService('user_auth');
  console.log(service);
  const client = new service.AuthUser('localhost:5001', grpc.credentials.createInsecure());
  return new Promise((resolve, reject) => {
    client.auth({
      /* eslint-disable camelcase */
      github_id: user.id.toString(),
      github_name: user.login,
      github_profile_icon_url: user.avatar_url
      /* eslint-enable camelcase */
    }, (err, response) => {
      if (err) {
        return reject(err);
      }
      return resolve(response.token);
    });
  });
};

authenticate({
  id: 1,
  login: 'ysugimoto',
  'avatar_url': 'hoge'
});

module.exports = {
  authenticate
};
