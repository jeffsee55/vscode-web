var path = require('path');
var express = require('express');
var serveStatic = require('serve-static');

// Serve from this script's directory so paths work regardless of cwd
var staticBasePath = path.join(__dirname);

var app = express();
// Avoid 404 for favicon (browsers request it automatically)
app.get('/favicon.ico', function (req, res) { res.status(204).end(); });
app.use(serveStatic(staticBasePath));
var port = process.env.PORT || 8080;
app.listen(port);
console.log('Listening on port', port);
console.log('Serving from:', staticBasePath);