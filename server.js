require('module-alias/register');

const express = require('express')
	, { join, resolve } = require('path')
	, favicon = require('serve-favicon')
	, useragent = require('express-useragent')
	;

require('@common/utils');
require('@common/logger');


const kPort = process.env.PORT || 3010;
const isProduction = process.env.NODE_ENV == 'production';

var app = express();

// configure Express
app.set('views', __dirname + '/views');
// app.set('views', [__dirname + '/views', __dirname + '/public']);
app.set('view engine', 'ejs');
app.engine('ejs', require('./node/ejs-locals'));
app.use(express.static(__dirname + '/public'));
// favicon
app.use(favicon(join(__dirname, 'public/ui/ico', 'favicon.ico')));
app.use(useragent.express());

app.disable('x-powered-by');

// api
app.use('/', require('./api/player'));

app.listen(kPort, async function() {
	console.log('Express server listening on port', kPort);
});
