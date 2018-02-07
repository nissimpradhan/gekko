var _ = require('lodash');

// listen to all messages and internally queue
// all candles and trades, when done report them
// all back at once

var _ = require('lodash');

module.exports = done => {
  var trades = [];
  var roundtrips = []
  var candles = [];
  var report = false;
  var indicatorResults = {};
  var strategyResults = {};

  return {
    message: message => {
      
      if(message.type === 'candle'){
        candles.push(message.candle);
      }

      else if(message.type === 'trade')
        trades.push(message.trade);

      else if(message.type === 'roundtrip')
        roundtrips.push(message.roundtrip);

      else if(message.type === 'report')
        report = message.report;

      else if(message.log)
        console.log(message.log);

      else if(message.type === 'indicatorResult') {
         //console.log('indicatorResult', message.indicatorResult)
         //console.log('dataDiff', message.indicatorResult.data.diff)
         
        if(!_.has(indicatorResults, message.indicatorResult.name)) {
          indicatorResults[message.indicatorResult.name] = {
            type: message.indicatorResult.type,
            talib: !!message.indicatorResult.talib,
            data: [],
            params: message.indicatorResult.params
          };
        }
        if(message.indicatorResult.name == "macd" &&  message.indicatorResult.data != undefined){
          indicatorResults[message.indicatorResult.name].data.push({
            result: message.indicatorResult.result,
            diff: message.indicatorResult.data.diff,
            signal: message.indicatorResult.data.signal.result,
            ma: message.indicatorResult.data.long.result,
            date: message.indicatorResult.date
          });
        } else {
          indicatorResults[message.indicatorResult.name].data.push({
            result: message.indicatorResult.result,
            date: message.indicatorResult.date
          });
        }
        
      } else if(message.type === 'strategyResult') {
        if(!_.has(strategyResults, message.strategyResult.name)) {
          strategyResults[message.strategyResult.name] = {
            data: []
          };
        }

        strategyResults[message.strategyResult.name].data.push({
          result: message.strategyResult.result,
          date: message.strategyResult.date
        });
      }
    },
    exit: status => {

      if(status !== 0)
        done('Child process has died.');
      else
        done(null, {
          trades,
          candles,
          report,
          roundtrips,
          indicatorResults,
          strategyResults
        });
    }
  }
}
