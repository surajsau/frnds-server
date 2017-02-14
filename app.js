var express = require('express');
var bodyParser = require('body-parser');
var app = express();

//----------------------init-------------------//

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var routes = require('./routes.js')(app);
const PORT = process.env.PORT || 8080;

//----------------------playground---------------------//

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

//------------------------functions--------------------------//
