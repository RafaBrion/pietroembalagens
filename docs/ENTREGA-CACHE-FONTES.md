# Entrega 5 — cache das fontes versionadas

**Publicada em 16/10/2026**, pelo SHA aprovado `4c9f71804c399e8e710560d6b9421444382bf42a`. Entregas 4 e 2B continuam suspensas e fora desta entrega.

- Branch: `perf/cache-fontes-versionadas`.
- Base atual: `704463e8cadad05178414d6ae139efa1fa23a67f`. O avanço desde `e78a30cc` altera somente o trigger/slug de `.ecomplus.cd.json`, preservado nesta entrega.
- Aplicação: `5c0759f5fba66913fe096030d1c47ba3334bc5a6`.
- Alteração efetiva: três regras exatas em `firebase.json`, depois da regra genérica `/assets/**`, e três testes de proteção. Sem alteração de dependências, fontes, CSS, HTML, JavaScript, worker ou referências de arquivos.

## Problema e comportamento esperado

As três fontes Quicksand locais já têm nomes derivados do SHA-256 do conteúdo, mas a loja pública entrega `public, max-age=86400, s-maxage=600`. A política proposta é `public, max-age=31536000, immutable` somente para:

- `/assets/fonts/quicksand-latin.2add7d60b1cd.woff2` — 28.244 bytes.
- `/assets/fonts/quicksand-latin-ext.b5a37861949c.woff2` — 26.616 bytes.
- `/assets/fonts/quicksand-vietnamese.602d23d1e2cb.woff2` — 8.840 bytes.

Isso permite manter as mesmas respostas frescas por um ano, também em caches compartilhados elegíveis. O benefício esperado é evitar revalidações/transferências em visitas posteriores. A política não reduz bytes do primeiro acesso e não demonstra ganho de LCP, conversão ou Web Vitals públicos. Respostas antigas não recebem o novo header retroativamente.

Banners/logos editáveis pelo CMS, fontes sem hash, licença, proveniência, configurações, HTML e regras atuais de JS/CSS preservam suas políticas. O `no-store` de frete permanece. Não foi criado um pipeline novo de imagens ou versionamento do painel.

Para atualizar uma fonte no futuro: gerar um novo nome com o hash dos novos bytes; atualizar CSS/preload quando aplicável, proveniência e a regra exata correspondente; manter os arquivos anteriores disponíveis. Os testes conferem hash completo, tamanho e hash no nome e impedem alterar o binário em uma URL imutável sem atualizar esses vínculos.

## Validação

- Node 20.20.2: baseline com **124 testes**, candidato com **127 testes**, zero falhas/skips nas execuções finais.
- Superstatic, dependência já presente no lockfile do Firebase: respostas HTTP dos três WOFF2 com header final e SHA-256 corretos; 13 controles de política e quatro controles sem `immutable`, incluindo imagens CMS, fontes sem hash, licença/proveniência, frete, app, manifestos e worker.
- Build de seis páginas e preparação SSR aprovados para baseline/candidato. **276 dos 278 arquivos idênticos byte a byte**, incluindo fontes, CSS, JS e worker. Na home, só diferem 48 IDs aleatórios de fotos em `data-product.pictures[]._id`; todos os demais campos, IDs comerciais e bytes externos a esses atributos são iguais. No sitemap, o multiconjunto completo de 1.054 elementos `<url>` e o envelope são iguais; muda somente a ordem. O resultado bruto de comparação não é igualdade integral.
- Chromium 154/Puppeteer 24.15: fonte Quicksand real desenhada em página de laboratório, desktop/celular. Com `Age: 172800` **simulando dois dias**, a política antiga fez uma requisição condicional na segunda visita; a candidata fez zero requisições de fonte na segunda visita. Não houve espera real de dois dias. A resposta local condicional foi 200, não uma garantia de que o Hosting público transfira novamente o corpo.
- PWA com o worker real e inalterado: fonte renderizada offline após limpar o cache HTTP, com resposta do service worker. O cache `assets` usa **StaleWhileRevalidate**; Cache Storage e cache HTTP foram avaliados separadamente. A reversão do header continuou renderizando a fonte e restaurou a política curta na revalidação em segundo plano, sem erro do worker.
- O laboratório confirmou também que uma resposta já armazenada com um ano continua fresca após o servidor voltar à regra curta. Isso é uma limitação esperada do rollback, não expiração forçada dos clientes.

O servidor local precisou reproduzir apenas a rota `/404.html → /404 → 200`, servindo o arquivo real de 404, como observado por HTTPS na loja pública. O Superstatic original respondia 404 nessa rota e impedia o precache. O ajuste é exclusivo de QA, aplicado igualmente às versões; sem fallback global ou alteração de aplicação/worker. A falha inicial e os rastros estão preservados. A página sintética também solicitou um favicon inexistente; seu 404 não gerou erro do worker.

Os testes de headers inicialmente exigiram o callback da API de middleware do Superstatic; o harness foi corrigido antes das execuções finais. O primeiro ensaio de navegador exigia indevidamente 304 e foi ajustado para aceitar revalidação condicional 200 ou 304. Esses registros iniciais não foram apagados.

Os fluxos comerciais completos, login/OAuth, pedido/pagamento e medições públicas de velocidade não foram repetidos nesta entrega restrita a headers. Não são apresentados como aprovados por este laboratório. O smoke público das rotas e da fonte continua previsto após publicação autorizada.

## Ensaio do rollback real

Foi executado `git revert --no-commit 5c0759f5fba66913fe096030d1c47ba3334bc5a6`, sem mudar produção. O diff removeu somente as três regras e seus testes; `firebase.json` voltou exatamente ao alvo `704463e8`. As fontes permaneceram disponíveis e idênticas. Passaram **124 testes**, novo build de seis páginas, preparação SSR e GET dos três WOFF2 com a política anterior e hashes originais. O candidato foi restaurado depois do ensaio.

O novo build do rollback conserva 276 arquivos idênticos no total, incluindo fontes/CSS/JS/worker. O sitemap mantém os mesmos 1.054 elementos completos. A comparação estrita da home com o build de 14/10 **falhou**, além dos IDs aleatórios, por três valores `quantity` em `data-product`:

| SKU | Build de 14/10 | Build do rollback | API pública consultada na retomada |
|---|---:|---:|---:|
| `B_Tirinha_25x7x2_10` | 430 | 426 | 426 |
| `torta_28X28_5_TV` | 33 | 32 | 32 |
| `D_12_colorida_3coracao_10` | 1949 | 1948 | 1948 |

O template copia `quantity` de `opt.item`; as vitrines consultam a busca/API durante o build. A leitura independente pelo StorefrontRouter confirmou identidade e valores atuais dos três produtos. Esses dados comerciais **não foram normalizados nem revertidos**; não há alegação de equivalência integral do HTML. A verificação aprova a reversão do cache no escopo desta entrega, com a diferença de dados registrada separadamente.

## Publicação e reversão

A publicação recebeu autorização expressa de Rafael (“pode publicar”) e novo parecer favorável do advisor para o SHA exato `4c9f7180`. O push pelo ambiente de nuvem foi negado por permissão do GitHub; Rafael realizou pelo Mac o avanço sem force de `master`, de `704463e8` para `4c9f7180`. O Actions confirmou checkout do SHA aprovado, 127 testes aprovados sem falhas/skips, guardas de fonte/build, preservação do baseline e deploy de Hosting **e** SSR.

Os resultados de verificação pública estão registrados abaixo. Nenhum pedido ou pagamento foi enviado para verificar esta mudança de headers.

Gatilhos de reversão: política aplicada a recurso indevido, erro de fonte/cache atribuível à entrega ou falha operacional causada por ela. Com checkout limpo e a mudança no histórico, preparar em branch:

```sh
git switch -c rollback/cache-fontes-versionadas
git revert --no-commit 5c0759f5fba66913fe096030d1c47ba3334bc5a6
git diff --cached --check
git diff --cached --stat
```

Se o merge usar squash, identificar o SHA efetivo e revisar o mesmo escopo. Preservar mudanças posteriores, todos os WOFF2, licença/proveniência e assets das entregas anteriores. Repetir testes/build/SSR/headers, revisar a reversão com advisor/Rafael e publicá-la pelo fluxo suportado; conferir versão efetiva, rotas e fonte. Não usar reset/force push.

**O rollback exige novo build/deploy e não é instantâneo.** Remover o header não expira respostas já guardadas por um ano em navegadores/caches. Os bytes e as URLs não mudam nesta entrega, por isso permanecem compatíveis. Uma futura correção de conteúdo precisa de outra URL; sobrescrever uma fonte imutável não é um mecanismo de recuperação.

## Evidências

Registros locais em `/workspace/.cloud-setup/cache-investigation/`: `baseline/public-headers.json`, logs/tests/build de baseline/candidato/rollback, `build-comparison.json`, `home-equivalence.json`, `browser-cache.cjs`, `browser-cache.json`, capturas desktop/celular/offline, falhas iniciais de harness/PWA, `public-pwa-paths.json`, `rollback/source.json`, `rollback/http.json`, `rollback/build-comparison.json` e `rollback/quantity-api.json`.

O catálogo de teste fica local e não é pacote de redeploy. Autenticação, proxy e TLS foram preservados; o navegador deste ensaio usou somente recursos locais com verificação HTTPS padrão, sem mudança de confiança.

## Parecer final do advisor — 15/10/2026

Favorável ao commit/push somente da branch de preparação e à criação de PR draft para revisão de Rafael. Os 127 testes, ensaios HTTP/PWA e rollback real sustentam o escopo restrito. As diferenças de dados comerciais, a idade simulada e a impossibilidade de expirar respostas já frescas foram consideradas. Não aprova merge/deploy nem declara ganho público de LCP; CI e conferência pública continuam previstos no fluxo de publicação autorizada. Entregas 4 e 2B permanecem suspensas.

## Publicação confirmada — 16/10/2026

O parecer acima registra a etapa de preparação. Antes do envio, o advisor foi consultado novamente e deu parecer favorável à publicação do SHA exato `4c9f7180`, após autorização de Rafael, mantendo validações, baseline e rollback.

- [Actions 38844354322](https://github.com/ecomplus-stores/pietroembalagens/actions/runs/38844354322): concluído com sucesso; envio iniciado às 00:12 e workflow concluído às 00:15, horário de Brasília.
- Hosting: `165c5410780640d8` → `07b3e7bf00bc22a1`; release `1792120512845000`, publicada às 00:15:12.
- SSR: versão `635` → `636`, estado `ACTIVE`; mesma aplicação aprovada, com a preparação de conteúdo do build atual. Hosting e SSR são operações separadas.
- Os arquivos de evidência do CI têm SHA-256 conferidos contra `deployment.json`. Comparando com o arquivo do CI anterior efetivamente publicado (`e78a30cc`), ambos contêm 280 arquivos: nenhum adicionado/removido; somente `firebase.json`, home e sitemap diferem. Fontes, CSS, JavaScript, worker e metadados de bundles são idênticos. O arquivo inclui dois metadados fora de `dist`; não se trata de dois assets públicos novos. HTML/sitemap podem refletir o catálogo consultado durante o build; não se declara equivalência integral desses documentos.
- 14 verificações HTTPS públicas passaram: três fontes retornam 200, `public, max-age=31536000, immutable` e os mesmos bytes do build aprovado. Frete continua `no-store`; banner do CMS, licença, proveniência, fonte de ícones e app mantêm as políticas anteriores. Home, categoria, produto e app retornam 200; CSS e worker conferem com os artefatos publicados. A entrega 2B continua ausente.
- Chromium 154, HTTPS verificado: home/categoria/produto/carrinho em 390 e 1440 px passaram, com Quicksand efetivamente desenhada, uma solicitação da fonte Latin com o novo header em cada sessão nova e nenhum erro JavaScript. Em sessão persistente, o worker ativou; após limpar o cache HTTP e ficar offline, o GET da fonte respondeu 200/28.244 bytes com o novo header. A fonte permaneceu desenhada offline e depois de voltar à rede/recarregar, sem erro. Não foi observada uma transição real de um worker da publicação anterior; os ensaios locais anteriores cobrem a mudança de política e o rollback com o mesmo worker.
- As tentativas iniciais do smoke público falharam por seletores do próprio script: `.pe-h2__label` ausente na categoria e `.cart__title` ausente no carrinho vazio. O DOM real tem `h1` nesses pontos; foi inspecionado e o harness corrigido sem alteração da loja. Falhas originais preservadas; as três rotas mobile já aprovadas foram retidas na retomada. Não foram ignorados erros JavaScript. Scripts de marketing foram bloqueados só no navegador de QA; não há validação de tracking/conversão ou repetição integral do checkout nesta entrega.
- O certificado do proxy foi confiado somente no perfil temporário autorizado de QA, com TLS ativo; esse perfil foi apagado ao concluir. A confiança permanente do usuário/sistema não foi alterada.

Evidências complementares em `/workspace/.cloud-setup/cache-investigation/publication/`: `actions.json`, `actions.log`, `artifacts/`, `public-http.json`, `ci-build-comparison.json`, `previous-ci-comparison.json`, `public-browser.json`, capturas desktop/celular, `browser-trust.json` e registros das falhas iniciais de seletor. Os arquivos do CI são evidência e **não** um pacote completo de redeploy: o cache de dados foi deliberadamente excluído, como informa `deployment.json`.

O rollback ensaiado continua sendo o revert delimitado de `5c0759f5`, preservando fontes e mudanças posteriores. O baseline real anterior agora está confirmado nos identificadores acima. Nenhum rollback foi executado em produção.

**Parecer pós-deploy do advisor:** favorável ao encerramento e ao registro documental local, sem push/deploy adicional. Conferidos CI, identificadores reais, 14 checks HTTP, oito verificações de fonte real, PWA offline/retorno à rede e exclusão do perfil temporário. Sem indicação de reverter a entrega 5; entregas 4 e 2B seguem suspensas. Não se declara troca de versão do worker, ganho público de LCP ou validação integral dos fluxos comerciais.

**Pendência operacional separada:** o log real do Firebase informa descomissionamento de Node.js 20 nas Functions em **31/10/2026**, afetando novos deploys e a possibilidade de publicar um revert depois dessa data. Preparar migração de runtime com testes e advisor em outra entrega; esta publicação não alterou runtime/dependências. O aviso não impediu o deploy atual.
