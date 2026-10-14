# Entrega 4 — Prioridade das imagens principais

**DRAFT — não mesclar nem publicar.** Preparada para revisão, **não publicada**. Advisor liberou somente a branch/draft; a comparação final está bloqueada e precisa terminar antes de nova aprovação. A entrega 2b continua fora desta branch e de produção.

A alternativa autorizada é a validação isolada no GitHub Actions, em `test/entrega-4-actions`, sem deploy: [instruções, condições e limites](VALIDACAO-IMAGENS-ACTIONS.md). Preparar o workflow não equivale a concluir os testes nem remove este HOLD.

- Base publicada: `e78a30ccbf03e3b15f25ffdd5e29cd075678306f` (fontes/PR #90).
- Aplicação: prioridade em `91060ccfdb8a8f8b8f99bd762bb190061799e226` e reserva SSR/CSS em `fde272c17e8a4703afc17edaa61fd23b88306783`; branch `perf/imagem-principal`.
- Baseline identificada: Actions `38592708589`, Hosting `165c5410780640d8`, release `1791993158183000`, SSR `635 ACTIVE`. Reconfirmar imediatamente antes de publicar.
- A branch também incorpora somente o registro documental da publicação anterior, em `552f1277`.

## Evidência e mudança

A inspeção pública identificou o banner como LCP da home no celular/computador e a primeira foto como LCP do produto examinado. As imagens eram descobertas pelo parser com prioridade inicial `Medium`. Elas já carregavam sem lazy loading, tinham dimensões/reserva de proporção e baixavam a variante responsiva correta.

A mudança acrescenta `fetchpriority="high"` e `loading="eager"` à imagem principal. No banner, isso vale somente para o primeiro slide ativo da primeira seção habilitada da home, respeitando agendamento; outro banner abaixo continua com a prioridade anterior. No produto, os atributos ficam no primeiro `img` SSR, preservado na montagem inicial da galeria. `product-block.ejs` já era rastreado: seu conteúdo difere do template instalado somente nesses dois atributos.

URLs e arquivos de imagens, qualidade, formatos, fontes, dimensões finais, proporções e recortes permanecem iguais. O CSS ganha uma condição para aplicar a reserva de altura já existente desde a abertura do banner, descrita abaixo. Não há novo preload de imagem nem conversão/recompressão. A lógica de carregamento das demais imagens permanece igual. A prioridade é uma indicação ao navegador, sem garantia de ganho de LCP em toda conexão.

O fingerprint já existente do worker passa a incluir os três templates de imagens. Na versão final, o worker muda o marcador de revisão e a URL/ordem do CSS no precache; suas políticas de cache, `skipWaiting` e `clientsClaim` permanecem iguais. Essa revisão permite atualizar também `/index.html` precacheado. A entrega não incorpora o código dos observadores da 2b.

## Validação da primeira versão (91060ccf)

- Node 20.20.2: **130 testes aprovados**, zero falhas/skips. Seis testes novos cobrem seleção do hero, seção desabilitada/anterior, agendamento, banner inferior, template de produto e invalidação determinística/falha explícita do worker.
- Builds de produção de seis páginas e preparação SSR, baseline/candidato/rollback, passaram. O pack preservou os templates alterados. Os **66 arquivos JS da aplicação e o CSS ficaram idênticos**; no worker muda somente o marcador de revisão.
- Desktop 1440/celular 390, nas duas versões: menu, teclado, troca de viewport, busca instantânea e campo mobile, categoria e substituição Vue da busca, galeria (segunda foto/volta à primeira), zoom/fechamento, variação/quantidade, carrinho e entrada do checkout passaram sem erros JS. Sem login autenticado, pedido ou pagamento real. O botão legado mobile de busca, oculto no topo atual, foi acionado via DOM: isso verifica seu handler, não um controle visível. Um primeiro teste de zoom fechava com Escape antes de concluir a inicialização; foi corrigido para esperar/clicar no controle visível e confirmar a ocultação da sobreposição. O diagnóstico inicial foi preservado.
- **Nove pares visuais**: home em 390/575/576/991/992/1440/1920 px; produto em 390/1440 px. Geometria, fonte da imagem e pixels do hero idênticos. Uma única variante mobile/desktop por abertura; sem duplicação do recurso principal. O celular conserva o banner de 134,25 px em 390 px; o desktop conserva as alturas atuais, incluindo teto de 400 px.
- PWA real: antigo → candidato → rollback; home precacheada muda `auto → high → auto`, inclusive após reload. Home nova disponível offline com os atributos de prioridade. Aba antiga abre rota lazy da conta; app e sessão nova funcionam depois do rollback. Fontes e helper anteriores continuam 200. Nenhum erro JS/chunk nesse ensaio.
- Rollback executado por revert do commit de aplicação em clone separado, com **124 testes aprovados**, novo build e preparação SSR. CSS, JS principal, worker e app HTML voltaram byte a byte ao baseline. Fontes e helper anteriores preservados. Não houve reversão em produção.

## Comparação local

### Primeira versão — retida, sem aprovação de publicação

Quatro pares AB/BA por cenário, 32 aberturas medidas e oito aquecimentos excluídos previamente. Chromium 154, processo/perfil/contexto novos por abertura, cache HTTP desligado, CPU 4×, CDP 5 Mbps download/1 Mbps upload/80 ms; viewport 390×844 mobile/touch ou 1440×844, DPR 1; observação até cinco segundos após load. Marketing bloqueado e TLS ativo; estado do worker registrado. Não havia build nem outros testes de navegador concorrentes.

| Cenário | Mediana LCP atual → prioridade | Mediana das diferenças pareadas | Pares mais rápidos | Mediana CLS atual → prioridade |
| --- | --- | --- | --- | --- |
| Home 390 | 1.636 → 1.594 ms | −28 ms | 3/4 | 0,07422 → 0,07672 |
| Produto 390 | 2.234 → 2.176 ms | +72 ms | 2/4 | 0,06551 → 0,05625 |
| Home 1440 | 1.678 → 1.662 ms | −18 ms | 2/4 | 0,00001 → 0,00009 |
| Produto 1440 | 2.324 → 2.198 ms | −122 ms | 3/4 | 0,01055 → 0,01055 |

Mediana agregada menor não significa melhora de todos os pares: produto/celular teve mediana pareada **72 ms pior**, incluindo um candidato de 3.460 ms com TTFB 2.359 ms (baseline desse par: LCP 2.332 ms/TTFB 1.169 ms). Produto/desktop teve TTFB mediano 1.105 → 955 ms, mas LCP após TTFB mediano 1.195 → 1.242 ms. Essa variação impede atribuir todas as diferenças à prioridade. Todos os candidatos fizeram uma requisição da imagem principal, inicialmente `High`, contra `Medium` no baseline.

Duas aberturas do candidato home/desktop, uma de aquecimento e uma medida, tiveram CLS **0,06345**, contra máximo medido de 0,000153 no baseline. Isso bloqueou a publicação mesmo estando abaixo de 0,1. Não se descartaram esses resultados nem se usaram recargas adicionais para substituí-los.

### Causa e mitigação da instabilidade

O CSS atual define inicialmente o banner desktop com `clamp(420px, 35vw, 580px)` — 504 px em 1440 px — e o ajusta para 300,953 px apenas ao encontrar a seção posterior `.pe-boxes` pelo seletor `:has()`. A imagem priorizada pode ser pintada antes dessa leitura. Na amostra problemática, a área do LCP era 725.040 px², compatível com o banner inicial de 503,5 px visíveis, e o salto aconteceu antes de DOMContentLoaded.

O diagnóstico detalhado de quatro recargas não reproduziu o salto. Um diagnóstico causal separado pausou por 2,2 s o fluxo de HTML antes de `.pe-boxes`: **ambas** as versões começaram com 504 px e passaram para 300,953 px, movendo quadros/categorias com fontes já carregadas. O resultado identifica uma fragilidade anterior que a nova prioridade pode expor; não exclui responsabilidade da mudança pelo efeito visível. Esses diagnósticos não entram nas medianas.

O advisor aprovou a mitigação antes da implementação: SSR acrescenta `pe-h2--boxes-after` somente com topo v2 e `personalized-boxes` posterior habilitado na mesma lista de seções. A regra geométrica existente usa `:is(:has(~ .pe-boxes), .pe-h2--boxes-after)` dentro de `@supports selector(:has(*))`, com a mesma especificidade e declarações. Isso antecipa a reserva sem mudar sua altura final. Quadros ausentes, anteriores/desabilitados, banner fora da lista e topo v2 desligado não recebem a classe; o fallback de navegadores sem `:has()` permanece. O seletor dinâmico continua atendendo estruturas não reconhecidas pelo SSR.

### Versão corrigida — validação final

- **131 testes aprovados**, zero falhas/skips. O teste adicional cobre reserva SSR com seção intermediária e ausência/ordem/desabilitação/topo v2 desligado/opt fora da lista.
- Novo build das seis páginas e preparação SSR passaram. Pack conserva o código revisado. Os 66 JS permanecem idênticos. CSS aumenta **454 bytes sem compressão**; comparação via AST, normalizando somente guard/seletor aprovado e comentário de sourcemap, confirma todas as declarações e demais seletores iguais. Worker muda marcador e hash/ordem do CSS no precache; política igual.
- Streaming desktop/celular confirma reserva final antes e depois da leitura de `.pe-boxes`: 300,953 px no desktop e 358×134,25 px no celular. No diagnóstico, o baseline começou com 504 px e 390×146,25 px, respectivamente. O candidato não sofre essa troca de geometria. CLS diagnóstico: desktop 0,05388 → 0,00091; celular 0,02054 → 0. São experimentos causais, não estimativa de melhoria pública.
- Quatro testes funcionais completos (duas versões × desktop/celular) passaram sem erros JS nesse ensaio. Mesmos limites do controle oculto mobile e ausência de login/pagamento real da primeira versão.
- Revert conjunto dos dois commits: fonte exatamente igual a `552f1277`, **124 testes aprovados**, novo build/SSR. CSS, JS principal, worker e app HTML idênticos ao baseline. A dependência de testes SSR faltava no primeiro clone; uma asserção de igualdade detectou snapshot incorreto antes do aceite. Corrigidos o vínculo de dependências, fonte revertida e snapshot; o primeiro timeout PWA de rollback foi preservado e repetido somente após essa conferência.

- Nove pares de geometria/fonte/variante passaram novamente. As capturas automáticas de elemento/clip produziram alguns recortes incompatíveis com a viewport correta na mesma abertura; tentativas preservadas. Comparação de regiões das capturas de viewport corroborou os pixels em sete cenários; produto/celular manteve recortes idênticos. Em 575 px, um par de viewport tinha diferença de poucos pixels apesar da geometria lida igual; três novas capturas diretas por versão, com leitura de retângulo/scroll/altura antes de cada quadro, mostraram sempre 543×203,625 px, scroll zero e pixels iguais nos três pares. Métodos/limites: `final/visual-assessment.json` e `check-575.json`. Não se afirma que todos os PNGs das primeiras tentativas eram iguais.
- PWA: **duas transições completas instrumentadas passaram**, incluindo novo CSS/HTML offline, classe de reserva no HTML atualizado, rota lazy em aba antiga e retirada da classe/prioridade depois do rollback. Fontes/helper anteriores retornam 200. Sem erros JS/chunks nesses dois ensaios. Timeout inicial de rollback ocorreu durante preparo de snapshot; outro timeout de 30 s na atualização não teve telemetria suficiente para determinar a causa. Ambos preservados. Os ensaios instrumentados registram estados de instalação/ativação e recursos 200; a repetição usa limite de 60 s, sem alterar o worker da aplicação. Passes não apagam os timeouts nem demonstram disponibilidade de todo serviço externo.

#### Comparação final com dependências CDN controladas

As duas tentativas de coleta seguintes foram interrompidas por ausência de jQuery/Popper, nas duas versões, com `$ is not defined`/`Popper is not defined`. O proxy retornou HTTP 503 com falha de conexão em `envoy://cloudflare_https_tunnel/`; uma sonda posterior conseguiu 200, seguida de nova falha. Todos os runs interrompidos foram preservados e **não** foram reutilizados na coorte abaixo. Não são ensaios de performance aprovados.

O advisor aprovou outro desenho de laboratório: somente os dois URLs exatos de jQuery Slim 3.5.1 e Popper 1.16.1 apontam para um espelho QA local imutável, a mesma cópia para baseline/candidato. Os arquivos já haviam sido obtidos por GET HTTPS verificado 200 e correspondem exatamente ao SRI do HTML. URLs de origem, hashes completos, tamanho e verificação SRI estão em `final/cdn-fixtures/provenance.json`. MIME original não foi capturado; o QA serve `application/javascript`, gzip negociado e CORS anônimo, sem mudar HTML/SRI. Não são alterações de produção nem novos assets da aplicação.

Processo/perfil novos, cache desligado, CPU 4×, 5 Mbps/1 Mbps/80 ms, ordem AB/BA e janelas de observação permanecem conforme descrito acima. Coorte inteiramente nova de 32 aberturas + oito aquecimentos. **O caminho de rede desses scripts muda**: a comparação mede comportamento com dependências controladas, não disponibilidade/velocidade do CDN real. Não comparar quantitativamente esta coorte com as anteriores ou com produção.

**Resultado: incompleta; publicação bloqueada.** A coorte controlada parou no primeiro aquecimento do produto/celular, com HTTP 404 do SSR de referência. Foram concluídas somente dez aberturas da home/celular (oito medidas + dois aquecimentos), com jQuery/Popper presentes e a imagem principal válida. Esses dados parciais não validam os quatro cenários nem sustentam ganho final de velocidade.

Nessas dez aberturas não houve exceção JS, mas ocorreram 20 falhas externas em `reviews.pietroembalagens.com.br` e dez em `passport.e-com.plus`; a disponibilidade de avaliações/ranking/OAuth não foi validada por essa coorte. Conferência HTTP posterior observou 404 em ambos os SSR locais e 503 ao acessar o produto público **através do proxy deste ambiente**, com a mesma falha de transporte. A causa específica dos 404 não foi isolada; não atribuir a eles uma regressão da aplicação nem afirmar causalidade API/proxy fechada. O servidor baseline local encerrou depois dessas conferências; nenhuma nova coleta foi feita sem ele.

Não foram ampliados os espelhos para APIs/fotos, removidos resultados desfavoráveis ou publicados números parciais como conclusão. Próximo gate: restabelecer acesso externo, confirmar os dois snapshots/servidores, executar coorte completa dos quatro cenários e revisar erros, TTFB e resultados com advisor. A aprovação concreta de Rafael vem depois dessa revisão. **Sem recomendação de merge/deploy enquanto esse gate estiver pendente.**

### Parecer final do advisor — 14/10/2026

Apto para push da branch de trabalho e PR **draft**, com hold explícito de merge/publicação. Sem impeditivo estático no conjunto `91060ccf` + `fde272c1`; mitigação, testes, build/SSR, visual/fluxos, duas transições PWA e rollback têm evidências para revisão. A comparação final não terminou e não sustenta conclusão de desempenho. Nova revisão do advisor e aprovação concreta de Rafael são necessárias para liberar produção. A corrida JS permanece fora do escopo.

As medições usam snapshots locais de produção com recursos externos pelo proxy; não são dados de usuários reais nem uma comparação pública antes/depois. O ensaio não demonstra aumento de conversão ou ranking. As fontes continuam as da entrega anterior.

### Interrupção e erros registrados

O coletor original parou no baseline do produto/celular, par 3, com `Cannot read properties of undefined (reading 'body')`. A asserção interrompeu a execução antes de persistir os tempos desse run. O script antigo de atualização de dados estruturados acessa `window._context.body` após 50 ms, sem verificar o contexto; esse callback é byte a byte igual no baseline/candidato e reproduz a mesma mensagem em isolamento quando o contexto ainda não existe. **A stack do evento original do baseline não foi capturada, portanto sua atribuição precisa permanece incerta.** Na comparação completa da primeira versão, houve a mesma exceção no candidato produto/desktop, par 3; sua stack aponta exatamente para esse callback preexistente. O run foi mantido. A prioridade pode mudar o agendamento; não se afirma causalidade excluída nem ausência global de erros JS.

Quatro recargas diagnósticas nas mesmas condições e outras duas em 500 kbps não reproduziram o erro; nas duas mais lentas foi possível adicionar o produto ao carrinho. Não se alterou nem se suprimiu esse código nesta entrega.

Foram preservados os pares completos anteriores e todo o diagnóstico. O candidato órfão do par interrompido permanece registrado separadamente; ambos os lados desse par foram recolhidos para a comparação. Os pares completos, incluindo resultados desfavoráveis ao candidato, continuaram na estatística. O coletor retomado registra todos os erros e stacks para avaliação, sem remover execuções por erro. Os diagnósticos adicionais não entram nas medianas. Também houve 30 falhas de fetch por versão para `reviews.pietroembalagens.com.br` (60 no total): balanceadas, mas limitam a cobertura dos recursos externos. Não apresentar a interrupção ou esses recursos como testes aprovados. Uma correção do callback exige escopo separável e nova revisão do advisor.

Artefatos: `/workspace/.cloud-setup/images-investigation/` (`record.json`, `comparison.json`, logs da interrupção/retomada, `context-race-*.json`, `responsive.json`, `browser-regression.json`, `pwa-transition.json`, `build-comparison.json`, `rollback.json` e PNGs). Não são pacote pronto para redeploy.

Evidência final, separada da primeira versão: `final/build-comparison.json`, `visual-assessment.json`, `check-575.json`, `browser-regression.json`, `cls-stream-diagnosis.json`, `pwa-debug-first-passed.json`, `pwa-transition.json`, logs/timeouts PWA, `rollback.json`, `rollback-tests.log`, `size-comparison.json`, `cdn-fixtures/provenance.json`, `comparison-aborted-cdn-*.json`, `cdn-probe.json` e `comparison.json` (coorte controlada incompleta). O CSS custa +37 B gzip/+12 B Brotli e a home +22 B gzip/+53 B Brotli em compressão local; não há redução dos bytes das imagens.

## Publicação e conferência

1. Manter draft/hold. Concluir a comparação final dos quatro cenários e resolver o gate de disponibilidade/404. Advisor deve revisar resultados reais e liberar a versão concreta; Rafael aprova antes do merge.
2. Conferir master atual e reconciliar mudanças posteriores. Confirmar SHA/arquivos aprovados, ausência da 2b e checkout do CI no SHA efetivo.
3. Integrar somente esta entrega no fluxo habitual; acompanhar testes, build, guardas, baseline anterior e deploy completo de Hosting + SSR. Registrar merge, Actions, Hosting e versão SSR. Não cancelar deploy em andamento.
4. Na loja pública, conferir prioridade inicial `High` da imagem efetiva, uma única variante por viewport, foto real/pixels/recorte, galeria/zoom/variações, menu/busca, carrinho/entrada do checkout, sessão limpa e PWA/aba antiga. Verificar retorno das rotas SSR e home precacheada atualizada.
5. Reavaliar LCP/CLS em condições comparáveis, mantendo separadas medições locais/públicas e dados de usuários. Não declarar as medianas locais como ganho público confirmado.

## Rollback

Gatilhos: regressão repetível de LCP/CLS atribuível à prioridade, download duplicado/variante incorreta, alteração de aparência ou falha comercial causada pela entrega. Interromper novas entregas e conferir deploys em andamento/master atual.

Com checkout limpo e commit de aplicação no histórico (se houve squash, identificar/revisar o SHA efetivo), preparar em branch:

```sh
git switch -c rollback/imagem-principal
git revert --no-commit fde272c17e8a4703afc17edaa61fd23b88306783
git revert --no-commit 91060ccfdb8a8f8b8f99bd762bb190061799e226
git diff --cached --check
git diff --cached --stat
```

A reversão conjunta remove a reserva SSR/condição CSS, os atributos/seleção de prioridade, os novos inputs do fingerprint e os testes desta entrega. Não publicar a prioridade da home sem a mitigação de layout. Os dois commits devem ser revisados como uma entrega; se o merge usar squash, reverter o commit resultante com esse mesmo escopo. Preservar mudanças posteriores ao resolver conflitos. Não altera arquivos ou referências das imagens, nem remove fontes/helper das entregas anteriores. O registro documental anterior não precisa ser desfeito.

Executar testes afetados, build/SSR e smoke de catálogo, galeria/carrinho e PWA. Revisar o diff concreto com advisor/Rafael pelo fluxo autorizado, publicar a reversão pelo workflow e conferir Hosting **e** SSR, sessão nova e aba/PWA. Registrar o tempo real de recuperação. O ensaio foi local, sem rollback de produção. **Exige novo build e deploy, não é instantâneo.** Restaurar apenas Hosting não reverte os templates SSR. Não usar reset, force push ou tag geral.
