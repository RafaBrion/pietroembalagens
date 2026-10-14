const median = values => {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
function summarize (runs) {
  return [['home', 390], ['product', 390], ['home', 1440], ['product', 1440]].map(([name, width]) => {
    const rows = runs.filter(row => row.name === name && row.width === width && !row.warmup)
    const side = label => Object.fromEntries(['lcpMs', 'cls', 'ttfb', 'afterTtfb'].map(key => [key, median(rows.filter(row => row.label === label).map(row => row[key]))]))
    const pairs = [1, 2, 3, 4].map(pair => {
      const a = rows.find(row => row.pair === pair && row.label === 'baseline')
      const b = rows.find(row => row.pair === pair && row.label === 'candidate')
      return { pair, lcpDelta: a && b ? b.lcpMs - a.lcpMs : null }
    })
    return { name, width, baseline: side('baseline'), candidate: side('candidate'), pairedMedianDelta: median(pairs.filter(pair => pair.lcpDelta !== null).map(pair => pair.lcpDelta)), pairs }
  })
}
module.exports = { median, summarize }
