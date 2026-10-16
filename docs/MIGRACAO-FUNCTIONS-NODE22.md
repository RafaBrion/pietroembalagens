# Migração das Functions para Node.js 22

Preparação em 16/10/2026. Rafael autorizou seguir até a publicação (“va ate o final”), após o plano e seus limites de recuperação. Ainda sem deploy desta entrega nesta revisão.

## Escopo e motivo

O deploy anterior avisou que Node.js 20 nas Functions será descomissionado em 31/10/2026. O destino escolhido é Node.js 22, suportado para primeira geração. Preservar Function `ssr`, região `us-central1`, geração, URL, permissões e configuração comercial. Não migrar para segunda geração nem atualizar dependências junto.

Base oficial: `4c9f71804c399e8e710560d6b9421444382bf42a`, Hosting `07b3e7bf00bc22a1`, SSR `636 ACTIVE nodejs20`. A branch também contém o registro documental local da entrega 5 (`68589d55`), sem alteração adicional da aplicação dessa entrega. As entregas 4 e 2B continuam suspensas.

Alterações da migração:

- `.functions/package.json` e o metadado raiz do lockfile: `engines.node` de 20 para 22. Versões, resoluções e integridades de todas as dependências preservadas.
- CI: ferramentas/build do frontend e suíte completa em Node 20; instalação/testes HTTP das Functions em Node 22; captura e deploy efetivos em Node 22. O CLI local continua na versão travada `13.29.2`, SDK Functions `5.1.1`, Admin `11.11.1` e renderer `2.11.12`.
- Guarda de runtime: exige Node 22 no processo e nos dois manifestos; rejeita override incompatível; confirma a seleção `nodejs22` e o executável de descoberta do Firebase CLI. O CLI antigo apenas avisa quando executado em Node 20 e pode analisar o código no runtime errado, por isso trocar só `engines` seria insuficiente.
- Após o deploy, o CI exige metadado da mesma execução/SHA, fase `after` e SSR `ACTIVE nodejs22`. Fonte aprovada, serialização sem cancelamento, baseline e artefatos continuam protegidos.
- `AGENTS.md` registra os dois runtimes; o `.nvmrc` e os manifestos do frontend permanecem em Node 20.

## Validação antes de publicar

- Node.js `22.23.3` obtido de `nodejs.org` via HTTPS, com SHA-256 conferido contra o arquivo oficial. `npm ci` das Functions instalou 314 pacotes com lockfile, sem alteração de versões. A primeira instalação local falhou porque o cache padrão estava fora da área gravável; repetir com o cache permitido resolveu, mantendo TLS e verificações de integridade. O erro inicial foi preservado.
- **130 testes** do projeto em Node `20.20.2`, sem falhas/skips; **23 testes** HTTP/guarda de runtime em Node `22.23.3`, sem falhas/skips. Incluem compressão gzip/Brotli/deflate, negociação, HEAD, redirects, 404, erros do renderer, respostas já comprimidas e proxy real contra upstream de laboratório.
- A guarda rejeitou de fato um processo Node 20. A descoberta real pelo Firebase CLI/SDK em Node 22 retornou apenas `ssr`, `gcfv1`, `us-central1`, trigger HTTPS e `nodejs22`, sem publicar nem chamar APIs de implantação.
- Build completo das seis páginas em Node 20 e preparação SSR passaram. Dos 278 arquivos do Hosting, 277 são idênticos ao último CI publicado; somente a home difere. O corpo fora de `data-product` é igual; mudaram 48 IDs aleatórios de fotos e o estoque do SKU `arovre10-10`, de 114 para 113. Consulta independente da API pública confirmou ID/SKU e estoque 113. Quantidades não foram normalizadas/revertidas nem atribuídas à migração.
- Handler SSR real, templates preparados e catálogo público: baseline em Node 20, candidato em Node 22 e restauração do código publicado mantendo Node 22. Cada execução passou 21 GETs (sete rotas × identity/gzip/Brotli) e HEAD. As 42 comparações entre candidato/recuperação e baseline preservam status, cache, compressão, Vary, redirects e HTML, permitindo **somente** IDs aleatórios de fotos em `data-product.pictures[]._id`. Preços, quantidades, IDs comerciais e bytes externos a esses atributos foram preservados.
- O primeiro harness esperava indevidamente 200 do SSR direto em `/app`; o handler anterior e o novo retornam 404, pois o app é servido como arquivo estático pelo Hosting. A expectativa foi corrigida e os erros iniciais preservados. Não houve correção de aplicação para fazer o teste passar. O redirect com barra final conserva o 302 definido pelo handler.
- Navegador **antes do deploy**, consultando a produção ainda em Node 20: menu desktop, abertura/volta de submenus, busca instantânea desktop, menu mobile pelo botão visível, digitação no campo do menu e envio da busca, categoria, produto/variação/quantidade, carrinho e entrada do checkout passaram em 1440/390 px sem erros JavaScript. O rótulo interno `candidate` no script reaproveitado não significa SSR Node 22 publicado. O hook legado de busca mobile também foi acionado via DOM em botão oculto; esse acionamento isolado não comprova um controle visível. A busca visível é coberta pelo fluxo do menu e será repetida após o deploy. O formulário de e-mail/OAuth aparece, sem autenticação/pedido/pagamento. Marketing foi bloqueado somente no navegador de QA. Cotação real de frete e autenticação OAuth não foram concluídas; as proteções de frete passam na suíte existente. TLS ativo, confiança apenas no perfil temporário autorizado e perfil apagado após validação.

Evidências locais: `/workspace/.cloud-setup/runtime-node22/` — logs de instalação/testes/build, `runtime-guard.json`, `node20-rejection.json`, `discovery.json`, `source-check.json`, `build-comparison.json`, `home-comparison.json`, `quantity-api.json`, `ssr-node20/`, `ssr-node22/`, `recovery-node22/` e `ssr-comparison.json`.

## Publicação

Antes do envio: checkout limpo no SHA final, master remoto ainda na base revista e nenhum deploy concorrente. Obter parecer final do advisor sobre diff/testes/recuperação. A autorização de Rafael para seguir até o fim já foi dada; não solicitar novamente a mesma autorização.

Enviar a versão por avanço sem force de `master` e acompanhar todo o workflow existente. Hosting e SSR são publicados separadamente, sem garantia de troca atômica. Conferir os identificadores capturados antes/depois, runtime final `nodejs22` e estado `ACTIVE`; verificar HTTPS público, compressão/cache, home/categoria/produto/app, menu/busca, produto/carrinho/entrada do checkout e PWA. Não enviar pedido, pagamento, login real ou evento Purchase de teste.

## Recuperação e seus limites

Gatilhos: SSR com erro de inicialização/renderização, regressão de rotas/cache/compressão atribuível à entrega ou runtime divergente após deploy. Examinar o estado real de Hosting e Function, inclusive publicação parcial. Não reverter uma versão mais recente de terceiros.

**Não executar um revert cego da migração:** ele também voltaria `engines`/CI para Node 20. Nenhum ensaio local comprova que o provedor aceitará downgrade de Node 22 para 20, e esse caminho deixa de ser elegível após o prazo. Não prometer esse retorno nem recuperação instantânea.

O ensaio executa o código, templates, conteúdo e bundles anteriores **mantendo Node 22**. A migração não muda esses fontes; eles passaram o mesmo teste HTTP no runtime novo. Isso comprova compatibilidade e deixa a base disponível para diagnóstico; restaurar o mesmo código **não reverte nem resolve automaticamente uma falha específica do Node 22**. Não há rollback de runtime garantido ou instantâneo. Para uma regressão de código/configuração, criar branch a partir do master atual, reverter somente a alteração responsável e manter os manifestos/guarda/etapas Node 22. Para uma incompatibilidade específica do runtime, diagnosticar e corrigir mantendo Node 22, com novos testes; não chamar isso de retorno a Node 20.

Procedimento de preparação, em checkout limpo, depois de identificar a causa e o commit responsável:

```sh
git switch -c recovery/functions-node22
# Reverter somente o commit/trecho responsável pelo incidente, após revisão.
# Manter engines.node=22 no package/lock e Node22 nas etapas Functions/deploy.
git diff --check
# Em Node22: guarda, instalação congelada e testes HTTP.
node .github/scripts/verify-functions-runtime.cjs
node --test tests/ssr-compression.test.cjs tests/functions-runtime.test.cjs
# Em Node20: suíte completa e build; preparar SSR e rever com advisor.
```

Publicar a correção pelo fluxo atual com novo build/deploy e conferir runtime, recursos e loja pública. O CI guarda evidências de fonte/build, mas exclui o cache de dados: os arquivos não são um pacote completo de redeploy. Recuperar só uma release de Hosting não restaura o runtime SSR. Não usar reset, force push ou apagar/recriar a Function.

Retorno a Node 20 seria uma contingência condicionada à aceitação explícita do provedor antes do limite, com validação própria; não foi executado nem demonstrado nesta entrega. A opção de manter Node 22 foi comunicada antes da autorização e aprovada pelo advisor como limite do plano.

## Referências

- [Firebase: gerir runtimes e atualizar Node.js](https://firebase.google.com/docs/functions/manage-functions#upgrade_your_nodejs_runtime).
- [Google Cloud: suporte a runtimes](https://cloud.google.com/functions/docs/runtime-support).

As páginas foram consultadas por HTTPS nesta preparação. A data 31/10/2026 foi observada no aviso do deploy e na tabela do CLI instalado; a publicação deve ocorrer com antecedência.
