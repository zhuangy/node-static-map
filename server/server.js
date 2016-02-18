const express = require('express');
const app = express();
const router = require('..').router;

// localhost:12345/staticmap?style=mapzen&center=-119.698190, 34.420831&zoom=11&width=200&height=200

app.get('/staticmap', router);

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

app.listen(12345, function () {
  console.log('Start testing static map!');
});
