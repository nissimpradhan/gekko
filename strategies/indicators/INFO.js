// required indicators

var Indicator = function(config) {
  this.input = 'price';
}

Indicator.prototype.update = function(price) {
  this.result = [];
}

module.exports = Indicator;
