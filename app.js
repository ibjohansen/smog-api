'use strict';
//importer nødvendige bibliotek
var Express = require('express');
var Firebase = require('firebase');
var request = require('superagent');
var stations = require('./stations');

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
    console.log('404')
    res.status(404).send(error)
  }
});

app.get('/stationdata/:lat/:long', function (req, res) {
  stations.getClosesStation({lat: req.params.lat, long: req.params.long}).then(function (closestStation) {
    var no2ClosestStation = stations.getNO2TimeseriesForStation(closestStation);
    request
      .get('http://dataservice.luftkvalitet.info/onlinedata/timeserie/v2/?id=' + no2ClosestStation.id + '&format=json&key=UuDoMtfi&from=201603112000&to=201603112200&')
      .end(function (err, result) {
        res.status(200).send(result.body)
      }, function (e) {
        res.status(200).send(e);
      });
  }, function (e) {
    res.status(200).send(e);
  })
});


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
