
export function getChartSymbol(name: string) {
    return new URL(
      `../assets/symbols/${name}.svg`,
      import.meta.url
    ).href
  }

  export const chartSymbols = {
    run: getChartSymbol('run'),
    pluse: getChartSymbol('pluse'),
    shoe: getChartSymbol('shoe'),
    sun: getChartSymbol('sun')
  }