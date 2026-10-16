# 📋 Notas de Desenvolvimento — Pietro Embalagens

Histórico de alterações e decisões técnicas do site [pietroembalagens.com.br](https://www.pietroembalagens.com.br).

---

## 🔐 Acesso e Infraestrutura

| Item | Detalhe |
|------|---------|
| **Painel E-com.plus** | https://app.e-com.plus/#/home |
| **Store ID** | 51395 |
| **GitHub Repo** | https://github.com/ecomplus-stores/pietroembalagens |
| **Branch principal** | `master` |
| **Deploy** | Automático via GitHub Actions a cada push no `master` |
| **Repo local (VM)** | `/home/work/.openclaw/workspace/pietroembalagens` |

---

## 🛡️ Backups

| Data | Tipo | Referência |
|------|------|-----------|
| 29/03/2026 | Branch | `backup-29mar2026` |
| 29/03/2026 | Tag | `v-antes-ajustes-seo` |

Para restaurar: `git checkout backup-29mar2026` ou `git checkout v-antes-ajustes-seo`

---

## ✅ Histórico de Alterações

### 16/10/2026 — Velocidade 5: cache das fontes versionadas (publicada)

- Regras exatas para os três WOFF2 Quicksand com hash: de um dia/600 s compartilhado para um ano/immutable. Imagens CMS, HTML, configurações e cache de JS/CSS preservados. Base `704463e8`, aplicação `5c0759f5`; entregas 4 e 2B continuam suspensas e fora desta branch.
- 127 testes e build/SSR aprovados. Fonte real e cache HTTP/PWA/offline/rollback validados em laboratório; menor revalidação após idade simulada, sem ganho público de LCP declarado. Fontes/CSS/JS/worker preservados; diferenças geradas de home/sitemap delimitadas.
- Revert real testado com 124 testes, novo build/SSR e headers anteriores. Três quantidades comerciais mudaram entre os builds e foram confirmadas na API pública; não foram normalizadas. Rollback exige novo deploy e não expira respostas já armazenadas por um ano.
- Rafael autorizou publicar; advisor reconsultado deu parecer favorável ao SHA exato `4c9f7180`. Após negativa de escrita no ambiente de nuvem, Rafael enviou pelo Mac o avanço sem force de `master`. Actions `38844354322` concluído com 127 testes; Hosting `07b3e7bf00bc22a1`, SSR `636 ACTIVE`. Baseline anterior: Hosting `165c5410780640d8`, SSR `635`.
- 14 checks HTTPS públicos e oito verificações de fonte real no navegador passaram (home/categoria/produto/carrinho em celular/computador), sem erros JavaScript. Fontes com bytes conferidos e cache de um ano/immutable; frete e banners do CMS com políticas preservadas. Fonte offline na PWA após limpar cache HTTP e retorno à rede aprovados. Não foi medido ganho público de LCP. Limites, falhas iniciais do harness, evidências e rollback: `docs/ENTREGA-CACHE-FONTES.md`.
- Pendência separada: Firebase avisou no deploy que Node.js 20 nas Functions será descomissionado em 31/10/2026; planejar migração para preservar novos deploys/rollback, sem alterar runtime nesta entrega.

### 14/10/2026 — Velocidade 3: Quicksand local (publicada)

- Mesmos binários, família, nove faces e pesos da fonte atual, com licença/proveniência; elimina a importação tardia de Quicksand e pré-carrega somente Latin.
- 124 testes, build/SSR, menu/busca, produto/carrinho/entrada do checkout, comparação tipográfica e PWA/rollback passaram. Em seis pares locais com processo/perfil novo por run, LCP mediano 514 → 358 ms; resultado de laboratório, ainda sem confirmação pública. CLS mediano 0,07218 → 0,07340, sem afirmar ganho de CLS.
- 2b permanece fora desta entrega/produção. Publicada pelo PR #90, merge `e78a30cc`, Actions `38592708589`; os arquivos/fontes foram conferidos na loja pública. O novo trabalho de cache parte dessa publicação, sem ganho de LCP público confirmado. Reversão testada retendo fontes, licença e proveniência; exige novo build/deploy Hosting + SSR. Detalhes/limites: `docs/ENTREGA-FONTES.md`.

### 14/10/2026 — Velocidade 2a: ajustes de checkout por rota (publicada)

- Textos de identificação, ordem Pix/boleto/cartão e eventos das etapas saem do head global para um helper versionado carregado apenas no app. Datas de entrega, frete grátis e cupons continuam compartilhados com o catálogo/carrinho.
- O worker recebe um marcador determinístico para atualizar o HTML precacheado da PWA quando esse head/helper mudar. Bundles/chunks existentes e políticas de cache permanecem iguais.
- Validação local: 124 testes, build/SSR, menu/busca desktop e celular, produto/carrinho/entrada do checkout, fixture de etapas e transição PWA/rollback passaram. Primeiro app ganha uma requisição e +371 B gzip / +272 B Brotli; home reduz 802 B gzip / 888 B Brotli. Ainda não há ganho de velocidade pública confirmado.
- Publicada pelo PR #89: merge `deed7fd2`, Actions `38546529280` concluído, Hosting `c9387863ac4b4db2`, SSR `634`. Rollback: reverter somente esta entrega **retendo o helper novo** para páginas/abas em cache; exige novo build e deploy Hosting + SSR. Procedimento e limites: `docs/ENTREGA-JAVASCRIPT-CHECKOUT.md`.

### 13/10/2026 — Banner da home 1920×400 inteiro no computador e 20 px a menos antes de "Categorias"

- A arte do banner já estava em 1920×400, mas a caixa do computador era fixa em 283 px e cortava o título e o botão. Agora a altura segue a proporção da arte (`--pe-banner-ratio`), com teto de 400 px: 300 px em 1440 px de tela, 400 px a partir de 1920 px (`_personalized-boxes.scss`).
- Espaço entre a fileira de quadros e o título "Categorias" no computador: de 40 para 20 px de margem (`.pe-boxes`, a partir de 992 px).
- Celular não muda (medido: banner 134 px e espaço de 46 px antes e depois). Sem mudança no painel (CMS).
- Desfazer: voltar `height: 283px !important` no bloco `min-width: 992px` do banner e `margin-bottom: 40px` em `.pe-boxes`.

### 13/10/2026 — Correção: painel não abria depois da ordenação agrupada

- Depois do PR 83 o painel mostrava "Error loading the CMS configuration ... fields names must be unique". Causa: o painel junta a configuração do tema com a da loja por posição (lodash.merge) e a lista "Ordem dos grupos" estava no meio dos campos da Estante, o que deslocou os nomes e repetiu "autoplay".
- Correção: "Ordem dos grupos" agora é o último campo da Estante (`template/js/cms/sections.js`). O que o Rafael vê não muda (ordenação com as duas opções novas e a lista de grupos).
- Teste novo (`tests/grouped-sort.test.cjs`) roda o mesmo merge por posição e confere nomes únicos. Também conferido com o config real do tema empacotado: 0 duplicados nos 6 pontos que quebravam.

### 12/10/2026 — Ordenação agrupada: Estante de produtos e lista da categoria (nada usa ainda)

- Duas opções novas em "Ordenação" da Estante de produtos: **Agrupar por subcategoria** e **Agrupar por tag**, com a lista "Ordem dos grupos". Produtos do mesmo grupo ficam juntos; dentro do grupo, mais vendidos; produto sem grupo vai para o fim.
- As ordenações atuais seguem iguais e nenhum conteúdo foi trocado: nada muda no site até alguém escolher a opção nova no painel.
- Também na lista da página de categoria (filtros e páginas): "Agrupar por subcategoria" em Ordenação padrão, feito no servidor de busca para a categoria inteira, com volta automática para "Mais vendidos" se o servidor recusar. Vale para todas as categorias de uma vez; categoria sem subcategorias fica em "Mais vendidos".
- Estante de produtos: home e página de Produtos. Vitrine dinâmica e Multi estante não ganham a opção.
- Detalhes, regras e limites: `docs/ORDENACAO-AGRUPADA.md`. Testes: `node --test tests/*.test.cjs`.

### 12/10/2026 — Etiqueta "Nº mais vendido" (ligada em 12/10, ranking do PIMI)

- Etiqueta pequena no card e na página do produto, de 1º a 5º mais vendido, lida de `/pe-best-sellers.json`. O arquivo entra `"enabled": false` e vazio: nada muda no site até alguém ligar e preencher o ranking.
- Ranking velho (mais de 3 dias sem atualizar), falha de rede ou JSON quebrado: a etiqueta não aparece.
- Fase 1 (só site): o arquivo passa a apontar (`source`) para o ranking calculado pelo PIMI (`reviews.pietroembalagens.com.br/api/codex/mais-vendidos/ranking`). Continua `"enabled": false`; só aparece etiqueta depois que o PIMI for publicado e o arquivo for ligado.
- **Ligada em 12/10/2026** (`"enabled": true`) a pedido do Rafael: 9 etiquetas na primeira leitura do ranking. Desligar: `"enabled": false` no mesmo arquivo.
- Detalhes, formato do arquivo e como desligar: `docs/MAIS-VENDIDO.md`. Testes: `node --test tests/best-sellers.test.cjs`.

### 03/10/2026 — Frete grátis v2 e teste sem minicart (no ar)

- **Frete v2** (`"ui": "v2"` em `pe-freight-config.json`): novo visual do bloco de frete grátis no minicart e no carrinho, datas "Chega até DD/MM (dia)", sugestões ordenadas pelo menor acréscimo. A v1 continua no código atrás da flag. Backup `backup/antes-frete-v2-20261003` (`176a9439`). Detalhes: `docs/FRETE-SUGESTOES.md`, seção "v2 (UI)".
- **Teste sem minicart** (`"minicart": false` em `pe-cart-config.json`): o ícone do carrinho vai direto à página do carrinho e, ao adicionar produto, aparece um aviso com "Ver carrinho". Detalhes: `docs/TESTE-SEM-MINICART.md`.
- Rollback: voltar `ui` para `v1` e/ou `minicart` para `true`, commit e push no `master`.

### 27/09/2026 — Sugestões de frete grátis: resposta imediata e destaque

- Bloco "Que tal aproveitar o frete?" demorava vários segundos: buscava produto por produto em lotes sequenciais e só exibia depois de simular o frete de até 3 opções.
- Agora exibe progressivamente (item do carrinho → relacionados → confirmações de frete), busca catálogo em paralelo e guarda a última resposta em `sessionStorage` por 10 min, compartilhada entre minicart e página do carrinho.
- Cabeçalho passa a dizer quanto falta para o **frete grátis**, com barra de progresso; card confirmado mostra "Frete grátis confirmado".
- Arquivos: `template/js/custom-js/freight/service.js`, `freight/runtime.js`, `components/FreightSuggestions.vue`, `tests/freight.test.cjs`, `docs/FRETE-SUGESTOES.md`.
- Validação: `node --test tests/freight.test.cjs` (22 testes) e build do storefront.

### 06/09/2026 — PDP: apresentação das informações de frete

- Oculta a linha de prazo de produção na PDP.
- Exibe o aviso de frete grátis por quantidade depois de “Prazo contado a partir da aprovação do pagamento.”
- CSS restrito a `#product`, em `content/code.json` (`html_head`). Mantém o cálculo de frete e os dados de produção.
- Validação: prévia com estrutura e estilos atuais em desktop e celular; JSON válido e `git diff --check` sem erros.
- Backup anterior à alteração: branch `backup/pdp-frete-20260906`, commit `7a0c80f5162b5ffabbd902bfd844b42a8ab5381c`.

---

### 29/03/2026 — SEO: Meta descriptions + Textos de categoria + FAQs

**O que foi feito:** Aplicadas meta descriptions, textos descritivos e FAQs (4 perguntas cada) em 20 categorias principais via API da E-com.plus.

**Categorias atualizadas:**

| # | Categoria | Slug |
|---|-----------|------|
| 1 | Caixas P/ Doces | `/caixas-embalagens-para-doces-e-brigadeiro` |
| 2 | Páscoa 2026 | `/pascoa` |
| 3 | Forminha para doces | `/forminhas-para-doces` |
| 4 | Formas BWB | `/formas-para-chocolate` |
| 5 | Caixa de Acetato | `/caixa-de-acetato` |
| 6 | Confeitaria | `/confeitaria` |
| 7 | Caixa para Doces (principal) | `/caixas-para-doces-e-brigadeiro` |
| 8 | Caixas P/ Biscoitos | `/embalagem-para-biscoitos` |
| 9 | Caixas P/ Brownie | `/embalagem-para-brownies` |
| 10 | Caixas P/ Macarons | `/embalagens-para-macarons` |
| 11 | Transporte e Delivery | `/embalagem-para-transporte-delivery-doces-macarons` |
| 12 | Caixas para Bolo | `/caixas-para-bolos` |
| 13 | Caixas com Berço | `/caixas-com-berco` |
| 14 | Tampa com Visor | `/caixa-com-visor-para-doces-brigadeiros` |
| 15 | Corantes | `/corantes` |
| 16 | Sacolas | `/sacola-kraft-branca` |
| 17 | Caixa para Ovo de Colher | `/ovo-de-colher` |
| 18 | Super Kits | `/super-kits-caixas-para-doces` |
| 19 | Saquinhos Transparentes | `/saquinho-transparente-pietro-embalagens` |
| 20 | Fitas de Cetim | `/fita-de-cetim` |

**Impacto esperado:** Melhora de indexação e CTR no Google em 4–8 semanas.

**Método:** API REST E-com.plus (`PATCH /v1/categories/{id}.json`) — campos `meta_description` e `body_html`.

---

## 🗺️ Estrutura do Repositório

| Pasta/Arquivo | Descrição |
|---|---|
| `content/*.json` | Configurações do site: menu, header, footer, home, settings |
| `content/pages/` | Páginas institucionais (sobre, frete, contato, etc.) |
| `content/posts/` | Posts do blog (SEO/conteúdo) |
| `content/widgets/` | Integrações externas (Analytics, Pixel, etc.) |
| `template/scss/` | CSS personalizado (visual, cores, fontes) |
| `template/js/` | JavaScript customizado |
| `template/pages/` | Templates EJS das páginas |

---

## 🔄 Fluxo de Trabalho

```
Rafael pede alteração
       ↓
Assistente prepara e mostra o diff
       ↓
Rafael aprova
       ↓
Commit + push no master
       ↓
GitHub Actions faz deploy automático
       ↓
Mudança no ar em ~5 minutos
```

---

### 29/03/2026 — Checkout: botão de valor mínimo estilizado

**O que foi feito:** O aviso de valor mínimo para finalizar compra ("Necessário inserir R$ X,XX para finalizar compra") foi transformado de texto simples em um botão estilizado no padrão Pietro Embalagens.

**Arquivo alterado:** `template/js/custom-js/html/PaymentMethods.html`

**Estilo aplicado:** Botão arredondado (border-radius: 50px), laranja `#FD8043`, texto branco, fonte Quicksand bold, ícone de carrinho (Font Awesome), centralizado, desabilitado (não clicável).

**Commit:** `feat(checkout): transforma aviso de valor mínimo em botão estilizado Pietro`

---

Como editar valor minimo pedido:
Vá no campo de pesquisa dentro de código e digite paymentmethod.js
altere as linhas 46 e 112

---


## 📌 Próximos Passos Sugeridos

- [ ] Textos descritivos nos produtos mais vendidos
- [ ] Estratégia de blog/conteúdo para SEO de cauda longa
- [ ] Estratégia de reativação de clientes (email/WhatsApp)
- [ ] Card com QR code nos pedidos dos marketplaces para converter cliente para site próprio
