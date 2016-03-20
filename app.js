'use strict';
//importer nødvendige bibliotek
var Express = require('express');
var Firebase = require('firebase');
var request = require('superagent');
var stations = require('./stations');

const TREND_EUQAL = 0;
const TREND_INCREASING = 1;
const TREND_DECREASING = -1;

//variabel med url til Firebase-noden som inneholder våre data
var baseUrl = 'https://smog-api.firebaseio.com/';

//opprett en instans av Express
var app = Express();

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//start serveren med å lytte på port 5555, logg en beskjed til konsollet.
//merk at vi setter serveren til  å lytte på den porten den får tildelt av kjøremiljøet,
//eller 5555 om den eksempelvis kjører på localhost
var server = app.listen(process.env.PORT || 5555, function () {
  console.log('API lytter på port: ' + server.address().port);
});

//Enkel rute på rot som sender en bekreftende beskjed på responsen
app.get('/', function (req, res) {
  res.send('API svarer!')
});

//rute med request-parameter: id
//brukes slik: /.../text/-JiEPn2FMzEZldTFUmxp
//returnerer noden om den finnes, eller en 404 med feilmeldingen fra tjenesten om den ikke finner
app.get('/stationdata', function (req, res) {
  request
    .get('http://dataservice.luftkvalitet.info/onlinedata/timeserie/v2/?id=44,21,36,334,553,1022,935,1042,1204&format=json&key=UuDoMtfi&')
    .end(function (err, result) {
      res.status(200).send(result.body)
    }), function (error) {
    console.log('404');
    res.status(404).send(error)
  }
});

app.get('/allStationData', function (req, res) {
  stations.getStationsWithDataFromFirebase().then(function (stations) {
    res.status(200).send(stations)
  }, function (e) {
    res.status(200).send(e);
  })
});


app.get('/stationdata/:lat/:long', function (req, res) {
  stations.getClosesStation({lat: req.params.lat, long: req.params.long}).then(function (closestStation) {
    res.status(200).send(closestStation)
  }, function (e) {
    res.status(200).send(e);
  })
});


function updateData() {
  console.log("start udpate data");
  var getLiveDataPromise = stations.getAllTimeseries();
  var getOldDataPromise = stations.getStationsWithDataFromFirebase();
  Promise.all([getLiveDataPromise, getOldDataPromise]).then(function (values) {
    if (values.length < 2) return; // how did this happen?
    var timeseries = values[0];
    var oldData = values[1];

    request
      .get('http://dataservice.luftkvalitet.info/onlinedata/timeserie/v2/?id=' + timeseries.join(',') + '&format=json&key=UuDoMtfi')
      .end(function (err, result) {
        var stations = result.body;
        if (stations.length == 0) return; // no data from service, do not update db, so we have the old data
        var measurments = [];
        for (var i = 0; i < stations.length; i++) {
          var station = stations[i];
          var stationMeasurments = [];
          for (var j = 0; j < station.TimeSeries.length; j++) {
            // add the latest measurement
            var timeserie = station.TimeSeries[j].Id;

            console.log('---------------------------------->');
            console.log(station);
            console.log('<----------------------------------');

            if (timeserie !== 24) {
              var newMeasurementValue = station.TimeSeries[j].Measurments[0].Value;
              stationMeasurments.push({
                timeserie: timeserie,
                type: station.TimeSeries[j].Component,
                unit: station.TimeSeries[j].Unit,
                from: station.TimeSeries[j].Measurments[0].DateTimeFrom,
                to: station.TimeSeries[j].Measurments[0].DateTimeTo,
                value: newMeasurementValue,
                trend: getTrendFortimeserie(timeserie, newMeasurementValue, getValueForTimeserie(timeserie, oldData))
              })
            }
          }
          measurments.push({
            id: station.Id,
            name: station.Name,
            lat: station.CoordinateY,
            long: station.CoordinateX,
            measurments: stationMeasurments
          })
        }
        console.log("push data to firebase");
        pushDataToFirebase(measurments);
        console.log("done updating data");
      }, function (error) {
        console.log("Could not get data", error);
      })

  }, function (error) {
    console.log("error", error);
  });
}


function getTrendFortimeserie(newValue, oldValue) {
  if (newValue === null || oldValue === undefined) return TREND_EUQAL;
  if (newValue === null || newValue === undefined) return TREND_EUQAL;
  if (newValue == oldValue) return TREND_EUQAL;
  if (newValue > oldValue) return TREND_INCREASING;
  if (newValue < oldValue) return TREND_DECREASING;
}


function getValueForTimeserie(timeserie, allStations) {
  for (var i = 0; i < allStations.length; i++) {
    var station = allStations[i];
    for (var j = 0; j < station.measurments.length; j++) {
      if (station.measurments[j].timeserie === timeserie) return station.measurments[j].value;
    }
  }
  return null;
}


function pushDataToFirebase(data) {
  var nodeRef = new Firebase(baseUrl + '/data/');
  nodeRef.set(data, function (firebaseResponse) {
    if (null !== firebaseResponse) {
      reject(new Error('Something wen\'t wrong, please try again!'));
    }
  });
}


// start updating two times an hour
setInterval(function () {
  updateData()
}, 360000);


app.get('/updatestations/', function (req, res) {

  var nO2seriesids = [44, 21, 36, 334, 553, 935, 1022, 1042, 1204];
  var ref = new Firebase(baseUrl);

  var stationRef = ref.child("stations");

  request
    .get('http://dataservice.luftkvalitet.info/onlinedata/timeserie/v2/')
    .query({id: nO2seriesids.join(','), format: 'json', key: 'UuDoMtfi'})
    .end(function (err, result) {

      var stations = JSON.parse(result.text);
      //console.log(stations);

      stations.forEach(function (s) {
        stationRef.child(s.Id).set({
          id: s.Id,
          name: s.Name,
          lat: s.CoordinateX,
          long: s.CoordinateY,
          NO2: s.TimeSeries[0].Id
        });

      });

      res.status(200).send(result.text);
    });
});

app.get('/updateno2/', function (req, res) {

  var nO2seriesids = [44, 21, 36, 334, 553, 935, 1022, 1042, 1204];
  var ref = new Firebase(baseUrl);

  var stationRef = ref.child("NO2");

  request
    .get('http://dataservice.luftkvalitet.info/onlinedata/timeserie/v2/')
    .query({id: nO2seriesids.join(','), format: 'json', key: 'UuDoMtfi'})
    .end(function (err, result) {

      var stations = JSON.parse(result.text);
      //console.log(stations);

      stations.forEach(function (s) {
        stationRef.child(s.Id).set({
          id: s.Id,
          no2id: s.TimeSeries[0].Id,
          measurement: s.TimeSeries[0].Measurments[0]
        });

      });
      res.status(200).send(result.text);
    });
});
