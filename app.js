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

app.use(function(req, res, next) {
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


app.get('/stationdata/:lat/:long', function (req, res) {
    stations.getClosesStation({lat: req.params.lat, long: req.params.long}).then(function(closestStation) {
        res.status(200).send(closestStation)
    }, function(e) {
        res.status(200).send(e);
    })
});


//getData();
function getData() {
    stations.getAllTimeseries().then(function(timeseries) {
        request
            .get('http://dataservice.luftkvalitet.info/onlinedata/timeserie/v2/?id=' + timeseries.join(',') + '&format=json&key=UuDoMtfi')
            .end(function (err, result) {
                var stations = result.body;
                var measurments = [];
                for (var i = 0; i  < stations.length; i++) {
                    var station = stations[i];
                    var stationMeasurments = [];
                    for (var j = 0; j < station.TimeSeries.length; j++) {
                        // add the latest measurement
                        stationMeasurments.push({
                            timeserie: station.TimeSeries[j].Id,
                            type: station.TimeSeries[j].Component,
                            unit: station.TimeSeries[j].Unit,
                            from: station.TimeSeries[j].Measurments[0].DateTimeFrom,
                            to: station.TimeSeries[j].Measurments[0].DateTimeTo,
                            value: station.TimeSeries[j].Measurments[0].Value
                        })
                    }
                    measurments.push({
                        id: station.Id,
                        name: station.Name,
                        lat: station.CoordinateY,
                        long: station.CoordinateX,
                        measurments: stationMeasurments
                    })
                }
                pushDataToFirebase(measurments);
            }, function (error) {
                console.log("Could not get data", error);
        })
    });
}

function pushDataToFirebase(data) {
    var nodeRef = new Firebase(baseUrl + '/data/');
    nodeRef.set(data, function (firebaseResponse) {
        if (null !== firebaseResponse) {
            reject(new Error('Something wen\'t wrong, please try again!'));
        }
    });
}




app.get('/updatestations/', function (req, res) {

  var nO2seriesids = [ 44, 21, 36, 334, 553, 935, 1022, 1042, 1204 ];
  var ref = new Firebase(baseUrl);

  var stationRef = ref.child("stations");

  request
    .get('http://dataservice.luftkvalitet.info/onlinedata/timeserie/v2/')
    .query({ id: nO2seriesids.join(','), format: 'json', key: 'UuDoMtfi' })
    .end(function(err, result) {

      var stations = JSON.parse(result.text);
      //console.log(stations);

      stations.forEach(function (s) {
         stationRef.child(s.Id).set( {
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

  var nO2seriesids = [ 44, 21, 36, 334, 553, 935, 1022, 1042, 1204 ];
  var ref = new Firebase(baseUrl);

  var stationRef = ref.child("NO2");

  request
    .get('http://dataservice.luftkvalitet.info/onlinedata/timeserie/v2/')
    .query({ id: nO2seriesids.join(','), format: 'json', key: 'UuDoMtfi' })
    .end(function(err, result) {

      var stations = JSON.parse(result.text);
      //console.log(stations);

      stations.forEach(function (s) {
         stationRef.child(s.Id).set( {
           id: s.Id,
           no2id : s.TimeSeries[0].Id,
           measurement: s.TimeSeries[0].Measurments[0]
         });

      });
          res.status(200).send(result.text);
    });


});


/*
 ---------------
 */

//rute med request-parameter: id
//brukes slik: /.../text/-JiEPn2FMzEZldTFUmxp
//returnerer noden om den finnes, eller en 404 med feilmeldingen fra tjenesten om den ikke finner
app.get('/text/:id', function (req, res) {
    if (req.params.id) {
        _getTextNode(req.params.id).then(function (response) {
            res.status(200).send(response)
        }, function (error) {
            res.status(404).send(error.message)
        });
    }
});

//rute med request-parameter id til Strings-noden
//brukes slik: /.../temperatureposting/-JiEPn2FMzEZldTFUmxp
//returnerer noden om den finnes, eller en 404 med feilmeldingen fra tjenesten om den ikke finner
app.get('/temperatureposting/:id', function (req, res) {
    if (req.params.id) {
        _getTemperaturePostingNode(req.params.id).then(function (response) {
            res.status(200).send(response)
        }, function (error) {
            res.status(404).send(error.message)
        });
    }
});

//rute med request-parametere lokasjon og temperatur
//brukes slik: /.../temperatureposting/create/kallekanin/Oslo/20
//returnerer status 200 og database-ID'en til noden du akkurat skrev
app.put('/temperatureposting/create/:userid/:location/:temperature', function (req, res) {
    if (req.params.userid && req.params.location && req.params.temperature) {
        _writeTemperatureNode(req.params.userid, req.pngarams.location, req.params.temperature).then(function (response) {
            var result = 'New temperatureposting created with key: ' + response.key();
            res.status(200).send(result)
        }, function (error) {
            res.status(404).send(error.message)
        });
    } else {
        var err = new Error("Missing request parameter");
        res.status(400).send(err.message)
    }
});

//asynkron funksjon som leser fra strings noden i Firebase og returnerer noden som matcher id
function _getTextNode(id) {
    return new Promise(function (resolve, reject) {
        var nodeRef = new Firebase(baseUrl + '/strings/' + id);
        nodeRef.once('value', function (snapshot) {
            var ret = snapshot.val();
            if (null !== ret) {
                resolve(ret);
            } else {
                reject(new Error('node not found by id: ' + id));
            }
        });
    });
}

//asynkron funksjon som leser fra temperaturepostings noden i Firebase og returnerer noden som matcher id
function _getTemperaturePostingNode(id) {
    return new Promise(function (resolve, reject) {
        var nodeRef = new Firebase(baseUrl + '/temperatureposting/' + id);
        nodeRef.once('value', function (snapshot) {
            var ret = snapshot.val();
            if (null !== ret) {
                resolve(ret);
            } else {
                reject(new Error('temperatureposting not found by id: ' + id));
            }
        });
    });
}

//asynkron funksjon som skriver en ny temperaturepostings node til Firebase og returnerer ID'en til denne
//hvis .push() - metoden til Firebase returnerer noe annet enn null betyr det
//at operasjonen feilet, og vi sender feilen tilbake, ellers returnerer vi med den nye node ID'en
function _writeTemperatureNode(userid, location, temperature) {
    return new Promise(function (resolve, reject) {
        var nodeRef = new Firebase(baseUrl + '/temperatureposting/');
        var newNodeRef = nodeRef.push({
            "userid": userid,
            "location": location,
            "temperature": temperature
        }, function (firebaseResponse) {
            if (null !== firebaseResponse) {
                reject(new Error('Something wen\'t wrong, please try again!'));
            }
            resolve(newNodeRef);
        });
    });
}
