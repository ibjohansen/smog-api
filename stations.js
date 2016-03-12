var Express = require('express');
var Firebase = require('firebase');
var baseUrl = 'https://smog-api.firebaseio.com/';

exports.getClosesStation = function(location) {
    return new Promise(function(resolve, rejext) {
        getStationsFromFirebase().then(function(stations) {
            //stations = toArray(stations);
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
}


exports.getNO2TimeseriesForStation = function (station) {
    for (var i = 0; i < station.timeseries.length; i++) {
        if (station.timeseries[i].type === "NO2") return station.timeseries[i]
    }
    return null;
}


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

function distanceBetweenPoints(p1, p2) {
    return Math.abs(Math.sqrt((p1.lat - p2.lat) * (p1.lat - p2.lat) + (p1.long - p2.long) * (p1.long - p2.long)));
}
