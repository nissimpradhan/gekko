<template lang='jade'>
div
  div#resultHighchart
</template>

<script>

import _ from 'lodash'
import Vue from 'vue'
import * as Highcharts from 'highcharts/highstock'
import * as HighchartsMore from 'highcharts/highcharts-more'
//import * as Highcharts from 'highcharts-more-node'

// import { post } from '../../../tools/ajax'
// import spinner from '../../global/blockSpinner.vue'
// import dataset from '../../global/mixins/dataset'
const colors = ["#7cb5ec", "#90ed7d", "#f7a35c", "#e4d354", "#2b908f", "#f45b5b", "#91e8e1", "#8085e9", "#f15c80"];
const YAXIS_PRIMARY = 'primary'
const YAXIS_SECONDARY = 'secondary'

const indicatorResultMapFunctions = {
  'talib-dema': (res) => [moment(res.date).unix() * 1000, res.result.outReal],
  'macd-diff': (res) => [moment(res.date).unix() * 1000, res.diff],
  'macd-signal': (res) => [moment(res.date).unix() * 1000, res.signal],
  'macd-percentage': (res) => [moment(res.date).unix() * 1000, (res.result/res.ma)*100],
  default: (res) => [moment(res.date).unix() * 1000, res.result]
}

function getIndicatorResultMapFunction(indicatorType) {
  if (indicatorResultMapFunctions.hasOwnProperty(indicatorType)) {
    return indicatorResultMapFunctions[indicatorType];
  } else {
    return indicatorResultMapFunctions.default;
  }
}

// Types of indicators which should be drawn on the secondary yAxis
const secondaryAxisIndicatorTypes = ['DEMA', 'CCI','RSI','MACD','STOCHRSI'];

const strategyResultMapFunctions = {
  DDEMA: (res) => [moment(res.date).unix() * 1000, res.result]
}

export default {
  props: ['result'],
  components: {
    // spinner
  },
  data: () => {
    return {
      chart: null,
    };
  },
  // mixins: [ dataset ],
  methods: {
    // humanizeDuration: (n) => {
    //   return window.humanizeDuration(n, {largest: 4});
    // },
    humanizeTimestamp: timestamp => moment.utc(timestamp).format('YYYY-MM-DD HH:mm')
  },
  mounted () {
    console.log('backtest result chart mounted', this.result)
    const chartOptions = {
      chart: {
        renderTo: 'resultHighchart',
        //zoomType: 'x',
        height: 720,
        ignoreHiddenSeries: true
      },
      rangeSelector: {
        selected: 1
      },
      title: {
        // text: `${this.dataset.asset}-${this.dataset.currency} Trades`
      },
      legend: {
          enabled: true,
          align: 'center',
          backgroundColor: '#FFFFFF',
          borderColor: 'black',
          borderWidth: 0,
          layout: 'horizontal',
          verticalAlign: 'bottom',
          y: 0,
          shadow: false,
          floating: false
      },

      rangeSelector: {
          allButtonsEnabled: true,
          buttons: [{
              type: 'day',
              count: 1,
              text: '1d'
          }, {
              type: 'week',
              count: 1,
              text: '7d'
          }, {
              type: 'month',
              count: 1,
              text: '1m'
          }, {
              type: 'month',
              count: 3,
              text: '3m'
          }, {
              type: 'year',
              count: 1,
              text: '1y'
          }, {
              type: 'ytd',
              count: 1,
              text: 'YTD'
          }, {
              type: 'all',
              text: 'ALL'
          }],
          selected: 6,
          inputEnabled: true,
          enabled: true
      },

      yAxis: [{ // Primary yAxis
        opposite: true,
        height: '100%',
        id: YAXIS_PRIMARY,
        title: {
          text: `${this.result.report.asset}-${this.result.report.currency} Trades`,
          style: {
            color: colors[0]
          }
        },
        resize: {
          enabled: true
        }
       }
      //  ,
      //   {
      //       top: '80%',
      //       height: '20%',
      //       labels: {
      //           align: 'right',
      //           x: -3
      //       },
      //       offset: 0,
      //       title: {
      //           text: 'MACD'
      //       }
      //   }
      ],

      series: [{
        name: `${this.result.report.asset}-${this.result.report.currency}`,
        id: 'trades',
        data: this.result.candles.map((candle) => [moment(candle.start).unix() * 1000, candle.close]),
        //data: this.result.candles.map((candle) => [moment(candle.start).unix() * 1000, candle.open, candle.high, candle.low, candle.close]),
        color: colors[0]
        //type: 'candlestick'
      }
      // ,{
      //       type: 'macd',
      //       yAxis: 1,
      //       linkedTo: "trades"
      // }
      ],

      tooltip: {
        split:true,
        shared:true
      },

      plotOptions: {
        series: {
          animation: false,
          dataGrouping: {
            enabled: false
          },
          turboThreshold:5000
        },
        line: {
          dataGrouping: {
            enabled: false
          }
        }
      }

    }

    var primaryChartHeight = 100;
    var stopLossFlags;
    var infoFlags;
    // Add indicator results to chart
    for (let name in this.result.indicatorResults) {
      const indicator = this.result.indicatorResults[name]
      const indicatorType = indicator.talib ? `talib-${indicator.type}` : indicator.type;

      console.log(`add indicator result for type ${indicatorType}, name ${name}`)
      console.log(`indicator details for ${name}:`,indicator)
      //log.info(`add indicator result for type ${indicatorType}, name ${name}`)
      const resultMapFunction = getIndicatorResultMapFunction(indicatorType);
      const resultYAxis = secondaryAxisIndicatorTypes.indexOf(indicatorType) > -1 ? YAXIS_SECONDARY : YAXIS_PRIMARY;
      // indicatorResultYAxis[indicatorType] || indicatorResultYAxis.default

      let displayName = name + (indicator.talib ? ` (talib ${indicator.type})` : ` (${indicator.type})`)

      const color = colors[chartOptions.series.length];
      const yAxisId = (resultYAxis == YAXIS_SECONDARY) ? `y${chartOptions.yAxis.length}` : resultYAxis;
      const seriesId = `s${chartOptions.series.length}`;

      console.log(`indicator ${indicatorType} yAxisId ${yAxisId}`)
      
      if( resultYAxis == YAXIS_SECONDARY ){
        //Add yAxis
        primaryChartHeight -= 17;
        chartOptions.yAxis.push({
          id: yAxisId,
          gridLineWidth: 0,
          opposite: false,
          top: primaryChartHeight+"%",
          height: '17%',
          title: {
            text: displayName,
            style: {
              color: color
            }
          },
          resize: {
            enabled: true
          },
          plotLines: [{
                value: name == "rsi" ? 50:0,
                color: 'black',
                dashStyle: 'solid',
                width: 1,
            }]
        })
      }

      if(name == "macd"){
        chartOptions.series.push({
                name: 'MACD-Diff',
                id: seriesId,
                data: indicator.data.map(getIndicatorResultMapFunction("macd-diff")),
                yAxis: yAxisId,
                lineWidth: 1,
                color: "brown"
        });
        chartOptions.series.push({
                name: 'MACD-Signal',
                id: seriesId,
                data: indicator.data.map(getIndicatorResultMapFunction("macd-signal")),
                yAxis: yAxisId,
                lineWidth: 1,
                color: "red"
        });
        chartOptions.series.push({
                type: "column",
                name: 'MACD-result',
                id: seriesId,
                data: indicator.data.map(resultMapFunction),
                yAxis: yAxisId,
                color: color
        });

        chartOptions.yAxis.push({
          id: yAxisId + 1,
          gridLineWidth: 0,
          opposite: true,
          top: primaryChartHeight+"%",
          height: '13%',
          offset: 2,
          title: {
            text: "Percentage",
            style: {
              color: color
            }
          },
          plotLines: [{
                value: 0,
                color: 'black',
                dashStyle: 'solid',
                width: 1,
            }]
        })

        chartOptions.series.push({
                name: 'MACD-Percentage',
                id: seriesId,
                data: indicator.data.map(getIndicatorResultMapFunction("macd-percentage")),
                yAxis: yAxisId + 1,
                color: color
        });

      } else if (name == "stoploss"){
        stopLossFlags = indicator.data.filter((data) =>{
            return data.result;
          }).map((data) => {
            return {
              x: moment(data.date).unix() * 1000,
              title: 'SL',
              text: "Stop-loss"
              //fillColor: isBuy ? 'lightgreen' : 'pink'
            }
        });
        console.log("Stoploss Flags",stopLossFlags);
      } else if (name == "info"){
        //ar.reduce((r, e) => r.push(e+1, e+2) && r, []);

        infoFlags = indicator.data.filter((data) =>{
            return data.result.length != 0;
          }).reduce((array,indicatorData) => {
            indicatorData.result.map((msg)=>{
              array.push({
                x: moment(indicatorData.date).unix() * 1000,
                title: msg.text,
                text: msg.tooltip,
                fillColor: 'lightyellow',
                color:'gray'
              });
            })
            return array;
        },[]);
        console.log("Info Flags",infoFlags);
      } else{
        // Add Indicator Series
        chartOptions.series.push({
          name: displayName,
          id: seriesId,
          data: indicator.data.map(resultMapFunction),
          yAxis: yAxisId,
          lineWidth: 1,
          color: color
        })
      }

      
      //console.log("series:",chartOptions.series[chartOptions.series.length - 1]);
      if(name == "rsi"){
        
        chartOptions.yAxis[chartOptions.yAxis.length -1].plotBands = [{
                from: indicator.params.thresholds.low,
                to: indicator.params.thresholds.high,
                color: 'rgba(68, 170, 213, 0.2)'
        }];
      }
    }
    console.log("height:",primaryChartHeight);
    chartOptions.yAxis[0].height = primaryChartHeight+"%";
    // Add strategy results to chart
    let stratResultSeriesId;

    console.log("Strategy Result",this.result.strategyResults);
    // for (let name in this.result.strategyResults) {
    //   const displayName = `${name} strategy result`;
    //   const color = colors[chartOptions.yAxis.length];
    //   const yAxisId = `y${chartOptions.yAxis.length}`;
    //   const seriesId = `s${chartOptions.yAxis.length}`;
    //   stratResultSeriesId = seriesId;

    //   // chartOptions.yAxis.push({
    //   //   id: yAxisId,
    //   //   gridLineWidth: 0,
    //   //   opposite: false,
    //   //   top: '80%',
    //   //   height: '20%',
    //   //   offset: 2,
    //   //   title: {
    //   //     text: displayName,
    //   //     style: {
    //   //       color: color
    //   //     }
    //   //   }
    //   // })

    //   chartOptions.series.push({
    //     name: displayName,
    //     id: seriesId,
    //     data: this.result.strategyResults[name].data.map(strategyResultMapFunctions[name]),
    //     yAxis: 'secondary',
    //     lineWidth: 1,
    //     color: color,
    //     tooltip: {
    //       valueDecimals: 3
    //     }
    //   })
    // }

    // Add Buy/Sell Flags
    const buySellFlags = this.result.trades.map((trade) => {
      const isBuy = trade.action === 'buy';
      let texta = isBuy ? `Buy for ${trade.price}` : `Sell for ${trade.price}`
      return {
        x: moment(trade.date).unix() * 1000,
        title: isBuy ? 'B' : 'S',
        text: texta,
        fillColor: isBuy ? 'lightgreen' : 'pink'
      }
    })
    const flagSeriesId = `f${chartOptions.yAxis.length}`;
    chartOptions.series.push({
      type: 'flags',
      name: 'Flags',
      id: flagSeriesId,
      //data: buySellFlags.concat(stopLossFlags).concat(infoFlags),
      data: buySellFlags.concat(stopLossFlags),
      onSeries: 'trades',
      stackDistance:25
      // onSeries: stratResultSeriesId,
      // color: stratInstance.highcharts.color,
      // fillColor: stratInstance.highcharts.color
    })
    const infoFlagSeriesId = `f${chartOptions.series.length}`;
    chartOptions.series.push({
      type: 'flags',
      name: 'Flags',
      id: infoFlagSeriesId,
      data: infoFlags,
      stackDistance:25,
      onSeries: 'trades',
      visible:false,
      y:-60
      // onSeries: stratResultSeriesId,
      // color: stratInstance.highcharts.color,
      // fillColor: stratInstance.highcharts.color
    })

    this.chart = Highcharts.stockChart(chartOptions)

  },
  watch: {
    // setIndex: function() {
    //   this.set = this.datasets[this.setIndex];

    //   this.updateCustomRange();

    //   this.emitSet(this.set);
    // },

    // customTo: function() { this.emitSet(this.set); },
    // customFrom: function() { this.emitSet(this.set); },
    // importCandleSize: function() { this.emitSet(this.set); },
    // importCandleSizeUnit: function() { this.emitSet(this.set); }
  }
}
</script>
<style>
td.radio {
  width: 45px;
}
td label{
  display: inline;
  font-size: 1em;
}
</style>
