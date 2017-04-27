'use latest';

function willClaimFreeBook(username, password) {
  try {
    const config = {
      domain: 'https://www.packtpub.com',
      path: '/packt/offers/free-learning',
      loginFormId: 'packt-user-login-form',
      username,
      password,
    };

    const cheerio = require('cheerio');
    const request = require('request-promise-native').defaults({
      baseUrl: config.domain,
      followAllRedirects: true,
      jar: true,
      transform: html => cheerio.load(html),
    });

    const path = config.path;

    return request(path).then($ => {
      console.log('Successfully retreived the free book page at', path);
      
      // first, login
      var form = $('#' + config.loginFormId);
      // var formData = qs.parse(form.serialize());
      var formData = form.serializeArray().reduce((prev, curr) => {
        prev[curr.name] = curr.value;
        return prev;
      }, {});
      formData.email = config.username;
      formData.password = config.password;

      return request.post(path).form(formData);
    }).then($ => {
      console.log('Successfully logged in as ', config.username);

      // then, follow the link
      var link = $('#deal-of-the-day .twelve-days-claim').attr('href');
      console.log('Requesting free book claim link at', link); // eg. /freelearning-claim/11723/21478
      return request({ url: link, resolveWithFullResponse: true, transform: null });
    }).then(msg => {
      console.log('Successfully followed free book claim link');
      if (msg.request.uri.path === '/account/my-ebooks') {
        return cheerio.load(msg.body);
      }
      return request('/account/my-ebooks');
    }).then($ => {
      console.log('Successfully routed to my ebooks!');

      // last, profit!!
      const bookList = $('#product-account-list');
      if (bookList[0]) {
        const lastOrderTitle = bookList.children(':first-child').attr('title');
        return `Got "${lastOrderTitle}" for your account!`;
      }

      return 'Did not redirect to account ebook orders. You will have to check manually.';
    }).catch(e => console.error('Some error occurred getting page!') || Promise.reject(e));
  } catch (error) {
    return Promise.reject(error);
  }
}

function logWithCallback(promise, cb) {
  promise
    .then(msg => console.log(msg) || cb(null, msg))
    .catch(err => console.trace(err) || cb(err));
}

module.exports = function(ctx, cb) {
  logWithCallback(willClaimFreeBook(ctx.secrets.USERNAME, ctx.secrets.PASSWORD), cb);
}
