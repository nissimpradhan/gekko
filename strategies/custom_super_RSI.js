// T	his is a basic example strategy for Gekko.
// For more information on everything please refer
// to this document:
//
// https://gekko.wizb.it/docs/strategies/creating_a_strategy.html
//
// The example below is pretty bad investment advice: on every new candle there is
// a 10% chance it will recommend to change your position (to either
// long or short).

var log = require('../core/log');

// Let's create our own strat
var strat = {};

// Prepare everything our method needs
strat.init = function() {
  this.input = 'candle';
  this.trend = 'short';
  this.requiredHistory = 0;
	this.up = 65;
	this.down = 35;
	this.stoploss = "";
	//assuming candle is 15 min
	var rsi_settings_15 = {
    optInTimePeriod:14
  }
	var settings1 = {
    interval:14
  };
	var settings2 = {
    interval:28
  };
	var settings3 = {
    interval:56
  };
	
  // add the indicator to the strategy
  //this.addTalibIndicator('rsi_15', 'rsi', rsi_settings_15);
	this.addIndicator('myrsi_1', 'RSI', settings1);
	this.addIndicator('myrsi_2', 'RSI', settings2);
	this.addIndicator('myrsi_3', 'RSI', settings3);
	
}

// What happens on every new candle?
strat.update = function(candle) {

}

// For debugging purposes.
strat.log = function() {
	if(this.indicators.myrsi_1.result > this.up || this.indicators.myrsi_2.result > this.up || this.indicators.myrsi_3.result > this.up
			|| this.indicators.myrsi_1.result < this.down || this.indicators.myrsi_2.result < this.down || this.indicators.myrsi_3.result < this.down){				
				//log.debug('Rsi 1 number:', this.indicators.myrsi_1.result);
				//log.debug('Rsi 2 number:', this.indicators.myrsi_2.result);
				//log.debug('Rsi 3 number:', this.indicators.myrsi_3.result);
			}
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function(candle) {

	//var result_15 = this.talibIndicators.rsi_15.result;
	var result_15 = this.indicators.myrsi_1.result;
	var price = candle.close;
	
  if(result_15 > this.up || this.stoploss != "" && candle.close < this.stoploss){
		if(this.trend == "long"){
				this.stoploss = "";				
				// If it was long, set it to short
				this.trend = 'short';
				this.advice('short');
				console.log("Price Sold",this.priceSold);
				
				if(this.stoploss != "" && price<this.stoploss){
							console.log("Stoplosss triggered at price - "+ this.stoploss);
				}
		}
	} else if ( result_15 < this.down){
		if(this.stoploss=="" && this.trend == "short"){
			//sets up the stoploss, you should make the .2 a variable in the strategy config really
				this.stoploss = price-(price*.2);
				this.direction="long";
				// If it was short, set it to long
				this.trend = "long";
				this.advice('long');
				console.log("Stoplosss set at - "+ this.stoploss);
		}
	}
}
		
module.exports = strat;
