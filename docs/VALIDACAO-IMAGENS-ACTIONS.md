# Entrega 4 — validação isolada no GitHub Actions

**Somente testes. Não mesclar esta branch em master. Publicação da entrega 4 continua em HOLD.**

Workflow: `.github/workflows/validate-images.yml`. Branch: `test/entrega-4-actions`, preparada a partir de `perf/imagem-principal` (`14ff3b65`). Não altera aplicação, dependências/lockfiles da loja, workflow de deploy, Firebase ou produção.

## Como executar e consultar

O primeiro push dessa branch dispara o workflow automaticamente, se Actions estiver habilitado no repositório. O primeiro acionamento não depende de adicionar o workflow ao `master`. `workflow_dispatch` só fica plenamente disponível quando o GitHub conhece o workflow no ramo padrão; não mesclar a branch para habilitá-lo.

No repositório que receber a branch, abrir **Actions → Entrega 4 - validar imagens (sem deploy)**. A execução contém o resumo e o artefato `entrega-4-validation-<SHA>-<tentativa>`, retido por 14 dias. O arquivo `SUMMARY.md` apresenta os SHAs, estado das etapas, sondas e métricas. Logs, JSON e capturas são preservados também em caso de erro.

Se o fork exigir **Enable workflows**, seu proprietário precisa habilitar Actions antes de executar novamente a branch. Falta de acesso ou workflow não iniciado deve ser registrada como bloqueio, nunca como teste aprovado. Para repetir uma execução existente, usar **Re-run jobs**; não substituir resultados anteriores.

## O que será verificado

- Runner hospedado pelo GitHub, Ubuntu 24.04, Node 20.20.2 e Chrome instalado no runner; versões efetivas registradas. `contents: read`, checkout no SHA do evento e sem credenciais persistidas. Sem secrets, credenciais Firebase, permissão de escrita, deploy ou merge automático.
- Baseline fixo `e78a30ccbf03e3b15f25ffdd5e29cd075678306f`. Candidato é o SHA exato da execução, descendente da aplicação revisada `fde272c17e8a4703afc17edaa61fd23b88306783`. Alterações de aplicação posteriores são rejeitadas; só CI/QA/documentação podem diferir desse candidato aprovado.
- Dependências da aplicação instaladas com os lockfiles existentes. Ferramentas de navegador têm manifesto/lockfile próprios em `.github/qa/images`; os lockfiles da aplicação permanecem intactos. Instalações, testes existentes, build das seis páginas e preparação SSR são executados para cada versão, sequencialmente na mesma pasta física para reduzir diferenças de hashes de build.
- Sonda do SSR **sem wrapper** nas duas versões: HTTP 200, contexto/identidade do produto correto, foto carregada e dependências presentes, com erros registrados. Uma falha mantém bloqueado o gate de disponibilidade, mesmo que o teste controlado seguinte passe.
- Fluxos nas duas versões, desktop/celular: menu, busca pelo campo visível, categoria identificada no conteúdo principal, galeria com troca/retorno efetivos, zoom, variação e quantidade confirmadas no carrinho e entrada do checkout. Cada navegação exige HTTP 200 e destino correto. Se o Puppeteer retornar resposta nula, o CDP precisa comprovar a resposta e o corpo da mesma navegação: documento/frame principal, URL, loader e requestId correspondentes. Não há GET substituto nem bypass do worker; falhas/exceções não são aprovadas. Os quatro casos funcionais têm contextos independentes; cada resultado é preservado mesmo se outro falhar, sem retentar o caso. Qualquer falha mantém o resultado global reprovado. Sem login autenticado, envio de pedido ou pagamento; marketing bloqueado.
- PWA em um único origin local: baseline → candidato → baseline, incluindo worker/HTML/CSS novos offline, rota lazy em aba antiga, retirada da prioridade/classe no rollback e permanência das fontes/helper anteriores. Essa etapa usa os builds do laboratório; o revert da aplicação e novo build foram testados separadamente conforme `ENTREGA-IMAGENS.md`.
- Nova coorte: quatro pares AB/BA por cenário (home/produto × 390/1440), **32 medições + oito aquecimentos definidos antes da execução**. Processo/contexto novo, cache HTTP desligado, CPU 4×, download 5 Mbps/upload 1 Mbps/latência 80 ms, observação até cinco segundos após load. Sem builds/outros testes concorrentes. CDN e APIs do navegador reais, TLS padrão, sem espelhos nem certificado especial.
- LCP real precisa ser a imagem examinada, carregada e com uma única requisição/variante. Prioridade inicial `High` no candidato; fonte/dimensões naturais devem permanecer iguais. LCP, CLS, TTFB local, LCP após TTFB, bytes, recursos, erros e capturas são registrados. A linha é persistida antes das asserções, inclusive navegações interrompidas. Não há descarte de resultados lentos nem repetição automática por desempenho.

## Catálogo fixo e limites

O preparo captura uma vez dados de leitura públicos via SDK: store/categories/grids/items e os contextos de produto/categoria escolhidos. Valida tipo, ID/slug, SKU, imagens HTTPS/dimensões e variações. Os hashes, horário, identificadores e proveniência são registrados; o conteúdo do catálogo fica somente em `RUNNER_TEMP` e não vai para o artefato.

Os dois builds usam o mesmo `.ecom.json`. No SSR controlado, um preload exclusivo do processo QA envolve o construtor do roteador: somente `map`/`resolve` das **duas rotas exatas** retornam cópias independentes do snapshot; as demais chamadas continuam no roteador original. Não se edita aplicação nem `node_modules`. O handler SSR, compressão e templates são os da respectiva versão.

Essa escolha isola o efeito do frontend de alterações de conteúdo entre as aberturas. O relatório deve ser lido como **SSR local com catálogo público fixo**: diferenças de TTFB não representam a API nem a hospedagem de produção. A sonda real é uma evidência separada, não uma substituição por snapshot em caso de erro. Serviços do navegador continuam sujeitos à rede real; falhas e mudanças de conteúdo precisam ser avaliadas.

A corrida preexistente de `_context` permanece intacta. Exceções JS da coorte são preservadas e deixam o job com necessidade de revisão, mesmo quando originadas no baseline. Etapas incompletas/ausentes não são aprovadas. Um job verde é evidência para revisão, sem promessa de ganho público ou liberação automática.

## Estado e gates

Preparação local: instalações do pacote QA e testes de segurança/dados/estatística, suite existente e disponibilidade do navegador/CDP devem ter evidências registradas antes do push. Isso não equivale à execução integral no GitHub Actions; registrar a URL e os resultados reais quando ela acontecer.

Verificado localmente em 14/10/2026: `npm ci` do pacote QA, **sete testes QA** e **131 testes da loja**, todos aprovados com Node 20.20.2. Puppeteer 24.15.0 com Chromium 154 abriu contexto/viewport e aplicou os comandos CDP usados no ensaio, com TLS ativo. Uma integração negativa com servidor de teste 404 confirmou que o coletor retorna falha e preserva a abertura, a exceção JS deliberada e as requisições; esses dados sintéticos não entram nas medições da loja. Sintaxe Node/YAML e guardas do workflow passaram. O navegador de teste também verificou o reconhecimento da mesma imagem antes e depois da montagem da galeria, sem aguardar essa montagem no coletor de desempenho. Não se executaram neste ambiente os novos builds/fluxos/coorte integrais deste workflow; devem ocorrer no runner do Actions.

O advisor revisou intenção, congelamento do catálogo, implementação e correções, e aprovou somente commit/push da branch de testes e execução QA. A revisão não aprova merge nem implantação da entrega 4. O preparo dos relatórios usa `RUNNER_TEMP` por etapa e `GITHUB_ENV`, sem depender de contexto `runner` em configuração de job.

Para liberar a entrega 4: completar os quatro cenários e fluxos, analisar erros/disponibilidade/TTFB e possíveis regressões com o advisor, obter aprovação concreta de Rafael e somente então publicar pela branch de aplicação apropriada. Após o deploy autorizado, conferir Hosting, SSR, PWA e fluxos na loja pública. A entrega 2B continua fora.

## Primeira execução real — 38635847707

[Execução de 14/10/2026](https://github.com/RafaBrion/pietroembalagens/actions/runs/38635847707), SHA QA `42431bbf`, concluída com falha e artefato preservado. Os dois builds, testes da loja, sondas SSR reais/controladas e PWA passaram. O SSR real retornou HTTP 200 para o produto correto nas duas versões, sem o bloqueio do proxy da nuvem.

O fluxo funcional parou porque o teste tentou ler `status()` de uma resposta de navegação nula; o relatório antigo não registrava a origem dessa navegação, portanto a causa não pode ser afirmada. A coleta guardou 39 das 40 aberturas e parou ao procurar somente o seletor da galeria hidratada, embora a foto SSR estivesse carregada e fosse o LCP. Não combinar essa coorte incompleta com outra nem extrair ganho final dela.

Correções exclusivas de QA: auditar origem/destino/resposta de cada navegação; aceitar resposta nula somente com prova de mesmo documento e GET 200 separado; reconhecer a imagem SSR visível ou hidratada no instante da medição, sem prolongar a espera; verificar fotos e miniaturas ativas no fluxo funcional. A próxima execução inicia uma coorte completa nova. Falhas externas de recursos continuam registradas para revisão. Esses resultados não liberam publicação.

## Segunda execução real — 38637883124

[Execução de 14/10/2026](https://github.com/RafaBrion/pietroembalagens/actions/runs/38637883124), SHA QA `16e20641`: **comparação completa, 40/40 aberturas**, sem exceções JS na coorte. Ambos os builds/testes da loja, sondas SSR reais/controladas e PWA passaram. Job continua com falha porque o fluxo funcional do baseline parou em navegação com resposta Puppeteer nula. A auditoria confirma origem `/` e destino categoria; não era navegação no mesmo documento, e o teste a rejeitou corretamente em vez de substituí-la por um GET.

| Cenário | LCP mediano atual → candidato | Δ mediano pareado | CLS mediano atual → candidato |
|---|---:|---:|---:|
| Home 390 | 1490 → 1520 ms | 0 ms | 0,07708 → 0,07548 |
| Produto 390 | 1852 → 1888 ms | +14 ms | 0,04172 → 0,04169 |
| Home 1440 | 1562 → 1590 ms | +28 ms | 0,00015 → 0,00015 |
| Produto 1440 | 1886 → 1904 ms | +22 ms | 0,01413 → 0,01062 |

São quatro pares por cenário, em laboratório SSR local, com rede/CDN reais. Três produtos ainda estavam em SSR no instante da coleta, reconhecidos sem espera extra. Não houve ganho de LCP demonstrado; diferenças pequenas não comprovam regressão pública relevante. Falhas externas permanecem no artefato. O advisor recomenda manter a entrega 4 em HOLD, sem publicar como melhoria de velocidade. Preservar esta coorte completa independentemente do diagnóstico funcional seguinte.

O diagnóstico foi reproduzido depois em um servidor sintético local, com Node 20/Puppeteer 24.15/Chromium 154 e o mesmo mecanismo de interceptação: duas navegações sem worker retornam 200; com um worker que repassa a navegação à rede, Puppeteer retorna nulo embora o CDP registre a resposta 200 real. O ajuste exclusivo de QA valida a resposta/corpo desse mesmo documento; não troca o worker nem a aplicação. Teste negativo 404 e incompatibilidades de URL, frame, loader e requestId são rejeitados. O fixture está em `worker-check.cjs` e gera `navigation-fixture.json` no artefato, separado das métricas da loja.

## Terceira execução real — 38639730332 e encerramento do preparo

[Execução de 14/10/2026](https://github.com/RafaBrion/pietroembalagens/actions/runs/38639730332), SHA QA `2f90cc22`: comparação novamente **completa, 40/40**, sem exceções JS na coorte. Builds, testes existentes, sondas SSR reais/controladas e PWA passaram. A correção CDP confirmou HTTP 200 real com service worker nas navegações que o Puppeteer retornava como nulas; categoria e busca passaram nos quatro casos.

| Cenário | LCP mediano atual → candidato | Δ mediano pareado | CLS mediano atual → candidato |
|---|---:|---:|---:|
| Home 390 | 1542 → 1574 ms | +42 ms | 0,07865 → 0,07914 |
| Produto 390 | 1884 → 1860 ms | +14 ms | 0,04519 → 0,04172 |
| Home 1440 | 1574 → 1596 ms | +16 ms | 0,00015 → 0,00015 |
| Produto 1440 | 1908 → 1922 ms | +14 ms | 0,01413 → 0,01057 |

Esta coorte e a segunda são registros separados, sem combinar amostras nem escolher a melhor tentativa. A prioridade inicial foi elevada de Medium para High e as fontes/dimensões da imagem permaneceram consistentes, mas **não houve ganho consistente de LCP demonstrado**. Os valores são de laboratório; não demonstram ganho ou regressão relevante em produção.

O job permanece bloqueado pelos quatro casos funcionais: baseline/candidato desktop e candidato mobile excederam o tempo ao voltar da segunda para a primeira foto; baseline mobile excedeu o tempo ao navegar da busca para o produto. Menus/categoria/busca passaram até esses pontos. **Zoom, variação, carrinho e entrada do checkout não foram concluídos nesta execução.** As falhas, capturas e rastros foram preservados, sem repetição automática ou aprovação por outra versão.

O advisor identificou uma hipótese na fonte da galeria: a thumbnail pode mudar o índice selecionado enquanto o Glide ainda bloqueia movimentos durante a transição. Isso explicaria thumbnail inicial selecionada com a segunda foto visível, mas exige diagnóstico instrumentado; a causa e a preexistência não estão comprovadas. O timeout de navegação mobile é uma pendência separada. Nenhuma correção de aplicação foi implementada para essas falhas.

**Parecer do advisor:** preparação da alternativa de CI concluída, entrega 4 em HOLD, sem merge/deploy e sem recomendação de publicar como melhoria de velocidade. Próximo trabalho delimitado: diagnóstico funcional da galeria e do timeout, preservando as comparações completas. Não é necessário repetir a coleta de desempenho para investigar esses fluxos.

O ajuste final de higiene limita os novos rastros ao documento/frame principal e às falhas de requests acompanhados; URLs de subframes externos não são necessárias à prova. Sete testes QA e fixture de navegador local aprovaram resposta/corpo 200, rejeição de 404 e exclusão de um iframe efetivamente carregado. Esse ajuste final de rastros e documentação usa `[skip ci]`: **não foi executado no Actions** e não substitui o SHA `2f90cc22` como referência da terceira rodada. Não altera aplicação, medições ou falhas já registradas.

## Reversão da CI

Desabilitar este workflow no GitHub ou reverter somente os commits exclusivos da CI na branch `test/entrega-4-actions`. Eles contêm os arquivos de `.github/qa/images/`, `validate-images.yml` e a documentação desta validação; identificar o SHA efetivo em `git log`. Não reverter os commits de aplicação para desligar o teste. Não usar reset, force push nem alterar `master`.

Uma execução pode ser cancelada pelo painel Actions; isso interrompe somente o runner de QA. Nenhum recurso de produção foi modificado. Os servidores são locais ao job e encerrados ao terminar; o runner é descartável. Só a pasta de relatórios é enviada como artefato, excluindo snapshots, `.ecom.json`, headers, cookies, credenciais, dependências e fontes SSR.
