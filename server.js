var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var soundcloud = require('node-soundcloud');
var firebase = require('firebase');
var facebook = require('fb');
var async = require('async');
var app = express();

//----------------------init-------------------//

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

soundcloud.init({
	id: '9822cd32a85be0503a7492f74890a6fc',
	secret:'7fbd6324c07ac1ccc1b8fb41fee57d80'
});

firebase.initializeApp({
	databaseURL: "https://frnds-b52ab.firebaseio.com/",
	serviceAccount: "frnds-751c6ed13c25.json"
});

var db = firebase.database();
var routes = require('./routes.js')(app, db);
var port = process.env.PORT || 50000;

var tracksRef = db.ref("data/tracks");

//----------------------playground---------------------//

app.listen(port);

tracksRef.on("child_changed", function(snapshot){
	var changedChild = snapshot.val();
	console.log("Change is: " + changedChild);

	async.parallel([
		//-- 0 -to
		function(callback){
			getUserDetailsFromToField(changedChild.to, function(to){
				console.log("TO:" + to.deviceId + ".." + to.name);
				callback(null, to);
			})
		},
		//-- 1 -track
		function(callback){
			getTrackDetailsFromTrackId(changedChild.trackId, function(track){
				var jsonTrack = JSON.parse(JSON.stringify(track));
				console.log("STREAM:" + jsonTrack);
				callback(null, jsonTrack);
			})
		},
	], function(error, results){
		if(error)
			console.log(error);
		else {
			console.log(results);
			pushNotificationToFCM(results[0].deviceId,
								 results[0].name,
								 results[1]['stream_url'],
								 results[1]['title'],
								 changedChild.name);
		}
	});
});

console.log('listening on port: ' + port);

//------------------------functions--------------------------//

function requestCallback(error, response, body) {
	if(error)
		console.error(error, response, body);
	else if(response.statusCode >= 400)
		console.error('HTTP Error: ' + response.statusCode + ' - ' + response.statusMessage);
	else
		console.log('Done!')
}

//sample trackId : "13158665"
function getTrackDetailsFromTrackId(trackId, getTrack) {
	soundcloud.get('/tracks/' + trackId, function(err, track){
		if(err)
			console.log(err)
		else {
			getTrack(track);
		}
	});
}

function getUserDetailsFromToField(fbId, getDetails) {
	tracksRef.child("" + fbId).once("value", function(snapshot){
		getDetails(snapshot.val());
	});
}

function pushNotificationToFCM(deviceId, name, trackUrl, trackName, friendName) {
	request({
		url: 'https://fcm.googleapis.com/fcm/send',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'key=AIzaSyBjcs3aRjGxmqu57xp2choSNrIDUm1v7-I'
		},
		body: JSON.stringify(
			{
				"to": "" + deviceId,
				"notification": {
					"body": {
						"friendName":"" + friendName,
						"trackName":"" + trackName,
						"trackUrl":"" + trackUrl,
						"name":"" + name
					}

				}	
			}
		)
	}, requestCallback);
}