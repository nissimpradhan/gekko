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

// ▲▼↓↑↕✓✘

resetTrend = function(ref){
  //console.log("Reset rend method this before resetTrend:",this)
  ref.trend = {
    rsi: {
      direction: 'none',
      duration: 0,
      lastRSI: undefined,
      trendReversed: false,
      persisted: false,
      preAdvice: "none"
    },
    macd: {
      duration: 0,
      persisted: false,
      direction: 'none',
      lastMacd: undefined,
    },
    persisted: false,
    adviced: false,
  };
}
resetTrendTracking = (ref, lastRSI)=>{
  //up or down
  // ref.trendtracking = {
  //   bullDuration: 0,//rsi > 50
  //   bearDuration: 0,//rsi < 50
  //   lastRSI: ref.trendtracking == undefined? 0:ref.trendtracking.lastRSI,
  //   bullBlips: 0,
  //   bearBlips: 0,
  //   highExtended:false,
  //   lowExtended:false,
  //   type: "bull",//bull,bear
  // };
  ref.trendtracking = {
    duration: 0,//rsi > 50
    lastRSI: ref.trendtracking == undefined? 0:ref.trendtracking.lastRSI,
    blips: 0,
    blipsCount: 0,
    highExtended:false,
    lowExtended:false,
    trend: "none",//bull,bear
  };
}
setMacTrend = (ref,trendDirection)=>{
  //up or down
  ref.trend.macd = {
    duration: 0,
    persisted: false,
    direction: trendDirection
  };
}
// prepare everything our method needs
method.init = function() {
  this.name = 'RSI_wait';
  resetTrend(this);
  resetTrendTracking(this);
  this.requiredHistory = this.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('rsi', 'RSI', this.settings);
  this.addIndicator('macd', 'MACD', this.settings.macd);

  this.addIndicator('info', 'INFO', {});
  this.addIndicator('stochrsi', 'STOCHRSI', this.settings.stochrsi);

  /* For talib
  var customBBANDSettings = {
    optInTimePeriod: 20,
    optInNbDevUp: 2,
    optInNbDevDn: 2,
    optInMAType: 2
  }*/

  var customBBANDSettings = {
    optInTimePeriod: 20,
    optInNbStdDevs: 2
  }
  // add the indicator to the strategy
  // this.addTalibIndicator('bbands', 'bbands', customBBANDSettings);
  this.addTulipIndicator('bbands', 'bbands', customBBANDSettings);


  //this.addIndicator('ema', 'EMA', settings.emaWeight);
  //this.addIndicator('sma', 'SMA', settings.smaWeight);

  this.on('advice', function (advice) {
    this.recommendation = advice.recommendation;
  });
}

// What happens on every new candle?
method.update = function(candle) {
  this.indicators.rsi.config = this.settings;
  var rsi = this.indicators.rsi;
  var stochrsi = this.indicators.stochrsi;
  var macd = this.indicators.macd;
  // var bbands = this.talibIndicators.bbands;
  var bbands = this.tulipIndicators.bbands;

  if(rsi.result == 0){
    return;
  }

  //rsiStrat(this,candle,rsi,macd);
  superMACDStrat(this,candle,macd,bbands);
  bbands.closeToBband = false;
  if (candle.close > bbands.result.outRealMiddleBand) {
    var diff = candle.close - bbands.result.outRealUpperBand;
    var percentage = diff/bbands.result.outRealUpperBand * 100;
    if(percentage > -1){
      bbands.closeToBband = true;
    }
    // this.talibIndicators.bbands.result.percentageClose = percentage;
    this.tulipIndicators.bbands.result.percentageClose = percentage;
  } else {
    var diff = bbands.result.outRealLowerBand - candle.close;
    var percentage = diff/bbands.result.outRealLowerBand * 100;
    if(diff > -1){
      bbands.closeToBband = true;
    }
    // this.talibIndicators.bbands.result.percentageClose = percentage;
    this.tulipIndicators.bbands.result.percentageClose = percentage;
  }
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


}

superMACDStrat = (ref,candle, macd, bbands) => {
  var macdVal = macd.result/macd.long.result*100; //percentage
  //var macdVal = macd.result;
  var closeToBband = false;

  var DIFF_FOR_REVERSAL = 0.2;//3 for RSI 25 for stochRSI

  var macdDiff = macdVal - ref.trend.macd.lastMACD;
  if(ref.recommendation != "short" && ref.trend.macd.direction == 'high'  && macdDiff < (-1 * DIFF_FOR_REVERSAL)){
    // check if RSI change direction and make sure it's not very little change....
    // very little change implies it's still increasing, and will miss out on huge profits
    ref.trend.macd.trendReversed = true;
    log.info(candle.start.format() +' High Trend Reverse Confirmed at candle' + ref.trend.macd.duration + '!');
    ref.indicators.info.result.push(
      { type:"strat-super-macd",
        text:"↕ "+(ref.trend.macd.duration+1),
        tooltip: "Trend Reversed after macdDiff:"+macdDiff
      });
  }

  if(ref.trend.macd.direction == 'low'  && macdDiff > DIFF_FOR_REVERSAL){
    ref.trend.macd.trendReversed = true;
    log.info(candle.start.format() +' Low Trend Reverse Confirmed at candle!'+ ref.trend.macd.duration + '!');
    ref.indicators.info.result.push(
      { type:"strat-super-macd",
        text:"↕ "+(ref.trend.macd.duration+1),
        tooltip: "Trend Reversed after macdDiff:"+macdDiff
      });
  }

  if(ref.recommendation == "long" && macdVal > 0 || (ref.trend.macd.trendReversed && ref.trend.macd.direction == 'high')) {
    // new trend detected
    if(ref.trend.macd.direction !== 'high')
      ref.trend.macd = {
        duration: 0,
        persisted: false,
        direction: 'high',
        adviced: false,
        lastRSI: ref.trend.macd.lastRSI,
        trendReversed: false
      };

    ref.trend.macd.duration++;

    //log.info(candle.start.format() +' In high since', ref.trend.macd.duration, 'candle(s).. RSI:', logRSI(macd));
    if(macdVal > 1){
      ref.indicators.info.result.push(
        { type:"strat-super-macd",
          text:"↑ "+ref.trend.macd.duration,
          tooltip: "High Since [<"+ref.settings.thresholds.high+"] "+ ref.trend.macd.duration + "candles"
        });
    }

    if(ref.trend.macd.trendReversed && bbands.closeToBband){
      //ref.trend.macd.preAdvice = "sell";
      ref.advice('short');
      ref.indicators.info.result.push(
        { type:"strat-super-macd",
          text:"↑ ✓✓✓",
          tooltip: 'Adviced Short:'+ candle.close.toFixed(8)
        });
      resetTrend(ref);
    }
  } else if( ref.recommendation != "long" && macdVal < 0  || (ref.trend.macd.trendReversed && ref.trend.macd.direction == 'low')) {
    // new trend detected
    if(ref.trend.macd.direction !== 'low')
      ref.trend.macd = {
        duration: 0,
        persisted: false,
        direction: 'low',
        adviced: false,
        lastRSI: ref.trend.macd.lastRSI,
        trendReversed: false
      };

    ref.trend.macd.duration++;

    //log.info(candle.start.format() +' In low since', ref.trend.macd.duration, 'candle(s).. RSI:', logRSI(macd));
    if(macdVal < -1){
      ref.indicators.info.result.push(
        { type:"strat-super-macd",
          text:"↓ "+ref.trend.macd.duration,
          tooltip: "Low Since [<"+ref.settings.thresholds.low+"] "+ ref.trend.macd.duration + "candles"
        });
    }

    if(ref.trend.macd.trendReversed && bbands.closeToBband){
      ref.advice('long');
      log.info(candle.start.format() +' --> PreAdviced Long: ', candle.close.toFixed(8));
      ref.indicators.info.result.push(
        { type:"strat-super-macd",
          text:"↓ ✓✓✓",
          tooltip: 'Adviced Long:'+ candle.close.toFixed(8)
        });
      resetTrend(ref);
    }
  } else if((ref.trend.macd.direction == 'high' || ref.trend.macd.direction == 'low')){
    //Reset Trend
    // resetTrend(ref);
    // log.info(candle.start.format() +' \t Reset Trend as trend ended');
    // ref.indicators.info.result.push(
    //   { type:"strat-super-macd",
    //     text:"↕ ✘",
    //     tooltip: 'Trend Reset beacause it didnt get inverted strongly'
    //   });
  } else {

    log.debug('In no trend');

    //ref.advice();
  }
  ref.trend.macd.lastMACD = macdVal
}

hasCrossedOver = function(lastMacd , macd_percentage, up, down){
  //only use with buy signal
  // console.log("check1:"+ (macd_percentage > lastMacd)
  //           , "| check2:"+ (macd_percentage > down && macd_percentage < 0)
  //           , "| check3:" +  (macd_percentage > 0));
  if(lastMacd == undefined) {// first tick after preadvice
    return ( (macd_percentage >= down && macd_percentage <= 0));// means macd almost close to zero;
  } else{
    return macd_percentage > lastMacd //means macd is increasing
    && ( (macd_percentage > down && macd_percentage < 0) // means macd almost close to zero
    || (macd_percentage > 0)); // means macd crossed zero
  }

}
hasCrossedUnder = function(lastMacd , macd_percentage, up, down){
  //only use with buy signal
  if(lastMacd == undefined) {// first tick after preadvice
    return ((macd_percentage < up && macd_percentage > 0)); // means macd almost close to zero
  } else{
    return macd_percentage < lastMacd //means macd is increasing
      && ((macd_percentage < up && macd_percentage > 0) // means macd almost close to zero
          || macd_percentage < 0); // means macd crossed zero
  }

}

logRSI = function(rsi){
  return "RSI |u:" + rsi.u.toFixed(2) + "| d:" + rsi.d.toFixed(2) + "| rs" + rsi.rs.toFixed(2) + "| result:" + rsi.result.toFixed(2);
  //return "RSI |min:" + rsi.lowestRSI.toFixed(2) + "| max:" + rsi.highestRSI.toFixed(2) + "| result:" + rsi.result.toFixed(2);
}

module.exports = method;
