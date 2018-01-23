/*

  RSI - cykedev 14/02/2014

  (updated a couple of times since, check git history)

 */
// helpers
var _ = require('lodash');
var log = require('../core/log.js');

var RSI = require('./indicators/RSI.js');

// let's create our own method
var method = {};
var logRSI;

// prepare everything our method needs
method.init = function() {
  this.name = 'RSI_wait';

  this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false,
    lastRSI: 0,
    trendReversed: false
  };

  this.requiredHistory = this.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('rsi', 'RSI', this.settings);
  this.addIndicator('macd', 'MACD', this.settings.macd);
}

// for debugging purposes log the last
// calculated parameters.
method.log = function(candle) {
  var digits = 8;
  var rsi = this.indicators.rsi;
  log.debug('calculated RSI properties for candle:');
  log.debug('\t', 'rsi:', rsi.result.toFixed(digits));
  log.debug('\t', 'price:', candle.close.toFixed(digits));
}

method.check = function(candle) {
  var rsi = this.indicators.rsi;
  var rsiVal = rsi.result;

  if(rsiVal <= this.trend.lastRSI && Math.abs(rsiVal - this.trend.lastRSI) > 1){
    this.trend.trendReversed = true;
    log.info('Trend Reverse Confirmed!');
  }

  if(rsiVal > this.settings.thresholds.high) {

    // new trend detected
    if(this.trend.direction !== 'high')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'high',
        adviced: false,
        lastRSI: this.trend.lastRSI,
        trendReversed: false
      };

    this.trend.duration++;

    log.info('In high since', this.trend.duration, 'candle(s).. RSI:', logRSI(rsi));

    if(this.trend.duration >= this.settings.thresholds.persistence)
      this.trend.persisted = true;
    // check if RSI change direction and make sure it's not very little change.... 
    // very little change implies it's still increasing, and will miss out on huge profits

    if((this.trend.persisted || this.trend.trendReversed) && !this.trend.adviced) {
      this.trend.adviced = true;
      this.advice('short');
      log.info('Adviced Short: ', candle.close.toFixed(8),' at Time',candle.start.format());
    } else
      this.advice();

  } else if(rsiVal < this.settings.thresholds.low) {

    // new trend detected
    if(this.trend.direction !== 'low')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'low',
        adviced: false,
        lastRSI: this.trend.lastRSI,
        trendReversed: false
      };

    this.trend.duration++;

    log.info('In low since', this.trend.duration, 'candle(s).. RSI:', logRSI(rsi));
    
    if(this.trend.duration >= this.settings.thresholds.persistence)
      this.trend.persisted = true;
    
    if((this.trend.persisted || this.trend.trendReversed) && !this.trend.adviced) {
      this.trend.adviced = true;
      this.advice('long');
      log.info('Adviced Long: ', candle.close.toFixed(8),' at Time',candle.start.format());
    } else
      this.advice();

  } else {

    log.debug('In no trend');

    this.advice();
  }
  this.trend.lastRSI = rsiVal
}
logRSI = function(rsi){
  return "RSI |u:" + rsi.u + "| d:" + rsi.d + "| rs" + rsi.rs + "| result:" + rsi.result;
}
module.exports = method;
