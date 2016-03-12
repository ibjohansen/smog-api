var Firebase = require('firebase');
var baseUrl = 'https://smog-api.firebaseio.com/';


exports.getClosesStation = function(location) {
    return new Promise(function(resolve, reject) {
        getStationsWithDataFromFirebase().then(function(stations) {
            var arrayOfPoints = stations.sort(function (a, b) {
                a.distance = distanceBetweenPoints(location, {lat: a.lat, long: a.long});
                b.distance = distanceBetweenPoints(location, {lat: b.lat, long: b.long});
                return a.distance - b.distance;
            });
            resolve(arrayOfPoints[0]);
        },function(e) {
            reject(e);
        })
    });
};


exports.getAllTimeseries = function() {
    return new Promise(function(resolve, reject) {
        getStationsFromFirebase().then(function(stations) {
            var timeseries = [];
            for (var i = 0; i < stations.length; i++) {
                for (var j = 0; j < stations[i].timeseries.length; j++) {
                    timeseries.push(stations[i].timeseries[j].id);
                }
            }
            resolve(timeseries);
        }, function(e) {
            resolve([]);
        })
    });
};


function getStationsFromFirebase() {
    return new Promise(function (resolve, reject) {
        var db = new Firebase(baseUrl + '/stations/');
        db.once('value', function (snapshot) {
            var ret = snapshot.val();
            if (null !== ret) {
                resolve(ret);
            } else {
                reject(new Error('Stasjoner ikke funnet'));
            }
        });
    });
}


function getStationsWithDataFromFirebase() {
    return new Promise(function (resolve, reject) {
        var db = new Firebase(baseUrl + '/data/');
        db.once('value', function (snapshot) {
            var ret = snapshot.val();
            if (null !== ret) {
                resolve(ret);
            } else {
                reject(new Error('Stasjoner ikke funnet'));
            }
        });
    });
}


function distanceBetweenPoints(p1, p2) {
    return Math.abs(Math.sqrt((p1.lat - p2.lat) * (p1.lat - p2.lat) + (p1.long - p2.long) * (p1.long - p2.long)));
}
