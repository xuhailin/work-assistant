<template>
  <div class="container mx-auto px-6 py-8">
    <div class="mb-6">
      <button
        @click="goBack"
        class="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        返回首页
      </button>
      <h1 class="text-4xl font-bold text-gray-800 mb-2">🏃 跑步统计</h1>
      <p class="text-gray-600">查看和分析你的跑步数据</p>
    </div>

    <div class="bg-white rounded-lg shadow-lg p-6">
      <div ref="chartContainer" class="w-full" style="height: 600px;"></div>
    </div>

    <div class="mt-6 bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">数据说明</h2>
      <div class="text-gray-600 space-y-2">
        <p>• 数据按月份自动分组，显示每月平均值</p>
        <p>• 所有指标均使用折线图显示，X轴为月份，Y轴自动适配数据范围</p>
        <p>• 新增天数Y轴（1-31号），散点标记有数据的日期</p>
        <p>• 数据文件位置：<code class="bg-gray-100 px-2 py-1 rounded">src/data/running-data.json</code></p>
        <p>• Y 轴配置位置：<code class="bg-gray-100 px-2 py-1 rounded">src/config/running-chart-config.ts</code></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import runningData from '../data/running-data.json'
import { yAxisConfigs, chartColors } from '../config/running-chart-config'

const router = useRouter()
const chartContainer = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const metricAxisConfigs = yAxisConfigs.filter(config => !config.isDayAxis)

interface RunningRecord {
  date: string
  distance: number
  cadence: number
  heartRate: number
  pace: number
}

// 按月份分组数据并计算平均值
function groupDataByMonth(data: RunningRecord[]) {
  const monthMap = new Map<string, RunningRecord[]>()
  
  data.forEach(record => {
    const date = new Date(record.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, [])
    }
    monthMap.get(monthKey)!.push(record)
  })

  // 计算每月平均值
  const months: string[] = []
  const averages: Record<string, number[]> = {}
  
  // 初始化平均值对象（仅处理指标类配置）
  metricAxisConfigs.forEach(config => {
    if (config.dataKey) {
      averages[config.dataKey] = []
    }
  })

  // 按月份排序
  const sortedMonths = Array.from(monthMap.keys()).sort()
  
  sortedMonths.forEach(monthKey => {
    const records = monthMap.get(monthKey)!
    const monthName = getMonthName(monthKey)
    months.push(monthName)
    
    // 计算每个指标的平均值
    metricAxisConfigs.forEach(config => {
      if (!config.dataKey) return
      const dataKey = config.dataKey
      const sum = records.reduce((acc, record) => {
        const value = (record as any)[dataKey]
        return acc + (value || 0)
      }, 0)
      const avg = sum / records.length
      averages[dataKey].push(Number(avg.toFixed(2)))
    })
  })

  return { months, averages }
}

// 获取月份名称（中文）
function getMonthName(monthKey: string): string {
  const [, month] = monthKey.split('-')
  const monthIndex = parseInt(month) - 1
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return monthNames[monthIndex]
}

// 提取有数据的日期，用于散点图标记
// 返回格式：[[月份索引, 日期], ...]
function prepareDayScatterData(data: RunningRecord[], months: string[]): [number, number][] {
  const scatterData: [number, number][] = []
  const monthMap = new Map<string, number>() // 月份名称 -> 月份索引
  
  months.forEach((month, index) => {
    monthMap.set(month, index)
  })
  
  // 按月份分组
  const monthDataMap = new Map<string, RunningRecord[]>()
  data.forEach(record => {
    const date = new Date(record.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthDataMap.has(monthKey)) {
      monthDataMap.set(monthKey, [])
    }
    monthDataMap.get(monthKey)!.push(record)
  })
  
  // 提取每个月的日期
  monthDataMap.forEach((records, monthKey) => {
    const monthName = getMonthName(monthKey)
    const monthIndex = monthMap.get(monthName)
    
    if (monthIndex !== undefined) {
      records.forEach(record => {
        const date = new Date(record.date)
        const day = date.getDate() // 1-31
        scatterData.push([monthIndex, day])
      })
    }
  })
  
  return scatterData
}

// 计算数据的最小值和最大值，用于设置Y轴范围
// 返回整数范围，避免小数位
function calculateYAxisMinMax(data: number[]): { min: number; max: number } {
  if (data.length === 0) return { min: 0, max: 100 }
  
  const min = Math.min(...data)
  const max = Math.max(...data)

  return {
    min: Math.floor(min),
    max: Math.ceil(max)
  }
}

// 初始化图表
function initChart() {
  if (!chartContainer.value) return

  chartInstance = echarts.init(chartContainer.value)
  
  const { months, averages } = groupDataByMonth(runningData as RunningRecord[])
  const dayScatterData = prepareDayScatterData(runningData as RunningRecord[], months)
  
  const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10

  const formatAxisLabel = (value: number, formatter: string) => {
    const roundedValue = roundToOneDecimal(value)
    return formatter.replace('{value}', roundedValue.toFixed(1))
  }

  const dayAxisConfigs = yAxisConfigs.filter(config => config.isDayAxis && config.markerSeries)

  // 根据同一侧的 Y 轴索引自动计算 offset，避免 Y 轴重叠
  const leftYAxes = yAxisConfigs.filter(c => c.position === 'left').sort((a, b) => a.yAxisIndex - b.yAxisIndex)
  const rightYAxes = yAxisConfigs.filter(c => c.position === 'right').sort((a, b) => a.yAxisIndex - b.yAxisIndex)

  // 计算 offset：同一侧的 Y 轴按索引顺序分配固定偏移量
  const calculateOffset = (config: typeof yAxisConfigs[0], samePositionAxes: typeof yAxisConfigs): number => {
    const index = samePositionAxes.findIndex(c => c.yAxisIndex === config.yAxisIndex)
    if (index === 0) return 0

    const baseOffset = 80
    return index * baseOffset
  }

  // 构建 Y 轴配置，优先使用配置中的 min/max，否则自动计算
  const yAxis = yAxisConfigs.map(config => {
    const data = config.dataKey ? averages[config.dataKey] : []

    let min: number | undefined
    let max: number | undefined

    const calculated = calculateYAxisMinMax(data)
    min = config.min !== undefined ? config.min : calculated.min
    max = config.max !== undefined ? config.max : calculated.max

    if (config.max === undefined && config.offset !== undefined) {
      max = max + config.offset
    }

    min = roundToOneDecimal(min)
    max = roundToOneDecimal(max)

    if (max <= min) {
      max = min + 0.1
    }

    const samePositionAxes = config.position === 'left' ? leftYAxes : rightYAxes
    const offset = calculateOffset(config, samePositionAxes)

    return {
      type: config.type,
      name: config.name,
      position: config.position,
      alignTicks: true,
      offset: offset,
      min: min,
      max: max,
      minInterval: 0.1,
      axisLine: {
        show: true,
        lineStyle: {
          color: config.color
        }
      },
      axisLabel: {
        formatter: (value: number) => formatAxisLabel(value, config.formatter)
      }
    }
  })
  
  // 构建系列配置：折线图（仅指标类配置）
  const series = metricAxisConfigs.map((config, index) => ({
    name: config.name,
    type: config.seriesType,
    yAxisIndex: config.yAxisIndex,
    data: config.dataKey ? averages[config.dataKey] : [],
    symbol: config.symbol || 'circle',
    symbolSize: config.symbolSize || 8,
    lineStyle: {
      width: 2
    },
    itemStyle: {
      color: chartColors[index]
    }
  }))
  
  // 添加天数散点图系列（从 yAxisConfigs 中读取）
  dayAxisConfigs.forEach(dayConfig => {
    series.push({
      name: dayConfig.markerSeries!.name,
      type: 'scatter',
      yAxisIndex: dayConfig.yAxisIndex,
      data: dayScatterData as [number, number][],
      symbol: dayConfig.markerSeries!.symbol,
      symbolSize: dayConfig.markerSeries!.symbolSize,
      itemStyle: {
        color: dayConfig.markerSeries!.color
      }
    } as any)
  })

  const option = {
    color: chartColors,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    grid: {
      right: '25%',
      left: '20%'
    },
    toolbox: {
      feature: {
        dataView: { show: true, readOnly: false },
        restore: { show: true },
        saveAsImage: { show: true }
      }
    },
    legend: {
      data: [
        ...metricAxisConfigs.map(config => config.name),
        ...dayAxisConfigs.map(config => config.markerSeries!.name)
      ]
    },
    xAxis: [
      {
        type: 'category',
        axisTick: {
          alignWithLabel: true
        },
        data: months
      }
    ],
    yAxis: yAxis,
    series: series
  }

  chartInstance.setOption(option)

  // 响应式调整
  window.addEventListener('resize', handleResize)
}

function handleResize() {
  chartInstance?.resize()
}

function goBack() {
  router.push('/')
}

onMounted(() => {
  nextTick(() => {
    initChart()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
code {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}
</style>
