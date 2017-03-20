<template lang='jade'>
div
  h3 Select a dataset
  .txt--center.my2(v-if='datasetScanstate === "idle"')
    a.w100--s.btn--blue.scan-btn(href='#', v-on:click.prevent='scan') scan available data
  .txt--center.my2(v-if='datasetScanstate === "scanning"')
    spinner
  .my2(v-if='datasetScanstate === "scanned"')
    table.full
      thead
        tr
          th 
          th exchange
          th currency
          th asset
          th from
          th to
          th duration
      tbody
        tr(v-for='(set, i) in datasets')
          td.radio
            input(type='radio', name='dataset', :value='i', v-model='setIndex')
          td {{ set.exchange }}
          td {{ set.currency }}
          td {{ set.asset }}
          td {{ fmt(set.from) }}
          td {{ fmt(set.to) }}
          td {{ humanizeDuration(set.to.diff(set.from)) }}
    a(href='#', v-on:click.prevent='openRange', v-if='!rangeVisible') adjust range
    template(v-if='rangeVisible')
      div
        label(for='customFrom') From:
        input(v-model='customFrom')
      div
        label(for='customTo') To:
        input(v-model='customTo')

</template>

<script>

import _ from 'lodash'
import Vue from 'vue'

import { post } from '../../../tools/ajax'
import spinner from '../../global/blockSpinner.vue'
import dataset from '../../global/mixins/dataset'

export default {
  components: {
    spinner
  },
  data: () => {
    return {
      setIndex: -1,
      customTo: false,
      customFrom: false,
      rangeVisible: false,
      set: false
    };
  },
  mixins: [ dataset ],
  methods: {
    humanizeDuration: (n) => {
      return window.humanizeDuration(n, {largest: 4});
    },
    fmt: mom => mom.utc().format('DD-MM-YYYY HH:mm'),
    openRange: function() {
      if(this.setIndex === -1)
        return alert('select a range first');

      this.updateCustomRange();

      this.rangeVisible = true;
    },
    updateCustomRange: function() {
      this.customTo = this.fmt(this.set.to);
      this.customFrom = this.fmt(this.set.from);
    },
    emitSet: function(val) {
      if(!val)
        return;

      let set;

      if(!this.customTo)
        set = val;
      else {
        set = Vue.util.extend({}, val);
        set.to = moment.utc(this.customTo, 'DD-MM-YYYY HH:mm').format();
        set.from = moment.utc(this.customFrom, 'DD-MM-YYYY HH:mm').format();
      }

      console.log(set.to, set.from);

      this.$emit('dataset', set);
    }
  },
  watch: {

    setIndex: function() {
      this.set = this.datasets[this.setIndex];

      this.updateCustomRange();

      this.emitSet(this.set);
    },

    customTo: function() { this.emitSet(this.set); },
    customFrom: function() { this.emitSet(this.set); }
  }
}
</script>
<style>
td.radio {
  width: 45px;
}
</style>