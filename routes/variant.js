var express = require('express');
var router = express.Router();

/* POST files listing */
router.post('/', function(req, res, next) {
  res.send('create variant');
});

module.exports = router;
