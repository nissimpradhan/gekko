// This is a basic example strategy for Gekko.
// For more information on everything please refer
// to this document:
//
// https://gekko.wizb.it/docs/strategies/creating_a_strategy.html
//
// The example below is pretty bad investment advice: on every new candle there is
// a 10% chance it will recommend to change your position (to either
// long or short).

var log = require('../core/log');

var config = require('../core/util.js').getConfig();
var settings = config['indicator-test'];

// Let's create our own strat
var strat = {};

// Prepare everything our method needs
strat.init = function() {
  this.name = 'IndicatorTest';
  this.requiredHistory = config.tradingAdvisor.historySize;
  console.log('indicator-test init. settings:', settings)

  this.addIndicator('dema', 'DEMA', {
    short: settings.demaShort,
    long: settings.demaLong
  });

  this.addIndicator('rsi', 'RSI', config.RSI);
  this.addIndicator('macd', 'MACD', config.MACD);

  //this.addIndicator('ema', 'EMA', settings.emaWeight);
  //this.addIndicator('sma', 'SMA', settings.smaWeight);
}

// What happens on every new candle?
strat.update = function(candle) {
  this.indicators.rsi.config = config.RSI;
  // // Get a random number between 0 and 1.
   this.randomNumber = Math.random();

  // // There is a 10% chance it is smaller than 0.1
   this.toUpdate = this.randomNumber < 0.1;
}

// For debugging purposes.
strat.log = function() {
  //log.debug('calculated random number:');
  //log.debug('\t', this.randomNumber.toFixed(3));
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function() {
  //var rsi = this.indicators.rsi;
  //log.info("RSI",rsi.config)
  // Only continue if we have a new update.
  if(!this.toUpdate)
    return;

  if(this.currentTrend === 'long') {

    // If it was long, set it to short
    this.currentTrend = 'short';
    this.advice('short');

  } else {

    // If it was short, set it to long
    this.currentTrend = 'long';
    this.advice('long');

  }
}

module.exports = strat;