// required indicators
var _ = require('lodash');
var RSI = require('./RSI.js');

var Indicator = function (config) {
  this.input = 'candle';
  this.RSIhistory = [];
  this.interval = config.interval;

  rsi_config = {
    interval: config.rsi_interval
  }
  console.log("STOCHRSI interval:"+config.interval+' rsi_interval'+config.rsi_interval);
  this.rsi = new RSI(rsi_config);
}

Indicator.prototype.update = function (candle) {
  this.rsi.update(candle);
  this.rsivalue = this.rsi.result;
  
  this.RSIhistory.push(this.rsivalue);

  if(_.size(this.RSIhistory) > this.interval)
    // remove oldest RSI value
    this.RSIhistory.shift();

  this.lowestRSI = _.min(this.RSIhistory);
  this.highestRSI = _.max(this.RSIhistory);
  this.result = ((this.rsivalue - this.lowestRSI) / (this.highestRSI - this.lowestRSI)) * 100;
}

module.exports = Indicator;
