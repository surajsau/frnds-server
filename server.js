var express = require('express');
var bodyParser = require('body-parser');
var app = express();

//----------------------init-------------------//

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var routes = require('./routes.js')(app);
var port = process.env.PORT || 50000;

//----------------------playground---------------------//

app.listen(port);

console.log('listening on port: ' + port);

//------------------------functions--------------------------//
