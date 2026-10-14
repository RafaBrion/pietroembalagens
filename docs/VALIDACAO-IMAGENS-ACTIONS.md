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
- Fluxos nas duas versões, desktop/celular: menu, busca pelo campo visível, categoria identificada no conteúdo principal, galeria com troca/retorno efetivos, zoom, variação e quantidade confirmadas no carrinho e entrada do checkout. Cada navegação exige 200. Sem login autenticado, envio de pedido ou pagamento; marketing bloqueado.
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

Verificado localmente em 14/10/2026: `npm ci` do pacote QA, **cinco testes QA** e **131 testes da loja**, todos aprovados com Node 20.20.2. Puppeteer 24.15.0 com Chromium 154 abriu contexto/viewport e aplicou os comandos CDP usados no ensaio, com TLS ativo. Uma integração negativa com servidor de teste 404 confirmou que o coletor retorna falha e preserva a abertura, a exceção JS deliberada e as requisições; esses dados sintéticos não entram nas medições da loja. Sintaxe Node/YAML e guardas do workflow passaram. Não se executaram neste ambiente os novos builds/fluxos/coorte integrais deste workflow; devem ocorrer no runner do Actions.

O advisor revisou intenção, congelamento do catálogo, implementação e correções, e aprovou somente commit/push da branch de testes e execução QA. A revisão não aprova merge nem implantação da entrega 4. O preparo dos relatórios usa `RUNNER_TEMP` por etapa e `GITHUB_ENV`, sem depender de contexto `runner` em configuração de job.

Para liberar a entrega 4: completar os quatro cenários e fluxos, analisar erros/disponibilidade/TTFB e possíveis regressões com o advisor, obter aprovação concreta de Rafael e somente então publicar pela branch de aplicação apropriada. Após o deploy autorizado, conferir Hosting, SSR, PWA e fluxos na loja pública. A entrega 2B continua fora.

## Reversão da CI

Desabilitar este workflow no GitHub ou reverter somente o commit de CI na branch `test/entrega-4-actions`. Ele contém os arquivos de `.github/qa/images/`, `validate-images.yml` e a documentação desta validação; identificar o SHA efetivo em `git log`. Não reverter os commits de aplicação para desligar o teste. Não usar reset, force push nem alterar `master`.

Uma execução pode ser cancelada pelo painel Actions; isso interrompe somente o runner de QA. Nenhum recurso de produção foi modificado. Os servidores são locais ao job e encerrados ao terminar; o runner é descartável. Só a pasta de relatórios é enviada como artefato, excluindo snapshots, `.ecom.json`, headers, cookies, credenciais, dependências e fontes SSR.
