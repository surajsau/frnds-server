var async = require('async');
var firebase = require('firebase');
var soundcloud = require('node-soundcloud');
var request = require('request');

soundcloud.init({
	id: '9822cd32a85be0503a7492f74890a6fc',
	secret:'7fbd6324c07ac1ccc1b8fb41fee57d80'
});

firebase.initializeApp({
	databaseURL: "https://frnds-b52ab.firebaseio.com/",
	serviceAccount: "frnds-751c6ed13c25.json"
});

var invalidParamRes = {successful: 'false', error: '1.INP', message: 'Something\'s wrong'};
var unsuccessfulTransactionRes = {successful: 'false', error: '2.FUP', message: 'Something\'s wrong in the back. Please try again later.'};
var successfulTransaction = {successful: 'true', error: null, message: null};

var appRouter = function(app, db) {
	var db = firebase.database();
	var tracksRef = db.ref("data/tracks");

	/*
		POST: /v0/sendMessage
		{message: "message", fbId: "sample", to: "to uId"}
	*/
	app.post("/v0/sendMessage", function(req, res){
		console.log(req.body);
		if(!req.body.message || !req.body.fbId || !req.body.to) {
			res.send(invalidParamRes);
		} else {
			var timestamp = Date.now();
			async.parallel([
				//-- 0 to
				function(callback){
					getUserDetailsFromToField(req.body.to, function(to){
						console.log("TO:" + to.deviceId + ".." + to.name);
						callback(null, to);
					})
				},
				//--1 from
				function(callback){
					getUserDetailsFromToField(req.body.fbId, function(from){
						console.log("FROM:" + from.deviceId + ".." + from.name);
						callback(null, from);
					})
				}
			], function(error, callback){
				if(error) {
					console.log(error);
				}
				else {
					console.log(callback);
					pushMessageNotificationToFCM(callback[0].deviceId,
										 req.body.fbId,
										 callback[1].name,
										 req.body.message,
										 timestamp,function(callback){
										 	console.log(callback);
										 });
				}
			});

			async.parallel([
				function(callback){
					tracksRef.child("" + req.body.fbId).update(
						{
							message: "" + req.body.message,
							to: "" + req.body.to
						}, function(error){
						if(error)
							callback(null, false);
						else
							callback(null, true);
					});
				},
				function(callback){
					tracksRef.child("" + req.body.to).child("pendingMessages").child("" + req.body.fbId).child("" + timestamp).update(
						{
							message : "" + req.body.message
						}, function(error){
							if(error)
								callback(null, false);
							else
								callback(null, true);
					});
				}
			], function(error, callback){
				if(error) {
					console.log(error);
					res.send(unsuccessfulTransactionRes);
				}
				else {
					if(callback[0] && callback[1])
						res.send(successfulTransaction);
					else
						res.send(unsuccessfulTransactionRes);
				}
			});
		}
	});

	/*
		POST: /v0/updateTrack
		{trackId: "sample", fbId: "sample", to: "to uId"}
	*/
	app.post("/v0/updateTrack", function(req, res){
		if(!req.body.trackId || !req.body.fbId || !req.body.to) {
			res.send(invalidParamRes);
		} else {
			var timestamp = Date.now();
			async.parallel([
				//-- 0 to
				function(callback){
					getUserDetailsFromToField(req.body.to, function(to){
						console.log("TO:" + to.deviceId + ".." + to.name);
						callback(null, to);
					})
				},
				//--1 from
				function(callback){
					getUserDetailsFromToField(req.body.fbId, function(from){
						console.log("FROM:" + from.deviceId + ".." + from.name);
						callback(null, from);
					})
				},
				//-- 2 track
				function(callback){
					getTrackDetailsFromTrackId(req.body.trackId, function(track){
						var jsonTrack = JSON.parse(JSON.stringify(track));
						console.log("STREAM:" + jsonTrack);
						callback(null, jsonTrack);
					})
				},
			], function(error, callback){
				if(error)
					console.log(error);
				else {
					console.log(callback);
					pushTrackNotificationToFCM(callback[0].deviceId,
										 req.body.fbId,
										 callback[1].name,
										 callback[2]['stream_url'],
										 callback[2]['title'],
										 callback[2]['artwork_url'],
										 callback[2]['permalink_url'],
										 callback[2]['user']['username'],
										 req.body.trackId,
										 timestamp,
										 function(callback){
										 	console.log(callback);
										 });
				}
			});

			async.parallel([
				function(callback){
					tracksRef.child("" + req.body.fbId).update(
						{
							trackId: "" + req.body.trackId,
							to: "" + req.body.to
						}, function(error){
						if(error)
							callback(null, false);
						else
							callback(null, true);
					});
				},
				function(callback){
					tracksRef.child("" + req.body.to).child("pendingTracks").child("" + req.body.fbId).child("" + timestamp).update(
						{
							trackId : "" + req.body.trackId
						}, function(error){
							if(error)
								callback(null, false);
							else
								callback(null, true);
					});
				}
			], function(error, callback){
				if(error) {
					console.log(error);
					res.send(unsuccessfulTransactionRes);
				}
				else {
					if(callback[0] && callback[1])
						res.send(successfulTransaction);
					else
						res.send(unsuccessfulTransactionRes);
				}
			});
		}
	});

	/* 
		POST: /v0/register
		{fbId: "fbId", "name": "user name"}

		{uId: "uid generated by firebase"}
	*/
	app.post("/v0/register", function(req, res){
		if(!req.body.fbId || !req.body.name) {
			res.send(invalidParamRes); 
		} else {
			tracksRef.child("" + req.body.fbId).once('value',function(snapshot){
				if(snapshot.val()==null){
					tracksRef.child("" + req.body.fbId).update({name: "" + req.body.name}, function(error){
						if(error)
							res.send(unsuccessfulTransactionRes);
						else {
							res.send(successfulTransaction);
						}
					});
				}
				else{
					res.send(successfulTransaction);
				}
			});
		}
	});

	/*
		POST: /v0/getPending
		{fbId: "uId"}
	*/
	app.post("/v0/getPending", function(req, res){
		if(!req.body.fbId) {
			res.send(invalidParamRes);
		} else {
			async.parallel([
					//---pending songs
					function(callback) {
						var pendingSongs = [];
						tracksRef.child("" + req.body.fbId).child("pendingTracks").once("value")
							.then(function(snapshot){
								var users = snapshot.val();
								if(users) {
									for(user in users) {
										var trackIds = [];
										var userSongs = users[user];
										console.log("user"+ user);
										console.log("userSongs:" + userSongs);
										for(song in userSongs) {
											var trackId = userSongs[song];
											var track = {timestamp : song, trackId : "" + trackId["trackId"]};
											console.log("track" + trackId);
											console.log("timestamp" + song);
											console.log(track);
											trackIds.push(track);
										}
										pendingSongs.push({fbId : "" + user, tracks : trackIds });

										tracksRef.child("" + req.body.fbId).child("pendingTracks").remove();

										callback(null, pendingSongs);
									}
								} else {
									callback(null, null);
								}
							});
					},

					//---pending messages
					function(callback) {
						var pendingMessages = [];
						tracksRef.child("" + req.body.fbId).child("pendingMessages").once("value")
							.then(function(snapshot){
								var users = snapshot.val();
								if(users) {
									for(user in users) {
										var messages = [];
										var userMsgs = users[user];
										console.log("user"+ user);
										console.log("userMsgs:" + userMsgs);
										for(msg in userMsgs) {
											var messageString = userMsgs[msg];
											var message = {timestamp : msg, message : "" + messageString["message"]};
											console.log("track" + messageString);
											console.log("timestamp" + msg);
											console.log(message);
											messages.push(message);
										}
										pendingMessages.push({fbId : "" + user, messages : messages });

										tracksRef.child("" + req.body.fbId).child("pendingMessages").remove();
										
										callback(null, pendingMessages);
									}
								} else {
									callback(null, null)
								}
							});
					}
				], function(error, callback){
					if(error) {
						console.log(error);
						res.send(unsuccessfulTransactionRes);
					} else {
						var response = {pendingSongs : callback[0], pendingMessages : callback[1]};
						console.log(response);
						res.send(response);
					}
				});
		}
	});

	/*
		POST: /v0/registerGCM
		{fbId: "uId", deviceId: "deviceId"}
	*/
	app.post("/v0/registerGCM", function(req, res){
		if(!req.body.fbId || !req.body.deviceId) {
			res.send(invalidParamRes);
		} else {
			tracksRef.child("" + req.body.fbId).update({deviceId: "" + req.body.deviceId}, function(error){
				if(error) {
					res.send(unsuccessfulTransactionRes);
				} else {
					res.send(successfulTransaction);
				}
			});
		}
	});
	/*
		POST: /vo/refreshFbToken
		{fbId: "fbId", fbToken: "fbToken"}
	*/
	app.post("/v0/refreshFbToken",function(req,res){
		if(!req.body.fbId || !req.body.fbToken){
			res.send(invalidParamRes);
		} else {
			tracksRef.child("" + req.body.fbId).update({fbToken: "" + req.body.fbToken},function(error){
				if(error)
					res.send(unsuccessfulTransactionRes);
				else
					res.send(successfulTransaction);
			})
		}
	});
	/*
	POST: /vo/
	*/

	function requestCallback(error, response, body){
		if(error)
			console.error(error, response, body);
		else if(response.statusCode >= 400)
			console.error('HTTP Error: ' + response.statusCode + ' - ' + response.statusMessage);
		else
			console.log('Done!')
	}

	//sample trackId : "13158665"
	function getTrackDetailsFromTrackId(trackId, getTrack){
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

	function pushTrackNotificationToFCM(deviceId,
								 	friendId,
								  	friendName, 
								  	trackUrl, 
								  	trackName,
								  	trackImageUrl,
								  	trackShareUrl,
								  	trackArtist, 
								  	trackId, 
								  	timestamp, 
								  	functionCallback) {
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
						"title":"Sync with " + friendName + "!",
						"body" : "Hi! " + friendName + " is listening to " + trackName + ". Sync to enjoy!",
						"click_action": "chat_detail_filter"
					},
					"data": {
						"type":"SONG",
						"source_type":"source_notification",
						"friendId": "" + friendId,
						"friendName": friendName,
						"trackName": trackName,
						"trackUrl": trackUrl,
						"trackId":"" + trackId,
						"timestamp": "" + timestamp,
						"trackImageUrl" : trackImageUrl,
						"trackShareUrl": trackShareUrl,
						"trackArtist": trackArtist

					}	
				}
			)
		}, functionCallback);
	}

	function pushMessageNotificationToFCM(deviceId, 
										friendId, 
										friendName, 
										message, 
										timestamp, 
										functionCallback) {
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
					"data": {
						"type":"MESSAGE",
						"source_type":"source_notification",
						"friendId": "" + friendId,
						"friendName": friendName,
						"message": message,
						"timestamp":"" + timestamp
					},
					"notification": {
						"title" : friendName + " says..",
						"body" : message,
						"click_action": "chat_detail_filter"
					}	
				}
			)
		}, functionCallback);
	}

}

module.exports = appRouter;
