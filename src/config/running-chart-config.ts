// 跑步统计图表 Y 轴配置
// 这个配置文件可以方便地添加或修改 Y 轴参数

import { chartSymbols } from "./chart-symbol"

export interface YAxisConfig {
  name: string // Y 轴名称
  dataKey?: string // 数据字段名
  type: 'value' // 轴类型
  position: 'left' | 'right' // 位置
  color: string // 轴线颜色
  formatter: string // 标签格式化器，如 '{value} km'
  seriesType?: 'bar' | 'line' | 'scatter' // 对应的系列类型
  yAxisIndex: number // Y 轴索引
  symbol?: string // 折线图点的图标类型，如 'circle', 'rect', 'triangle', 'diamond', 'pin', 'arrow'
  symbolSize?: number // 图标大小
  min?: number // 最小值
  max?: number // 最大值
  offset?: number // 最大值偏移量（未配置 max 时生效）
  isDayAxis?: boolean // 是否为天数轴
  markerSeries?: {
    name: string
    symbol: string
    symbolSize: number
    color: string
  }
}

export const yAxisConfigs: YAxisConfig[] = [
  {
    name: '距离(km)',
    dataKey: 'distance',
    type: 'value',
    position: 'right',
    color: '#5070dd',
    formatter: '{value} ',
    seriesType: 'line',
    yAxisIndex: 0,
    symbol: `image://${chartSymbols.sun}`,
    symbolSize: 20,
    min: 1,
    offset: 1
  },
  {
    name: '步频(步/分)',
    dataKey: 'cadence',
    type: 'value',
    position: 'right',
    color: '#b6d634',
    formatter: '{value} ',
    seriesType: 'line',
    yAxisIndex: 1,
    symbol: `image://${chartSymbols.run}`,
    symbolSize: 20,
    min: 150,
    offset: 10
  },
  {
    name: '心率(bpm)',
    dataKey: 'heartRate',
    type: 'value',
    position: 'left',
    color: '#505372',
    formatter: '{value}',
    seriesType: 'line',
    yAxisIndex: 2,
    symbol: `image://${chartSymbols.pluse}`,
    symbolSize: 20,
    min: 120,
    offset: 10
  },
  {
    name: '配速(km/h)',
    dataKey: 'pace',
    type: 'value',
    position: 'left',
    color: '#ff6b6b',
    formatter: '{value}',
    seriesType: 'line',
    yAxisIndex: 3,
    symbol: `image://${chartSymbols.shoe}`,
    symbolSize: 20,
    min: 4,
    offset: 1
  },
  {
    name: '天数',
    type: 'value',
    position: 'left',
    color: 'red',
    formatter: '{value}',
    yAxisIndex: 4,
    min: 1,
    offset: 1,
    max: 31,
    isDayAxis: true,
    markerSeries: {
      name: '有数据日期',
      symbol: 'pin',
      symbolSize: 10,
      color: '#999999'
    }
  }
]

// 图表颜色配置
export const chartColors = [
  '#7FB3FF', // 浅蓝：距离 / 总量 / 趋势（最稳）
  '#7ED6A5', // 浅绿：步频 / 节奏
  '#FF9AA2', // 浅红：心率（不刺眼）
  '#C3A6FF', // 浅紫：备用 / 对比线

];
