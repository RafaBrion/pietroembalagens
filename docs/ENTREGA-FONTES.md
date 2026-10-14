# Entrega 3 — Quicksand local

**Publicada e validada em 14/10/2026, às 12h52 BRT**, pelo PR #90. A entrega 2b permanece fora de produção.

Advisor: intenção e ajuste `false` aprovados antes da implementação. Parecer final favorável sobre aplicação `89818d05` e documentação `c0ecabdb`, sem impeditivos para PR/revisão de Rafael. Não aprova merge/deploy; exige aprovação concreta de Rafael, CI completo e verificações públicas previstas abaixo.

- Base: `6a26e8d26c8ddfadaf238a9f434b49238351b9e1` (master com 2a e dois triggers do bot).
- Aplicação: `89818d051b3217fa4ad96c478b67f5c008d0ead7`, branch `perf/fontes-quicksand-local`.
- Última publicação funcional registrada da 2a: merge `deed7fd2ad43c2f9a80423e555fdedd619f0f4f9`, Actions `38546529280`, Hosting `c9387863ac4b4db2`, SSR `634`. Reconfirmar os identificadores atuais antes de publicar; os triggers posteriores não autorizam presumir outra versão.

## Registro da publicação

- Rafael integrou o PR #90; merge `e78a30ccbf03e3b15f25ffdd5e29cd075678306f`, com árvore idêntica à versão revisada. [Actions 38592708589](https://github.com/ecomplus-stores/pietroembalagens/actions/runs/38592708589) concluído com sucesso: 124 testes, build, guardas de fonte/artefatos, baseline e deploy.
- Hosting `165c5410780640d8`, release `1791993158183000`, SSR `635 ACTIVE`/Node 20. Baseline capturada antes da publicação: Hosting `c9387863ac4b4db2`, SSR `634`.
- Verificação pública: home/categoria/produto/app/search já têm preload; CSS/WOFF2/worker/helper/licença/proveniência correspondem aos artefatos do CI. Os 66 arquivos JS públicos da aplicação são idênticos aos da publicação 2a.
- Menu/busca desktop e celular, variação/quantidade, carrinho e entrada do checkout passaram, sem erros JS e sem pedido/pagamento. Quicksand real confirmada por CDP em quatro rotas, uma transferência Latin por navegação e nenhuma Quicksand externa.
- PWA atual ativa, fonte Latin disponível offline e rota lazy de conta funcionando. HTML público capturado depois da 2a também funcionou com os assets atuais. **A transição de um worker público antigo não foi observada**, porque o deploy terminou antes de abrir o navegador; o ensaio completo antigo/novo/rollback foi local.
- Rollback reconferido sobre o merge efetivamente publicado: revert do commit de aplicação, retendo o diretório completo de fontes, sem conflitos e com somente os quatro arquivos de carregamento afetados. Nenhuma reversão de produção executada.
- Advisor deu aceite pós-publicação favorável, sem impeditivos. Perfil temporário de testes apagado, TLS mantido ativo e confiança permanente inalterada. Ainda não há comparação pública antes/depois que comprove ganho de LCP; os números abaixo continuam sendo de laboratório.

Registro detalhado e artefatos: `/workspace/.cloud-setup/fonts-investigation/published-20261014/` e `record.json` no diretório pai. Este registro documental posterior não faz parte do merge de aplicação publicado; não exige outro deploy para a melhoria funcionar.

## Mudança e limites

O CSS importava Quicksand de Google Fonts, que só então indicava os WOFF2. Agora o head pré-carrega apenas Latin e o CSS referencia três arquivos locais com hash no nome. Os binários são os mesmos distribuídos pelo Google Fonts v37, versão interna 3.006. Mantidos família, fallback, `font-display: swap`, nove faces, pesos individuais 300/400/700 e unicode ranges. Assim os usos de 500/600 conservam a correspondência anterior; não foi declarado um novo intervalo contínuo de pesos.

`$web-font-path: false` impede o import externo. `null` seria redefinido pelo `!default` do tema. A configuração do CMS continua Quicksand. O SCSS usa os pontos de extensão suportados; arquivos gerados e dependências não foram editados.

Origem, autoria, URLs, tamanhos e SHA-256 completos: `template/public/assets/fonts/quicksand-sources.json`. Licença SIL OFL em `OFL-Quicksand.txt`, com somente um espaço final removido e ambos os hashes registrados. Preservados também o copyright 2019 e Reserved Font Name dos próprios binários. Latin tem 28.244 B; Latin-ext 26.616 B; Vietnamese 8.840 B. Os dois últimos são carregados sob demanda.

Nenhuma política de cache foi ampliada: `/assets/**` conserva o cache atual de um dia no navegador/600 s compartilhado. O trabalho de cache longo é outra entrega. Recursos de widgets, incluindo Google Symbols/Google Sans do selo de avaliações, continuam externos; esta mudança trata a Quicksand da loja.

## Validação realizada

- Node 20.20.2: **124 testes aprovados**, zero falhas/skips. Build de produção de home, app, search, 404, blog e admin; preparação do SSR e artefatos verificados. Categoria/produto renderizados pelo handler real no teste local.
- 54 arquivos JS da aplicação idênticos entre os dois builds. `sw.js` muda como esperado pela revisão do head/CSS. Fora a remoção do import e inclusão das faces, o CSS é idêntico, desconsiderando a referência ao source map. CSS: 189.327 → 192.220 B; gzip local: 47.192 → 47.479 B (+287 B).
- Desktop 1440 e celular 390: menu, teclado/rolagem, alternância de viewport, busca instantânea/mobile, substituição real do componente Vue da busca, categoria, variação/quantidade, adição ao carrinho e entrada do checkout passaram, sem erros JS. Sem login autenticado, pedido ou pagamento real.
- CDP confirmou Quicksand customizada desenhando texto real na home, categoria, produto e carrinho. O preload Latin gerou **uma transferência** por navegação nas quatro rotas auditadas, reaproveitada pelo CSS; sem requisição externa de Quicksand. Caracterização separada com SW bypassado e cache desligado para expor a rede; não integra as estatísticas de velocidade.
- Tipografia nos pesos 300/400/500/600/700: canvas e medidas de texto idênticos, incluindo preços, português, Latin-ext e Vietnamese. Elementos visíveis amostrados conservaram dimensões. Screenshots da home e produto, desktop/mobile, idênticos; categoria desktop idêntica e mobile com um pixel diferente no limite inferior. Carrinho mobile idêntico.
- A primeira captura do carrinho desktop diferiu na posição do rodapé. Investigação mostrou o iframe assíncrono do selo Google: o próprio baseline mudou a altura do rodapé de 220,8125 para 288,703125 px após sua entrada. Após estabilização, baseline/candidato ficaram iguais pixel a pixel; IDs gerados dos iframes diferem. Não houve alteração no código desse widget.
- PWA real: worker anterior → candidato → rollback, aba já aberta, navegação lazy de conta e sessão nova passaram. Fonte Latin já carregada respondeu offline com 200/28.244 B. Após rollback, origem continuou servindo os três WOFF2 idênticos, além do helper da 2a. Zero erros JS/chunks.
- Reversão do commit de aplicação, retendo o diretório completo de fontes, foi executada em clone de teste. Novo build/SSR restaurou CSS, SW e app HTML byte a byte. Home diferiu somente em IDs transitórios das imagens e estoque público de um SKU (1942 → 1941 durante os builds), sem diferença restante após normalizar esses campos. Comando do SHA final também conferido; fontes, licença e proveniência retidas.

## Comparação local de velocidade

Seis pares alternando AB/BA, mais dois warmups excluídos previamente. Um processo Chromium 154 e perfil novo, contendo apenas a confiança temporária autorizada, por execução; contexto novo, cache de página desligado, CPU 4×, viewport 390×844/DPR1/touch. Observação até cinco segundos depois de load e de `document.fonts.ready`. Sem build ou outro navegador de QA concorrente. Builds locais; recursos externos via proxy, sem limitação artificial de rede; marketing bloqueado. SW ativo registrado no resultado de cada execução.

| Medida | Baseline | Candidato |
|---|---:|---:|
| LCP, mediana | 514 ms | 358 ms |
| Janela observada de LCP | 372–2136 ms | 260–408 ms |
| Último evento do conjunto de fontes, mediana | 1050 ms | 764 ms |
| CLS, mediana | 0,07218 | 0,07340 |
| CLS máximo | 0,07543 | 0,07676 |

LCP menor nos seis pares; diferença pareada mediana −186 ms. O conjunto de fontes terminou antes nos seis pares (diferença pareada mediana −273 ms). Essa medida usa o último `loadingdone` observado com Quicksand carregada: não identifica o instante exato da primeira pintura de cada texto. O CLS ficou próximo, com pequeno aumento numérico na mediana; não se afirma redução de CLS.

Todos os 12 runs medidos tiveram falha da consulta de ranking do PIMI no contexto local. O candidato do par 5 também teve falha da consulta externa de meios de pagamento; esse run foi mantido e identificado. Mesmo sem esse par, todos os demais pares tiveram LCP menor no candidato. Zero erros JS. O baseline teve dispersão significativa e a rede/proxy influencia o resultado; não converter esses números em promessa de ganho percentual público. A coleta de recursos da página não captura toda a rede das fontes do baseline com SW; não usar o campo incompleto de descoberta como mediana. A caracterização separada de rede comprovou a cadeia e o reaproveitamento.

Primeiro ensaio de seis pares foi descartado integralmente antes deste resultado: houve build concorrente e reutilização do mesmo processo do navegador. Está preservado como diagnóstico, sem integrar a estatística final. A comparação tipográfica também teve um comparador inicial sensível à posição de botões OAuth ocultos; a investigação e a comparação dos valores dos elementos visíveis estão preservadas.

Artefatos locais: `/workspace/.cloud-setup/fonts-investigation/` (`comparison.json`, logs, `font-routes.json`, `visual.json`, `visual-comparison.json`, `app-details.json`, `browser-regression.json`, `build-comparison.json`, `rollback.json`, `pwa-transition.json` e PNGs). Não são um pacote de redeploy. TLS permaneceu ativo; perfis temporários apagados e os três servidores próprios de QA encerrados após os testes (`cleanup.json`); servidor de desenvolvimento preexistente preservado.

## Publicação

1. Obter parecer final do advisor sobre diff/evidências/rollback e aprovação concreta de Rafael. Até isso ocorrer, manter branch fora de master.
2. Reconfirmar master e a publicação funcional anterior; reconciliar mudanças posteriores sem sobrescrever alterações. Confirmar que a 2b não entrou no diff.
3. Integrar somente a entrega aprovada pelo fluxo habitual. Registrar SHA efetivo, merge e execução Actions. O workflow serializa deploys; não cancelar uma publicação em andamento.
4. Acompanhar build/deploy completo de Hosting **e** SSR e registrar seus identificadores. Uma publicação apenas estática não valida o novo head SSR.
5. Na loja pública: verificar CSS sem import externo de Quicksand, WOFF2 200/com hash, um download Latin por sessão limpa, fonte real, aparência e fluxos. Testar aba antiga/PWA/atualização e disponibilidade das URLs retidas. Comparar também a performance pública, sem confundir laboratório com dados de usuários reais.

## Rollback preparado

Gatilhos: fonte ausente/incorreta, caracteres faltando, layout/CLS regredindo de modo repetível, duplicação de download ou falha nos fluxos comerciais atribuível à entrega. Parar novas entregas, conferir deploys em curso e master atual. O alvo funcional é a versão sem a alteração de carregamento de fontes, preservando 2a e mudanças posteriores.

Com checkout limpo e commit de aplicação presente no histórico (merge normal; se houve squash, identificar e revisar o SHA efetivo antes), preparar em branch:

```sh
PRE_REVERT_SHA=$(git rev-parse HEAD)
git switch -c rollback/fontes-quicksand-local
git revert --no-commit 89818d051b3217fa4ad96c478b67f5c008d0ead7
git restore --source="$PRE_REVERT_SHA" --staged --worktree -- template/public/assets/fonts
git diff --cached --check
git diff --cached --stat
```

Revisar conflitos preservando trabalho posterior. O diff efetivo esperado desfaz somente head/preload, import do parcial e override da variável, removendo o parcial de faces. **Reter o diretório completo de fontes**, incluindo WOFF2, licença, copyright e proveniência, para CSS/abas em cache. Não apagar o helper da 2a nem alterar o conteúdo da 2b.

Executar os testes afetados, build de seis páginas, preparação do SSR e smoke de catálogo/app/PWA. Submeter diff concreto ao advisor/Rafael pelo fluxo autorizado e publicar commit de reversão no workflow habitual. Revalidar Hosting, SSR, fonte anterior, carrinho/checkout e URLs retidas na origem. Registrar tempo real de recuperação. Ensaio local realizado; nenhum rollback/deploy de produção executado. **Exige novo build e deploy; não é instantâneo**, e restaurar somente Hosting não reverte o SSR. Não usar reset/force push/tag geral como reversão. Remoção futura de assets retidos exige tarefa e validação próprias.
