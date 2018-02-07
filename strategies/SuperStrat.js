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
      direction: 'up',
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
  var macd = this.indicators.macd;
  
  if(rsi.result == 0){
    return;
  }
  //console.log("This:",this);
  rsiStrat(this,candle,rsi,macd);
  macdStrat(this,candle,macd,rsi);
  hodlStrat(this,candle,macd,rsi);
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
logHodl = function(candle,ref){
  log.info(candle.start.format() +' --[HODL]--> | Duration: '+ref.trendtracking.duration+'| blips: '+ref.trendtracking.blips+'| trend:  ',ref.trendtracking.trend);
}
hodlStrat = (ref,candle,macd,rsi) => {
  if(rsi.result == 0)
    return;
  
  const RESISTANCE = 1; // Min duration required to be in up/down trend
  const DIFFICULTY_DELTA = 10;
  const UPTREND_MIN = 55;
  const DOWNTREND_MAX = 45;
  logHodl(candle,ref);
  if(ref.trendtracking.duration > 0){
    if(rsi.result < UPTREND_MIN)
      ref.trendtracking.blips++
    else {
        ref.trendtracking.duration += 1 + ref.trendtracking.blips;
        ref.trendtracking.blips = 0;
    }
  } else if(ref.trendtracking.duration < 0){
    if(rsi.result > DOWNTREND_MAX)
      ref.trendtracking.blips++
    else {
      ref.trendtracking.duration -= 1 + ref.trendtracking.blips;
      ref.trendtracking.blips = 0;
    }
  } else if(ref.trendtracking.duration == 0){
    ref.trendtracking.blips = 0;

    if(rsi.result > UPTREND_MIN){
      ref.trendtracking.duration++;
    } else if(rsi.result < DOWNTREND_MAX){
      ref.trendtracking.duration--;
    } 
  }

  if(ref.trendtracking.blips > RESISTANCE){
    log.info(candle.start.format() +' --[HODL]--> Resistance Met');
    ref.trendtracking.duration = 0
    // if(ref.trendtracking.duration > 0){
    //   ref.trendtracking.duration = ref.trendtracking.blips * -1;  
    // } else {
    //   ref.trendtracking.duration = ref.trendtracking.blips;  
    // }
    

    ref.trendtracking.blips = 0;

    if(ref.trendtracking.duration > RESISTANCE)
      ref.indicators.info.result.push(
        { type:"strat-hodl",
          text:"▲",
          tooltip: 'Up trending... not yet a Bull:'
        });
    else if (ref.trendtracking.duration < (RESISTANCE*-1))
      ref.indicators.info.result.push(
        { type:"strat-hodl",
          text:"▼",
          tooltip: 'Down trending... not yet a bear'
        });
  }
  
  if(ref.trendtracking.duration > 25){
    ref.trendtracking.trend = "bull";
  } else if(ref.trendtracking.duration < -25){
    ref.trendtracking.trend = "bear";
  } else {
    if(ref.trendtracking.trend == "bear" || ref.trendtracking.trend == "bull"){
      ref.indicators.info.result.push(
        { type:"strat-hodl",
          text:"►",
          tooltip: 'No Trend... it has been reset'
        });
    }
    
    ref.trendtracking.trend = "none";
    if(ref.trendtracking.lowExtended){
      ref.settings.thresholds.low += 10;
      ref.trendtracking.lowExtended = false;
    }
    if(ref.trendtracking.highExtended){
      ref.settings.thresholds.high -= 10;
      ref.trendtracking.highExtended = false;
    }
  }

  if(ref.trendtracking.trend =="bull") {
    //consistent uptrend is bullish so we buy during the right oppurtunity
    if(rsi.result > 50 && rsi.result < 53 && ref.recommendation == 'short'){
      log.info(candle.start.format() +' --[HODL]--> Adviced Long: ', candle.close.toFixed(8),"after consistent uptrend for " + ref.trendtracking.duration + " at RSI:",rsi.result);
      ref.advice("long");
      ref.indicators.info.result.push(
        { type:"strat-hodl",
          text:"▲B",
          tooltip: "HODL Buy has been triggered after " + ref.trendtracking.duration + "period"
        });
    }
    if(!ref.trendtracking.highExtended){
      ref.trendtracking.highExtended = true
      ref.settings.thresholds.high += DIFFICULTY_DELTA;
      log.info(candle.start.format() +' --[HODL]--> HIGH has been extended to: ',ref.settings.thresholds.high);
      ref.indicators.info.result.push(
        { type:"strat-hodl",
          text:"▲↑",
          tooltip: 'HIGH has been extended to: '+ref.settings.thresholds.high
        });
      //▲▼↓↑↕✓✘
    }
  } else  if (ref.trendtracking.trend == "bear"){
    if(!ref.trendtracking.lowExtended){
      ref.trendtracking.lowExtended = true
      ref.settings.thresholds.low -= DIFFICULTY_DELTA;
      log.info(candle.start.format() +' --[HODL]--> LOW has been extended to: ',ref.settings.thresholds.low);
      ref.indicators.info.result.push(
        { type:"strat-hodl",
          text:"▼↓",
          tooltip: 'LOW has been extended to: '+ref.settings.thresholds.high
        });
      //▲▼↓↑↕✓✘
    }
  } 
}

macdStrat = (ref,candle,macd,rsi) => {
  //log.info(candle.start.format() +' \t macd',macd);
  var macd_percentage = macd.result/macd.long.result*100;
  //log.info(candle.start.format() +' \t PREADVICE=',ref.trend.rsi.preAdvice,'| macd:',macd.result, '| percentage:',macd_percentage);
  if(ref.trend.rsi.preAdvice == "none" || ref.trend.rsi.preAdvice == undefined){
    //log.info(candle.start.format() +' \t skip macd');
    return;
  } else {
    ref.trend.macd.duration++;
  }
  log.info(candle.start.format() +' \t Duration['+ref.trend.macd.duration+'] Pre Advice ['+ref.trend.rsi.preAdvice+'] active | lastMacd',ref.trend.macd.lastMacd== undefined?"undefined":ref.trend.macd.lastMacd.toFixed(3),'| macd:',macd.result.toFixed(6), '| percentage:',macd_percentage.toFixed(3));
  ref.indicators.info.result.push(
    { type:"strat-macd",
      text:"≈" + ref.trend.macd.duration,
      tooltip: "MACD["+ref.trend.rsi.preAdvice+"] | Duration:"+ref.trend.macd.duration+" | % ="+macd_percentage.toFixed(3)
    });

  if(ref.trend.macd.duration > ref.settings.macd.persistence){
    // Means RSI gave a signal but MAC never confirmed it for a set number of candles(persistence)

    ref.indicators.info.result.push(
      { type:"strat-macd",
        text:"≈≈≈ " + ref.trend.macd.duration,
        tooltip: 'MACD Reset at as it never crossed ['+ref.trend.macd.duration+'/'+ ref.settings.macd.persistence+']'
      });

    log.info(candle.start.format() +' \t Macd took too long to cross over ['+ref.trend.macd.duration+'/'+ ref.settings.macd.persistence+']');
    resetTrend(ref);
    
    return;
  } 
  if(ref.trend.rsi.preAdvice == "buy" && !ref.trend.adviced){
    if(hasCrossedOver(ref.trend.macd.lastMacd , macd_percentage, ref.settings.macd.up, ref.settings.macd.down)){
      //Double check if rsi is high! meaning price has risen way above pre advice price
      if(rsi.result > 47){
          log.info(candle.start.format() +"\t \t ---> MACD gave signal to buy but RSI is > 50, meaning price already too expersive, so don't buy");  
          ref.indicators.info.result.push(
            { type:"strat-macd",
              text:"≈ ✘" + ref.trend.macd.duration,
              tooltip: 'MACD gave signal to buy but RSI is > 50'
            });
      } else {
        log.info(candle.start.format() +' \t \t ---> Adviced Long: ', candle.close.toFixed(8),' after confirmation from macd.');
        ref.advice('long');
        ref.indicators.info.result.push(
          { type:"strat-macd",
            text:"≈ ✓" + ref.trend.macd.duration,
            tooltip: 'MACD confirmed Signal Long: '+ candle.close.toFixed(8)
          });
      }
      resetTrend(ref);
    }
  } else if(ref.trend.rsi.preAdvice == "sell" && !ref.trend.adviced){
    if(hasCrossedUnder(ref.trend.macd.lastMacd , macd_percentage, ref.settings.macd.up, ref.settings.macd.down)){
      //Double check if rsi is high! meaning price has risen way above pre advice price
      if(rsi.result < 53){
        log.info(candle.start.format() +"\t \t ---> MACD gave signal to sell but RSI is < 50, meaning price already too low, so don't sell");  
        ref.indicators.info.result.push(
          { type:"strat-macd",
            text:"≈ ✘" + ref.trend.macd.duration,
            tooltip: 'MACD gave signal to sell but RSI is < 50'
          });
      } else {
        log.info(candle.start.format() +' \t \t ---> Adviced Short: ', candle.close.toFixed(8),' after confirmation from macd.');
        ref.advice('short');
        ref.indicators.info.result.push(
          { type:"strat-macd",
            text:"≈ ✓" + ref.trend.macd.duration,
            tooltip: 'MACD confirmed Signal Short: '+ candle.close.toFixed(8)
          });
      }
      resetTrend(ref);
    }
  }
  ref.trend.macd.lastMacd = macd_percentage;
}

rsiStrat = (ref,candle, rsi, macd) => {
  //console.log("This inside:",this);
  var rsiVal = rsi.result; 
  if(ref.trend.rsi.preAdvice == "buy" || ref.trend.rsi.preAdvice == "sell"){
    return;
  }
  var rsiDiff = rsiVal - ref.trend.rsi.lastRSI;
  if(ref.recommendation != "short" && ref.trend.rsi.direction == 'high'  && rsiDiff > -3){
    // check if RSI change direction and make sure it's not very little change.... 
    // very little change implies it's still increasing, and will miss out on huge profits
    ref.trend.rsi.trendReversed = true;
    log.info(candle.start.format() +' High Trend Reverse Confirmed at candle' + ref.trend.rsi.duration + '!');
    ref.indicators.info.result.push(
      { type:"strat-rsi",
        text:"↕ "+ref.trend.rsi.duration+1,
        tooltip: "Trend Reversed after rsiDiff:"+rsiDiff
      });
  }

  if(ref.trend.rsi.direction == 'low'  && rsiDiff > 3){
    ref.trend.rsi.trendReversed = true;
    log.info(candle.start.format() +' Low Trend Reverse Confirmed at candle!'+ ref.trend.rsi.duration + '!');
    ref.indicators.info.result.push(
      { type:"strat-rsi",
        text:"↕ "+ref.trend.rsi.duration+1,
        tooltip: "Trend Reversed after rsiDiff:"+rsiDiff
      });
  }

  if(ref.recommendation == "long" && rsiVal > ref.settings.thresholds.high || (ref.trend.rsi.trendReversed && ref.trend.rsi.direction == 'high')) {
    // new trend detected
    if(ref.trend.rsi.direction !== 'high')
      ref.trend.rsi = {
        duration: 0,
        persisted: false,
        direction: 'high',
        adviced: false,
        lastRSI: ref.trend.rsi.lastRSI,
        trendReversed: false
      };

    ref.trend.rsi.duration++;

    log.info(candle.start.format() +' In high since', ref.trend.rsi.duration, 'candle(s).. RSI:', logRSI(rsi));
    ref.indicators.info.result.push(
      { type:"strat-rsi",
        text:"↑ "+ref.trend.rsi.duration,
        tooltip: "High Since " + ref.trend.rsi.duration + "candles RSI:"+rsi.result
      });

    if(ref.trend.rsi.preAdvice != "buy" && ref.trend.rsi.preAdvice !="sell") {
      ref.trend.rsi.preAdvice = "sell";
      //ref.advice('long');
      log.info(candle.start.format() +' --> PreAdviced Short: ', candle.close.toFixed(8));
      ref.indicators.info.result.push(
        { type:"strat-rsi",
          text:"↑ ✓",
          tooltip: 'PreAdviced Short:'+ candle.close.toFixed(8)
        });
    } else{
      //ref.advice();
    }
  } else if( ref.recommendation != "long" && rsiVal < ref.settings.thresholds.low  || (ref.trend.rsi.trendReversed && ref.trend.rsi.direction == 'low')) {
    // new trend detected
    if(ref.trend.rsi.direction !== 'low')
      ref.trend.rsi = {
        duration: 0,
        persisted: false,
        direction: 'low',
        adviced: false,
        lastRSI: ref.trend.rsi.lastRSI,
        trendReversed: false
      };

    ref.trend.rsi.duration++;

    log.info(candle.start.format() +' In low since', ref.trend.rsi.duration, 'candle(s).. RSI:', logRSI(rsi));
    ref.indicators.info.result.push(
      { type:"strat-rsi",
        text:"↓ "+ref.trend.rsi.duration,
        tooltip: "Low Since " + ref.trend.rsi.duration + "candles RSI:"+rsi.result
      });

    if(ref.trend.rsi.preAdvice != "buy" && ref.trend.rsi.preAdvice !="sell") {
      if(ref.trend.rsi.trendReversed){
        ref.trend.rsi.preAdvice = "buy";
        //ref.advice('long');
        log.info(candle.start.format() +' --> PreAdviced Long: ', candle.close.toFixed(8));
        ref.indicators.info.result.push(
          { type:"strat-rsi",
            text:"↓ ✓",
            tooltip: 'PreAdviced Long:'+ candle.close.toFixed(8)
          });
      } else if( macd.result > ref.settings.thresholds.down && macd.result < 0){
        ref.indicators.info.result.push(
          { type:"strat-rsi",
            text:"↓ ✓✓✓",
            tooltip: 'Adviced Short:'+ candle.close.toFixed(8)
          });
        log.info(candle.start.format() +' Adviced Long: ', candle.close.toFixed(8)," because macd approaching zero");
        ref.advice('long');
        resetTrend(ref);
      }
      
    } else{
      //ref.advice();
    }
  } else if((ref.trend.rsi.direction == 'high' || ref.trend.rsi.direction == 'low')){
    // Reset Trend
    resetTrend(ref);
    log.info(candle.start.format() +' \t Reset Trend as trend ended');
    ref.indicators.info.result.push(
      { type:"strat-rsi",
        text:"↕ ✘",
        tooltip: 'Trend Reset beacause it didnt get inverted strongly'
      });
  } else {

    log.debug('In no trend');

    //ref.advice();
  }
  ref.trend.rsi.lastRSI = rsiVal
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
}

module.exports = method;
