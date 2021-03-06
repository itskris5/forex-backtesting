var fs = require('fs');
var es = require('event-stream');
var Q = require('q');

module.exports.parse = function(filePath) {
    var deferred = Q.defer();
    var stream;

    var transactionData = [];
    var formattedData = [];
    var index = -1;
    var volume = 0.0;

    if (!filePath) {
        throw 'No filePath provided to dataParser.'
    }

    stream = fs.createReadStream(filePath)
        .pipe(es.split())
        .pipe(es.mapSync(function(line) {
            // Pause the read stream.
            stream.pause();

            (function() {
                index++;

                // Ignore blank lines.
                if (!line) {
                    stream.resume();
                    return;
                }

                // Skip the first line (being header data).
                if (index === 0) {
                    stream.resume();
                    return;
                }

                transactionData = line.split(',');
                volume = parseFloat(transactionData[5]);

                if (volume > 0) {
                    formattedData.push({
                        timestamp: new Date(transactionData[0].replace(/(\d{2})\.(\d{2})\.(\d{4}) (.*)/, '$2-$1-$3 $4')).getTime(),
                        volume: volume,
                        open: parseFloat(transactionData[1]),
                        high: parseFloat(transactionData[2]),
                        low: parseFloat(transactionData[3]),
                        close: parseFloat(transactionData[4])
                    });
                }

                // Resume the read stream.
                stream.resume();
            })();
        }));

    stream.on('close', function() {
        deferred.resolve(formattedData);
    });

    return deferred.promise;
};
