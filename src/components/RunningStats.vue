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
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">🤖 AI 图片分析</h2>
      <p class="text-gray-600 mb-4">上传跑步截图，自动识别日期、心率、距离等数据，可编辑后确认保存。</p>
      <div class="flex flex-col gap-3">
        <input
          type="file"
          accept="image/*"
          class="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          @change="handleImageChange"
        />
        <div class="flex items-center gap-3">
          <button
            class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="!selectedImage || analyzing"
            @click="analyzeImage"
          >
            {{ analyzing ? '分析中...' : '开始分析' }}
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            @click="addEmptyRow"
          >
            新增一行
          </button>
        </div>
      </div>

      <div v-if="selectedImage" class="mt-4">
        <img :src="selectedImage" alt="预览" class="max-h-60 rounded-lg border border-gray-200" />
      </div>

      <p v-if="analysisError" class="mt-3 text-sm text-red-600">{{ analysisError }}</p>
      <p v-if="saveMessage" class="mt-3 text-sm text-green-600">{{ saveMessage }}</p>
      <p v-if="backupPath" class="mt-1 text-xs text-gray-500">备份文件：{{ backupPath }}</p>

      <div v-if="aiRecords.length" class="mt-4 overflow-x-auto">
        <table class="min-w-full text-sm text-gray-700 border">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 border">日期</th>
              <th class="px-3 py-2 border">距离(km)</th>
              <th class="px-3 py-2 border">步频</th>
              <th class="px-3 py-2 border">心率</th>
              <th class="px-3 py-2 border">配速</th>
              <th class="px-3 py-2 border">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in aiRecords" :key="index">
              <td class="px-3 py-2 border">
                <input v-model="row.date" type="date" class="w-full border rounded px-2 py-1" />
              </td>
              <td class="px-3 py-2 border">
                <input v-model.number="row.distance" type="number" step="0.1" class="w-full border rounded px-2 py-1" />
              </td>
              <td class="px-3 py-2 border">
                <input v-model.number="row.cadence" type="number" class="w-full border rounded px-2 py-1" />
              </td>
              <td class="px-3 py-2 border">
                <input v-model.number="row.heartRate" type="number" class="w-full border rounded px-2 py-1" />
              </td>
              <td class="px-3 py-2 border">
                <input v-model.number="row.pace" type="number" step="0.1" class="w-full border rounded px-2 py-1" />
              </td>
              <td class="px-3 py-2 border text-center">
                <button class="text-red-600 hover:text-red-800" @click="removeRow(index)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="mt-4 flex items-center gap-3">
          <button
            class="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            :disabled="aiRecords.length === 0"
            @click="confirmAndSave"
          >
            确认并保存
          </button>
          <span class="text-xs text-gray-500">会覆盖同日期记录并生成备份。</span>
        </div>
      </div>
    </div>

    <div class="mt-6 bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">数据说明</h2>
      <div class="text-gray-600 space-y-2">
        <p>• 数据按月份自动分组，显示每月平均值</p>
        <p>• 所有指标均使用折线图显示，X轴为月份，Y轴自动适配数据范围</p>
        <p>• 新增天数Y轴（1-31号），散点标记有数据的日期</p>
        <p>• 数据文件位置：<code class="bg-gray-100 px-2 py-1 rounded">src/data/running-data.json</code></p>
        <p>• AI 保存后数据会写入用户目录的 <code class="bg-gray-100 px-2 py-1 rounded">running-data.json</code></p>
        <p>• Y 轴配置位置：<code class="bg-gray-100 px-2 py-1 rounded">src/config/running-chart-config.ts</code></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
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

const runningRecords = ref<RunningRecord[]>([])
const aiRecords = ref<RunningRecord[]>([])
const selectedImage = ref<string | null>(null)
const analyzing = ref(false)
const analysisError = ref('')
const saveMessage = ref('')
const backupPath = ref('')

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

function getChartSourceData(): RunningRecord[] {
  if (runningRecords.value.length) return runningRecords.value
  return runningData as RunningRecord[]
}

function buildChartOption(data: RunningRecord[]) {
  const { months, averages } = groupDataByMonth(data)
  const dayScatterData = prepareDayScatterData(data, months)

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
    const axisData = config.dataKey ? averages[config.dataKey] : []

    let min: number | undefined
    let max: number | undefined

    const calculated = calculateYAxisMinMax(axisData)
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

  return {
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
}

// 初始化图表
function initChart() {
  if (!chartContainer.value) return

  chartInstance = echarts.init(chartContainer.value)
  const option = buildChartOption(getChartSourceData())
  chartInstance.setOption(option)

  // 响应式调整
  window.addEventListener('resize', handleResize)
}

function handleResize() {
  chartInstance?.resize()
}

function updateChart() {
  if (!chartInstance) return
  const option = buildChartOption(getChartSourceData())
  chartInstance.setOption(option, true)
}

function goBack() {
  router.push('/')
}

async function loadRunningData() {
  if (window.api?.getRunningData) {
    try {
      const data = await window.api.getRunningData()
      runningRecords.value = Array.isArray(data) ? data : []
      return
    } catch (error) {
      console.error('读取跑步数据失败:', error)
    }
  }
  runningRecords.value = runningData as RunningRecord[]
}

function handleImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  const reader = new FileReader()
  reader.onload = () => {
    selectedImage.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

async function analyzeImage() {
  // 调试信息
  console.log('🔍 analyzeImage called');
  console.log('🔍 selectedImage.value:', !!selectedImage.value);
  console.log('🔍 window.api:', window.api);
  console.log('🔍 window.api?.analyzeRunningImage:', window.api?.analyzeRunningImage);
  console.log('🔍 typeof window.api?.analyzeRunningImage:', typeof window.api?.analyzeRunningImage);
  
  if (!selectedImage.value || !window.api?.analyzeRunningImage) {
    console.error('❌ 条件不满足:', {
      hasImage: !!selectedImage.value,
      hasApi: !!window.api,
      hasAnalyzeFunction: !!window.api?.analyzeRunningImage
    });
    analysisError.value = '未选择图片或当前环境不支持 AI 分析'
    return
  }
  analysisError.value = ''
  saveMessage.value = ''
  backupPath.value = ''
  analyzing.value = true
  try {
    const result = await window.api.analyzeRunningImage({ imageBase64: selectedImage.value })
    const records = Array.isArray(result?.records) ? result.records : []
    aiRecords.value = records.map((record: any) => ({
      date: record.date || '',
      distance: Number(record.distance) || 0,
      cadence: Number(record.cadence) || 0,
      heartRate: Number(record.heartRate) || 0,
      pace: Number(record.pace) || 0
    }))
    if (aiRecords.value.length === 0) {
      analysisError.value = '未识别到有效数据，请检查图片或手动新增一行'
    }
  } catch (error: any) {
    analysisError.value = error?.message || 'AI 分析失败'
  } finally {
    analyzing.value = false
  }
}

function addEmptyRow() {
  aiRecords.value.push({
    date: '',
    distance: 0,
    cadence: 0,
    heartRate: 0,
    pace: 0
  })
}

function removeRow(index: number) {
  aiRecords.value.splice(index, 1)
}

function mergeRecords(existing: RunningRecord[], incoming: RunningRecord[]) {
  const map = new Map<string, RunningRecord>()
  existing.forEach(record => {
    if (record.date) map.set(record.date, record)
  })
  incoming.forEach(record => {
    if (record.date) map.set(record.date, record)
  })
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// 辅助函数：将响应式对象转换为纯 JavaScript 对象，避免 IPC 序列化错误
function toPlainObject(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}

async function confirmAndSave() {
  saveMessage.value = ''
  analysisError.value = ''
  backupPath.value = ''

  const validIncoming = aiRecords.value.filter(record => record.date && record.distance > 0)
  if (validIncoming.length === 0) {
    analysisError.value = '请至少填写一条有效记录（日期+距离）'
    return
  }

  const merged = mergeRecords(runningRecords.value, validIncoming)
  if (!window.api?.saveRunningData) {
    analysisError.value = '当前环境不支持保存，请在桌面端运行'
    return
  }

  try {
    // 将响应式对象转换为纯 JavaScript 对象，避免 "An object could not be cloned" 错误
    const plainMerged = toPlainObject(merged)
    const result = await window.api.saveRunningData(plainMerged)
    runningRecords.value = merged
    aiRecords.value = []
    saveMessage.value = '保存成功！已自动创建备份'
    // 只显示备份文件名，不显示完整路径
    if (result?.backupPath) {
      const backupFileName = result.backupPath.split(/[/\\]/).pop()
      backupPath.value = `备份文件：${backupFileName}`
    }
    updateChart()
  } catch (error: any) {
    analysisError.value = error?.message || '保存失败'
  }
}

onMounted(() => {
  // 调试信息：检查 window.api 的状态
  console.log('🔍 RunningStats mounted - window.api:', window.api);
  console.log('🔍 window.api?.analyzeRunningImage:', window.api?.analyzeRunningImage);
  console.log('🔍 window.api keys:', window.api ? Object.keys(window.api) : 'window.api is undefined');
  
  loadRunningData().then(() => {
    nextTick(() => {
      initChart()
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})

watch(runningRecords, () => {
  updateChart()
})
</script>

<style scoped>
code {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}
</style>
