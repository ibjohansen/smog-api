exports.getClosesStation = function(location) {
    var arrayOfPoints = allStations.sort(function (a, b) {
        a.distance = distanceBetweenPoints(location, a.location);
        b.distance = distanceBetweenPoints(location, b.location);
        return a.distanxe - b.distance;
    });
    console.log("arrayOfPoints", arrayOfPoints[0])
    return arrayOfPoints[0];
}

function distanceBetweenPoints(p1, p2) {
    return Math.abs(Math.sqrt((p1.lat - p2.lat) * (p1.lat - p2.lat) + (p1.long - p2.long) * (p1.long - p2.long)));
}

var allStations = [
         {
             timeserie: 44,
             location: {
                 lat: 59.927730,
                 long: 10.846330
             }
         },{
         timeserie: 41,
         location: {
             lat: 59.918980,
             long: 10.697070
         }
     },{
         timeserie: 941,
         location: {
             lat: 59.911320,
             long: 10.704070
         }
     }, {
         timeserie: 24,
         location: {
             lat: 59.932330,
             long: 10.724470
         }
     }, {
         timeserie: 21,
         location: {
             lat: 59.898690,
             long: 10.814950
         }
     }
]