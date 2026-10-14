# Entrega 2b — montagem de menus e reserva da busca

Base: `deed7fd2ad43c2f9a80423e555fdedd619f0f4f9` (PR 89 / entrega 2a publicada). Branch: `perf/observadores-menu-busca`. Esta entrega está em preparação; não foi publicada. A aprovação concreta de Rafael e a verificação pública continuam necessárias.

## Comportamento

O megamenu observava permanentemente os filhos do header, e o menu mobile observava o corpo inteiro, mesmo depois de construídos. Quando ausentes, havia também tentativas a cada 500 ms. A nova versão tenta montar imediatamente e usa um observador de construção somente se existir um contêiner incompleto. Ele termina quando a montagem funciona ou após 20 segundos. A abertura por gesto permite recuperar conteúdo interno inserido ou substituído depois desse prazo.

- Desktop: captura de clique/mouseover em “Ver todas”; detecção de painel substituído; mantém o observador específico de `style`/`class` de `#s-all`, necessário para o controle de rolagem. O observador de visibilidade antigo é desligado quando outro painel é construído.
- Mobile: captura cobre burger, links de categorias, “Ver todas”, chamadas de `toggleSidenav` e o hook de busca mobile. Uma lista vazia não recebe o marcador de montagem concluída. O handler delegado permite novos links internos; trocar o nav/painel refaz a ligação e remove o handler/drill anterior.
- Busca: reserva o espaço imediatamente quando os resultados já existem. Caso contrário, observa o wrapper estável `#search` (fallback `#main`), terminando por sucesso ou 20 segundos. O Vue substitui o mountpoint `#search-engine`; observar diretamente esse nó perderia a montagem.

A troca do próprio `#menu` não é uma capacidade nova: o tema mantém uma referência a esse nó. Os testes de substituição abrangem seus elementos internos. O hook `#mobile-search-btn` é oculto no header v2 atual; sua compatibilidade foi testada por evento DOM. Burger e busca visíveis tiveram interação real no navegador.

`content/code.json` muda somente os scripts de body 6, 7 e 9. Head, CSS, frete, checkout, marketing e widgets permanecem iguais. Bibliotecas, ordem/defer e fallbacks principais ficam para avaliação posterior. Esta entrega não remove todos os observadores globais da loja: frete/datas, componentes e outros recursos continuam com seus próprios mecanismos.

## PWA

A revisão determinística de `sw.js` passa a incluir `html_body` junto do head, separados por uma serialização inequívoca. Sem isso, uma alteração apenas inline no body poderia deixar o worker idêntico e a PWA com o HTML anterior. O worker muda somente no marcador; regras de cache, `skipWaiting`, `clientsClaim` e bundles anteriores são preservados.

Marcador anterior: `f7fd81508176e858350995e39d5905de92ede9aa95d092793044ff30b6f5d80b`.
Marcador desta preparação: `9082dcf57ec5f017a955dd73a1c7d4d7a75890553083387f98401a4b6e70b658`.

## Evidências e custo

Comparação de builds de produção no mesmo diretório físico, Node 20.20.2 e dependências com lockfile. Os 66 JS anteriores, incluindo o helper da 2a, ficaram byte a byte iguais. Nenhuma requisição nova foi acrescentada.

No Chromium, usando o markup nativo dos menus e os scripts isolados, 300 inserções fora do header e 300 no header, em lotes, produziram **20 callbacks do observador de montagem desktop + 40 do mobile antes; zero depois**. O observador de visibilidade permaneceu ativo. É uma prova do trabalho desses observadores, não uma medida de velocidade geral ou de toda a loja.

A recuperação por interação exige código adicional. O custo em cada HTML é **+1.758 bytes** sem compressão:

| HTML | gzip antes → depois | Brotli q4 antes → depois |
| --- | ---: | ---: |
| Home | 44.315 → 44.750 B (+435 B) | 43.394 → 43.800 B (+406 B) |
| Busca | 34.443 → 34.856 B (+413 B) | 34.138 → 34.575 B (+437 B) |
| App | 26.743 → 27.150 B (+407 B) | 26.908 → 27.349 B (+441 B) |

Compressão calculada localmente, sem headers/protocolo. O advisor considerou aceitável esse custo para limitar trabalho recorrente, apresentado como troca técnica.

Três pares de execuções mobile 390×844, CPU simulada 4× mais lenta, cache limpo, CDN pública/proxy e observação até cinco segundos após `load` tiveram medianas:

| Medida de laboratório | Antes | Depois |
| --- | ---: | ---: |
| LCP | 500 ms | 688 ms |
| CLS | 0,0777 | 0,0719 |
| Tarefas longas | 6 | 6 |
| Excesso de duração das tarefas longas sobre 50 ms | 533 ms | 409 ms |

LCP variou entre 428–824 ms antes e 596–1.192 ms depois; o excesso das tarefas longas entre 439–568 e 387–862 ms. O ensaio não demonstrou melhora consistente de carregamento; o LCP mediano foi maior. Proxy, recursos remotos e poucas repetições limitam a atribuição. Essa soma de bloqueio não é Lighthouse TBT, e não foi medido INP de usuários. Não há promessa de ganho público de velocidade ou conversão.

## Validação

- **132 testes passaram**, sem falhas/skipped: suite anterior e oito novos casos sobre sintaxe inline, ausência de menus, lista incompleta/deadline, reserva de busca e emissão real do worker pelo webpack, incluindo mudança apenas no body e falha explícita quando o worker de produção falta.
- Build com os seis prerenders do CI e preparação de SSR passaram. Comparação confirmou bundles/helper iguais e alteração do worker limitada ao marcador.
- DOM real no Chromium: menus prontos, markup tardio, lista parcial, substituição do painel desktop, do accordion interno, do nav e de seus links; primeira abertura pelo hook de busca; ausência; encerramento por prazo (timer acelerado apenas nessa fixture); reserva imediata e substituição do mountpoint.
- Builds reais antes/depois, desktop 1440/mobile 390: menu, drill-down/voltar, teclado/foco, controle de rolagem, resize com abertura/fechamento, busca instantânea/Escape e busca mobile; categoria, produto, variação/quantidade, carrinho e entrada do checkout. Sem novos erros JavaScript.
- Busca real: o widget Vue trocou o DIV original por SECTION; uma única reserva permaneceu no wrapper correto em ambos os viewports.
- PWA real local: 2a → 2b → rollback, workers efetivamente ativados; página nova recebeu o body correto, abas anteriores abriram rota lazy de conta; rollback restaurou o body 2a e preservou o helper HTTP 200, sem erros de página/chunks.
- Screenshots desktop/mobile inspecionados. Marketing bloqueado nas sessões de teste. Nenhum login autenticado, pagamento ou pedido foi enviado. Frete/datas permanecem cobertos pela suite existente; não houve cotação completa com CEP nem transação real.
- TLS permaneceu ativo. Foi usado apenas perfil temporário com a CA do proxy, autorizado por Rafael; a confiança permanente não foi alterada. O perfil foi removido ao concluir os testes, com registro da limpeza.

Evidências locais: `/workspace/.cloud-setup/observers-investigation/`: `scope-proof.json`, `all-tests.log`, builds, `build-comparison.json`, `observer-fixtures.json`, `browser-regression.json`, screenshots, `pwa-transition.json` e `lab-comparison.json`. Os artefatos preparados e recursos antes/depois da publicação serão registrados pelo CI.

## Publicação e aceite público

Advisor revisa diff/evidências/rollback; Rafael aprova a entrega concreta via PR. O CI publica Hosting e Functions de forma serializada, com fonte fixada, testes e guards de artefatos. O SHA aprovado deve corresponder à árvore efetivamente construída; conferir diferenças automáticas e commits posteriores.

Último baseline publicado conhecido: Hosting `c9387863ac4b4db2`, SSR **634 ACTIVE**, commit `deed7fd2`. Recapturar os recursos antes do deploy pelo CI. Após publicação, conferir código/marcador/URLs na loja, menu/busca desktop e mobile, carrinho/checkout, cache/compressão anterior, sessão limpa e PWA existente após checagem online de atualização. Não tratar deploy como troca atômica nem declarar publicado apenas pelo merge.

## Rollback

Acionar por erro novo de menu, foco/busca/reserva, navegação/carrinho/checkout ou atualização da PWA. Suspender próximas entregas, conferir deploys em andamento e o estado separado de Hosting/SSR.

Em checkout limpo e atualizado, inspecionar mudanças posteriores, criar branch de reversão e substituir a referência abaixo pelo **commit fonte aprovado da 2b** registrado no PR e CI:

```sh
git switch -c rollback/observadores-menu-busca
DELIVERY_SHA='SHA_DO_COMMIT_FONTE_2B_APROVADO'
git show --stat "$DELIVERY_SHA"
git revert --no-commit "$DELIVERY_SHA"
git diff --cached --check
git diff --cached --stat
node --test tests/*.test.cjs
npm run build -- --prerender=index,app/index,search,404,blog,admin/index --prerender-limit=0
node .github/scripts/verify-deploy.cjs artifacts
git commit -m 'revert: restaurar montagem anterior de menus e reserva da busca'
```

A 2b não altera/remove o helper da 2a; ele deve continuar presente. Não excluir assets usados por páginas em cache nem reverter compressão, guards ou entregas anteriores. Resolver conflitos preservando alterações posteriores, sem reset/force push. Rever patch e resultados com advisor/Rafael, publicar pelo mesmo fluxo autorizado e acompanhar Hosting **e** SSR.

O retorno do hash e do body anteriores foi ensaiado com a PWA. O ensaio concreto do revert deve comprovar fonte de aplicação igual ao baseline e repetir build/SSR e testes afetados antes do push de revisão. Após reversão, conferir worker, catálogo, app, menus/busca, caches, helper e versões efetivas.

A reversão exige novo build/deploy. Restaurar só Hosting não restaura a Function SSR; não há garantia de rollback instantâneo nem tempo de recuperação medido em produção.
