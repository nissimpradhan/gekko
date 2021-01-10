// required indicators

var Helper = function(config) {
  this.input = 'price';
}

Helper.prototype.checkIfTrendReversed = function(ref,candle, rsi, macd) {
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
  return ref.trend.rsi.trendReversed;
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
      tooltip: "High Since [<"+ref.settings.thresholds.high+"] "+ ref.trend.rsi.duration + "candles RSI:"+rsi.result
    });

  if(ref.trend.rsi.preAdvice != "buy" && ref.trend.rsi.preAdvice !="sell") {
    if(ref.trend.rsi.trendReversed){
      ref.trend.rsi.preAdvice = "sell";
      //ref.advice('long');
      log.info(candle.start.format() +' --> PreAdviced Short: ', candle.close.toFixed(8));
      ref.indicators.info.result.push(
        { type:"strat-rsi",
          text:"↑ ✓",
          tooltip: 'PreAdviced Short:'+ candle.close.toFixed(8)
        });
    } else if( macd.result < ref.settings.thresholds.up && macd.result > 0){
      ref.indicators.info.result.push(
        { type:"strat-rsi",
          text:"↑ ✓✓✓",
          tooltip: 'Adviced Short:'+ candle.close.toFixed(8)
        });
      log.info(candle.start.format() +' Adviced Short: ', candle.close.toFixed(8)," because macd approaching zero");
      ref.advice('short');
      resetTrend(ref);
    }
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
      tooltip: "Low Since [<"+ref.settings.thresholds.low+"] "+ ref.trend.rsi.duration + "candles RSI:"+rsi.result
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
  //resetTrend(ref);
  // log.info(candle.start.format() +' \t Reset Trend as trend ended');
  // ref.indicators.info.result.push(
  //   { type:"strat-rsi",
  //     text:"↕ ✘",
  //     tooltip: 'Trend Reset beacause it didnt get inverted strongly'
  //   });
} else {

  log.debug('In no trend');

  //ref.advice();
}
ref.trend.rsi.lastRSI = rsiVal

module.exports = Indicator;
