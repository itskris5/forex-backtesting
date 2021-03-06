var _ = require('lodash');
var Base = require('./Base');
var Call = require('../../positions/Call');
var Put = require('../../positions/Put');

function Reversals(symbol, configuration, dataPointCount) {
    this.constructor = Reversals;
    Base.call(this, symbol, configuration, dataPointCount);

    this.configuration = configuration;
    this.putNextTick = false;
    this.callNextTick = false;
}

// Create a copy of the Base "class" prototype for use in this "class."
Reversals.prototype = Object.create(Base.prototype);

// Inherit "static" methods and data from the base constructor function.
_.extend(Reversals, Base);

Reversals.prototype.addPosition = function(position) {
    position.setStrategyUuid(this.getUuid());

    Base.prototype.addPosition.call(this, position);
};

Reversals.prototype.backtest = function(dataPoint, index, investment, profitability, callback) {
    var self = this;
    var expirationMinutes = 5;
    var timestampHour = new Date(dataPoint.timestamp).getHours();
    var timestampMinute = new Date(dataPoint.timestamp).getMinutes();

    // Simulate the next tick.
    self.tick(dataPoint, index, function() {
        // Only trade when the profitability is highest (11:30pm - 4pm CST).
        // Note that MetaTrader automatically converts timestamps to the current timezone in exported CSV files.
        if (timestampHour >= 0 && (timestampHour < 7 || (timestampHour === 7 && timestampMinute < 30))) {
            // Track the current data point as the previous data point for the next tick.
            self.previousDataPoint = dataPoint;

            self.putNextTick = false;
            self.callNextTick = false;

            callback();
            return;
        }

        if (self.previousDataPoint) {
            if (self.putNextTick) {
                // Create a new position.
                self.addPosition(new Put(self.getSymbol(), (dataPoint.timestamp - 1000), self.previousDataPoint.close, investment, profitability, expirationMinutes));
            }

            if (self.callNextTick) {
                // Create a new position.
                self.addPosition(new Call(self.getSymbol(), (dataPoint.timestamp - 1000), self.previousDataPoint.close, investment, profitability, expirationMinutes));
            }
        }

        self.putNextTick = true;
        self.callNextTick = true;

        if (self.configuration.ema200 && self.configuration.ema100) {
            if (!dataPoint.ema200 || !dataPoint.ema100) {
                self.putNextTick = false;
                self.callNextTick = false;
            }

            // Determine if a downtrend is not occurring.
            if (self.putNextTick && dataPoint.ema200 < dataPoint.ema100) {
                self.putNextTick = false;
            }

            // Determine if an uptrend is not occurring.
            if (self.callNextTick && dataPoint.ema200 > dataPoint.ema100) {
                self.callNextTick = false;
            }
        }
        if (!self.putNextTick && !self.callNextTick) {
            self.previousDataPoint = dataPoint;
            callback();
            return;
        }
        if (self.configuration.ema100 && self.configuration.ema50) {
            if (!dataPoint.ema100 || !dataPoint.ema50) {
                self.putNextTick = false;
                self.callNextTick = false;
            }

            // Determine if a downtrend is not occurring.
            if (self.putNextTick && dataPoint.ema100 < dataPoint.ema50) {
                self.putNextTick = false;
            }

            // Determine if an uptrend is not occurring.
            if (self.callNextTick && dataPoint.ema100 > dataPoint.ema50) {
                self.callNextTick = false;
            }
        }
        if (!self.putNextTick && !self.callNextTick) {
            self.previousDataPoint = dataPoint;
            callback();
            return;
        }
        if (self.configuration.ema50 && self.configuration.sma13) {
            if (!dataPoint.ema50 || !dataPoint.sma13) {
                self.putNextTick = false;
                self.callNextTick = false;
            }

            // Determine if a downtrend is not occurring.
            if (self.putNextTick && dataPoint.ema50 < dataPoint.sma13) {
                self.putNextTick = false;
            }

            // Determine if an uptrend is not occurring.
            if (self.callNextTick && dataPoint.ema50 > dataPoint.sma13) {
                self.callNextTick = false;
            }
        }
        if (!self.putNextTick && !self.callNextTick) {
            self.previousDataPoint = dataPoint;
            callback();
            return;
        }
        if (self.configuration.rsi) {
            if (typeof dataPoint[self.configuration.rsi.rsi] === 'number') {
                // Determine if RSI is not above the overbought line.
                if (self.putNextTick && dataPoint[self.configuration.rsi.rsi] <= self.configuration.rsi.overbought) {
                    self.putNextTick = false;
                }

                // Determine if RSI is not below the oversold line.
                if (self.callNextTick && dataPoint[self.configuration.rsi.rsi] >= self.configuration.rsi.oversold) {
                    self.callNextTick = false;
                }
            }
            else {
                self.putNextTick = false;
                self.callNextTick = false;
            }
        }
        if (!self.putNextTick && !self.callNextTick) {
            self.previousDataPoint = dataPoint;
            callback();
            return;
        }
        if (self.configuration.stochastic) {
            if (typeof dataPoint[self.configuration.stochastic.K] === 'number' && typeof dataPoint[self.configuration.stochastic.D] === 'number') {
                // Determine if stochastic is not above the overbought line.
                if (self.putNextTick && (dataPoint[self.configuration.stochastic.K] <= self.configuration.stochastic.overbought || dataPoint[self.configuration.stochastic.D] <= self.configuration.stochastic.overbought)) {
                    self.putNextTick = false;
                }

                // Determine if stochastic is not below the oversold line.
                if (self.callNextTick && (dataPoint[self.configuration.stochastic.K] >= self.configuration.stochastic.oversold || dataPoint[self.configuration.stochastic.D] >= self.configuration.stochastic.oversold)) {
                    self.callNextTick = false;
                }
            }
            else {
                self.putNextTick = false;
                self.callNextTick = false;
            }
        }
        if (self.configuration.prChannel) {
            if (dataPoint[self.configuration.prChannel.upper] && dataPoint[self.configuration.prChannel.lower]) {
                // Determine if the upper regression bound was not breached by the high price.
                if (self.putNextTick && (!dataPoint[self.configuration.prChannel.upper] || dataPoint.high <= dataPoint[self.configuration.prChannel.upper])) {
                    self.putNextTick = false;
                }

                // Determine if the lower regression bound was not breached by the low price.
                if (self.callNextTick && (!dataPoint[self.configuration.prChannel.lower] || dataPoint.low >= dataPoint[self.configuration.prChannel.lower])) {
                    self.callNextTick = false;
                }
            }
            else {
                self.putNextTick = false;
                self.callNextTick = false;
            }
        }

        // Track the current data point as the previous data point for the next tick.
        self.previousDataPoint = dataPoint;

        callback();
    });
};

module.exports = Reversals;
