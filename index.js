const express = require('express');
const expressHandlebars = require('express-handlebars');

const auth = require('./server/auth');

const app = express();
app.engine('.html', expressHandlebars({
  extname: '.html',
  layoutsDir: 'view',
  partialsDir: 'view/_partial'
}));
app.set('view engine', '.html');
app.set('views', 'view');

auth.bind(app);

app.listen(5000);
