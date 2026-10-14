const fs = require('node:fs')
const path = require('node:path')
const config = require('./config.cjs')
fs.mkdirSync(config.reports, { recursive: true })
const read = file => { try { return JSON.parse(fs.readFileSync(path.join(config.reports, file))) } catch { return null } }
const source = read('source.json'), execution = read('execution.json'), comparison = read('comparison.json')
const format = value => typeof value === 'number' ? value.toFixed(2) : '—'
const lines = [
  '# Entrega 4 — validação isolada', '', '**HOLD — este workflow não autoriza merge ou publicação.**', '',
  `Baseline: \`${source?.baseline || 'não preparado'}\``, `Candidato: \`${source?.candidate || 'não preparado'}\``, '',
  `Execução: **${execution?.status || 'não executada'}**; comparação: **${comparison?.status || 'não executada'}**.`,
  `Aberturas registradas: ${comparison?.runs?.length || 0}/40 (32 medidas + 8 aquecimentos).`, '',
  'SSR local com catálogo público fixo. CDN e APIs do navegador reais, TLS padrão. TTFB não representa a API nem a hospedagem de produção.', '',
  '## Sonda do SSR sem catálogo fixo', '',
  ...(execution?.canaries?.map(row => `- ${row.label}: HTTP ${row.status ?? 'sem resposta'}; ${row.passed ? '200/imagem/dependências aprovados' : 'BLOQUEADO: ' + row.error}; exceções JS: ${row.errors?.length || 0}.`) || ['Não executada.']), '',
  '## Medições', '', '| Cenário | LCP baseline → candidato (ms) | Δ pareado (ms) | CLS baseline → candidato | TTFB local baseline → candidato (ms) |', '|---|---:|---:|---:|---:|'
]
for (const row of comparison?.summaries || []) lines.push(`| ${row.name} ${row.width} | ${format(row.baseline.lcpMs)} → ${format(row.candidate.lcpMs)} | ${format(row.pairedMedianDelta)} | ${format(row.baseline.cls)} → ${format(row.candidate.cls)} | ${format(row.baseline.ttfb)} → ${format(row.candidate.ttfb)} |`)
if (!comparison?.summaries) lines.push('| Comparação incompleta | — | — | — | — |')
lines.push('', '## Limites e próximos gates', '',
  `- Runs com exceções JS: ${comparison?.runs?.filter(row => row.errors?.length).length || 0}; todos preservados, inclusive falhas e resultados desfavoráveis.`,
  '- Consulte execution.json, browser-regression.json, pwa.json, comparison.json, logs e PNGs no artefato. Fases ausentes ou incompletas não são aprovadas.',
  '- A corrida preexistente de _context não foi suprimida nem corrigida. Falhas de rede/SSR/dependências bloqueiam liberação.',
  '- Sem login autenticado, pedido, pagamento ou Purchase. Marketing bloqueado nos testes.',
  '- Catálogo, cookies, headers, credenciais, node_modules e fontes SSR não são publicados no artefato.',
  '- Concluir quatro cenários, avaliar métricas/erros com advisor e obter aprovação concreta de Rafael; depois validar a implantação real de Hosting/SSR/PWA.', '')
const body = lines.join('\n')
fs.writeFileSync(path.join(config.reports, 'SUMMARY.md'), body)
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, body)
