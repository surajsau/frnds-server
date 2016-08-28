var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var soundcloud = require('node-soundcloud');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var routes = require('./routes.js')(app);

var port = 50000;

//----------------------init-------------------//

soundcloud.init({
	id: '9822cd32a85be0503a7492f74890a6fc',
	secret:'7fbd6324c07ac1ccc1b8fb41fee57d80'
});

//----------------------playground---------------------//

app.listen(port);
console.log('listening on port: ' + port);

// getTrackDetailsFromTrackId(13158665, function(track){
// 	var trackString = JSON.stringify(track);
// 	var trackJson = JSON.parse(trackString);
// });

//------------------------functions--------------------------//

function sendMessageToUser(deviceId, name, trackName, trackUrl, userId) {
	console.log('name: ' + name 
		+ ' trackName: ' + trackName 
		+ ' trackUrl: ' + trackUrl 
		+ ' userId: ' + userId
		+ ' deviceId: ' + deviceId);
	request({
		url: 'https://fcm.googleapis.com/fcm/send',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'key=AIzaSyBjcs3aRjGxmqu57xp2choSNrIDUm1v7-I'
		},
		body: JSON.stringify(
			{
				"to":deviceId,
				"data": {
					"message": {
						"name":"",
						"trackName":"",
						"trackUrl":"",
						"userId":""
					}
				}	
			}
		)
	}, requestCallback);
}

function requestCallback(error, response, body) {
	if(error)
		console.error(error, response, body);
	else if(response.statusCode >= 400)
		console.error('HTTP Error: ' + response.statusCode + ' - ' + response.statusMessage);
	else
		console.log('Done!')
}

function getTrackDetailsFromTrackId(trackId, getTrack) {
	soundcloud.get('/tracks/' + trackId, function(err, track){
		if(err)
			console.log(err)
		else 
			getTrack(track);
	});
}