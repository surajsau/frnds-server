var firebase = require('firebase');

firebase.initializeApp({
	databaseURL: "https://frnds-b52ab.firebaseio.com/",
	serviceAccount: "frnds-751c6ed13c25.json"
});

var db = firebase.database();
var tracksRef = db.ref("data/tracks");

var invalidParamRes = {successful: 'false', error: '1.INP', message: 'Something\'s wrong'};
var unsuccessfulTransactionRes = {successful: 'false', error: '2.FUP', message: 'Something\'s wrong in the back. Please try again later.'};
var successfulTransaction = {successful: 'true', error: null, message: null};

var appRouter = function(app) {

	/*
		POST: /v0/updateTrack
		{trackId: "sample", uId: "sample"}
	*/
	app.post("/v0/updateTrack", function(req, res){
		if(!req.trackId && !req.uId) {
			console.log("res: " + res);
			console.log("UserID: " + req.uId);
			tracksRef.child("" + req.uId).set({trackId: "" + req.trackId}, function(error){
				if(error)
					res.send(unsuccessfulTransactionRes);
				else
					res.send(successfulTransaction);
			});
		} else {
			res.send(invalidParamRes);
		}
	});

}

module.exports = appRouter;