var util = require('../../core/util');
var _ = require('lodash');
var fs = require('fs');
var toml = require('toml');

var config = util.getConfig();
var dirs = util.dirs();
var log = require(dirs.core + 'log');
var CandleBatcher = require(dirs.core + 'candleBatcher');

var moment = require('moment');
var isLeecher = config.market && config.market.type === 'leech';

var Actor = function(done) {
  _.bindAll(this);

  this.done = done;

  this.batcher = new CandleBatcher(config.tradingAdvisor.candleSize);

  this.strategyName = config.tradingAdvisor.method;

  this.setupStrategy();

  var mode = util.gekkoMode();

  // the stitcher will try to pump in historical data
  // so that the strat can use this data as a "warmup period"
  //
  // the realtime "leech" market won't use the stitcher
  if(mode === 'realtime' && !isLeecher) {
    var Stitcher = require(dirs.tools + 'dataStitcher');
    var stitcher = new Stitcher(this.batcher);
    stitcher.prepareHistoricalData(done);
  } else
    done();
}

Actor.prototype.setupStrategy = function() {

  if(!fs.existsSync(dirs.methods + this.strategyName + '.js'))
    util.die('Gekko can\'t find the strategy "' + this.strategyName + '"');

  log.info('\t', 'Using the strategy: ' + this.strategyName);

  const strategy = require(dirs.methods + this.strategyName);

  // bind all trading strategy specific functions
  // to the WrappedStrategy.
  const WrappedStrategy = require('./baseTradingMethod');

  //var stoploss_activated = stoploss_factor && !isNaN(stoploss_factor);
  var methodStop = config[this.methodName].stop !== undefined;

  /**

   1. backtest

   config[this.methodName].stop = 0.5
   config[this.methodName].stop = {
      loss: 0.1,
      type: 'fixed|trailing' (optional)
    }


   2. config

   percentage = config.stop.loss
   type = config.stop.type
   */

  var stoploss_activated = methodStop || config.stop.enabled || false;
  var stoploss_percentage = config.stop.loss || 0;

  // using stop params from backtest
  // stop = 0.1
  // stop = { loss: 0.1 }
  if (methodStop) {
    stoploss_percentage = !isNaN(config[this.methodName].stop) ? config[this.methodName].stop : config[this.methodName].stop.loss;
  }

  var stoploss_type = methodStop && typeof config[this.methodName].stop === 'object' ? config[this.methodName].stop.type : (config.stop.type || 'fixed');

  // require stop loss proxy strategy
  var stopLoss = require(dirs.methods + 'stop-loss');
  var owner = stoploss_activated ? stopLoss : method;
  _.each(strategy, function(fn, name) {
    WrappedStrategy.prototype[name] = fn;
  });

  if (stoploss_activated) {
    log.info('\t', stoploss_type + ' Stop-Loss activated: ' + (stoploss_percentage * 100).toFixed(5) + '%');

    _.each(method, function(fn, name) {
      Consultant.prototype['strategy_' + name] = fn;
    });

    Consultant.prototype.stoploss = {
      percentage: stoploss_percentage,
      type: stoploss_type
    };
  }

  let stratSettings;
  if(config[this.strategyName]) {
    stratSettings = config[this.strategyName];
  }

  this.strategy = new WrappedStrategy(stratSettings);
  this.strategy
    .on(
      'stratWarmupCompleted',
      e => this.deferredEmit('stratWarmupCompleted', e)
    )
    .on('advice', this.relayAdvice)
    .on(
      'stratUpdate',
      e => this.deferredEmit('stratUpdate', e)
    ).on('stratNotification',
      e => this.deferredEmit('stratNotification', e)
    )

  this.strategy
    .on('tradeCompleted', this.processTradeCompleted);

  this.batcher
    .on('candle', _candle => {
      const { id, ...candle } = _candle;
      this.deferredEmit('stratCandle', candle);
      this.emitStratCandle(candle);
    });
}

// HANDLERS
// process the 1m candles
Actor.prototype.processCandle = function(candle, done) {
  this.candle = candle;
  const completedBatch = this.batcher.write([candle]);
  if(completedBatch) {
    this.next = done;
  } else {
    done();
    this.next = false;
  }
  this.batcher.flush();
}

// propogate a custom sized candle to the trading strategy
Actor.prototype.emitStratCandle = function(candle) {
  const next = this.next || _.noop;
  this.strategy.tick(candle, next);
}

Actor.prototype.processTradeCompleted = function(trade) {
  this.strategy.processTrade(trade);
}

// pass through shutdown handler
Actor.prototype.finish = function(done) {
  this.strategy.finish(done);
}

// EMITTERS
Actor.prototype.relayAdvice = function(advice) {
  advice.date = this.candle.start.clone().add(1, 'minute');
  this.deferredEmit('advice', advice);
}


module.exports = Actor;
