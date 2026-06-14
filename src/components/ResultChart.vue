<template>
  <div class="chart-wrapper">
    <v-chart :option="chartOption" autoresize class="chart" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { algorithmColors } from '../mock/polls.js'

use([BarChart, TooltipComponent, GridComponent, CanvasRenderer])

const props = defineProps({
  poll: { type: Object, required: true }
})

const metricName = computed(() => {
  if (props.poll.algorithm === 'scoring') return '平均分'
  if (props.poll.algorithm === 'borda') return 'Borda 分数'
  if (props.poll.algorithm === 'weighted') return '平均权重'
  return '票数'
})

const chartOption = computed(() => {
  const poll = props.poll
  const color = algorithmColors[poll.algorithm] || '#409eff'
  const labels = poll.options.map((o) => o.label)
  const rawValues = poll.options.map((o) => Number(o.count || 0))
  const values = poll.algorithm === 'weighted'
    ? toWeightedPercent(rawValues)
    : rawValues

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        const suffix = poll.algorithm === 'weighted' ? '%' : poll.algorithm === 'scoring' ? ' 分' : poll.algorithm === 'single' || poll.algorithm === 'multiple' ? ' 票' : ''
        return `${p.name}<br/>${metricName.value}：${p.value}${suffix}`
      }
    },
    grid: { left: 60, right: 30, top: 24, bottom: 56 },
    xAxis: { type: 'category', data: labels, axisLabel: { rotate: 20, fontSize: 11 } },
    yAxis: {
      type: 'value',
      max: poll.algorithm === 'scoring' || poll.algorithm === 'weighted' ? 10 * (poll.algorithm === 'scoring' ? 1 : 10) : undefined,
      name: metricName.value
    },
    series: [{
      type: 'bar',
      data: values.map((value) => Number(value.toFixed ? value.toFixed(2) : value)),
      itemStyle: { color, borderRadius: [4, 4, 0, 0] },
      barWidth: '50%',
      label: {
        show: true,
        position: 'top',
        formatter: (p) => {
          if (poll.algorithm === 'weighted') return `${p.value}%`
          if (poll.algorithm === 'scoring') return `${p.value} 分`
          if (poll.algorithm === 'single' || poll.algorithm === 'multiple') return `${p.value} 票`
          return p.value
        }
      }
    }]
  }
})

const toWeightedPercent = (values) => {
  const total = values.reduce((sum, value) => sum + value, 0) || 1
  return values.map((value) => (value / total) * 100)
}
</script>

<style scoped>
.chart-wrapper { width: 100%; height: 380px; }
.chart { width: 100%; height: 100%; }
</style>
