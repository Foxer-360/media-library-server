const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const upload = require("./routes/upload");
const deleteImg = require("./routes/delete");
const createDimension = require("./routes/createDimension");
const find = require("./routes/find");
const findOne = require("./routes/findOne");
const getBuffer = require("./routes/getBuffer");
const findByFilename = require("./routes/findByFilename");
const uploadFile = require("./routes/uploadFile");  

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/find", find);
app.use("/findOne", findOne);
app.use("/findByFilename", findByFilename);
app.use("/getBuffer", getBuffer);
app.use("/upload", upload);
app.use("/delete", deleteImg);
app.use("/createDimension", createDimension);
app.use("/uploadFile", uploadFile);

module.exports = app;

console.log(`Application is listening on port ${process.env.PORT}`);
