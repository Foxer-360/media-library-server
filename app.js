const express = require('express');
// const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.load();

const app = express();

const upload = require('./routes/upload');
const variant = require('./routes/variant');
const list = require('./routes/list');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/', list);
app.use('/upload', upload);
app.use('/variant', variant);

// catch 404 and forward to error handler
/*app.use(function(req, res, next) {
  res.sendStatus(404);
});*/

module.exports = app;

console.log(`Application is listening on port ${process.env.PORT}`);