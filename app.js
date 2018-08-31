const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

const upload = require('./routes/upload');
const createDimension = require('./routes/createDimension');
const find = require('./routes/find');
const findOne = require('./routes/findOne');
const getBuffer = require('./routes/getBuffer');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/find', find);
app.use('/findOne', findOne);
app.use('/getBuffer', getBuffer);
app.use('/upload', upload);
app.use('/createDimension', createDimension);

module.exports = app;

console.log(`Application is listening on port ${process.env.PORT}`);