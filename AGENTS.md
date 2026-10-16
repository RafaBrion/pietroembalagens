# Instruções para trabalhar nesta loja

Este repositório publica a loja de produção Pietro Embalagens. Leia `NOTAS.md` e `docs/PLANO-VELOCIDADE.md` antes de alterações. Cada tarefa de nuvem já é isolada; use o checkout existente e não crie worktrees sem pedido explícito do usuário.

## Regra expressa do usuário: advisor e rollback

O usuário determinou: “sempre chame o advisor para validar o que vai fazer” e “sempre deixe o rollback fácil e rápido”.

- Antes de implementar cada entrega que possa afetar produção, consulte um advisor independente. Use a ferramenta correspondente, se disponível; caso contrário, convoque um agente com a função de advisor para revisão somente leitura. Entregue objetivo, escopo, arquivos, riscos comerciais, validação e proposta de rollback. Reconsulte se o escopo mudar.
- Antes de publicar, consulte o advisor novamente com o diff final, os resultados reais dos testes, a comparação antes/depois e o procedimento de rollback. Resolva achados impeditivos e obtenha novo parecer sobre o que mudou.
- A revisão do advisor não substitui a aprovação do Rafael sobre a mudança concreta, conforme o fluxo de `NOTAS.md`. Push em `master` dispara deploy automático; mantenha a preparação em branch de trabalho.
- A exigência aplica-se a mudanças de aplicação, dependências, configuração, CI e implantação. Leituras, diagnóstico e a própria revisão somente leitura do advisor podem continuar sem convocação recursiva.

## Implantação e reversão

- Prepare entregas pequenas e separáveis. Registre o commit aprovado, o conteúdo efetivo do build (incluindo qualquer alteração automática), a execução do CI e os identificadores de Hosting/Functions acessíveis.
- Antes de produção, confirme checkout no SHA aprovado, serialização de deploys sem cancelar um deploy em andamento, testes necessários e falha explícita se artefatos esperados faltarem.
- Prepare o rollback antes do deploy: alvo anterior identificado, diff de reversão delimitado, comandos ou procedimento suportado, acesso necessário, critérios de acionamento e validação depois da reversão. Preserve assets antigos quando necessário.
- Hosting e Functions são publicados pelo workflow atual. Um rollback somente de Hosting não reverte a Function SSR. Templates e conteúdo também são copiados para a Function pelo predeploy.
- Para desfazer código, prefira reverter somente a entrega responsável, preservando commits posteriores e mudanças locais. Não use `reset --hard`, force push ou restauração geral por tag como rollback.
- Um revert no fluxo atual exige novo build/deploy. Não prometa reversão instantânea sem procedimento testado. Uma release anterior de Hosting só serve como atalho para incidente estritamente estático, com compatibilidade do SSR e impacto em mudanças posteriores verificados.
- Considere deploy parcialmente concluído, caches CDN e service worker/PWA. Verifique sessão limpa e sessão já aberta, além de respostas da origem/SSR. Não trate deploy completo como troca atômica.

## Validação

- Use Node 20 para instalar as ferramentas e fazer o build do frontend; use Node 22 para instalar/testar as Functions e executar o Firebase CLI (incluindo descoberta dos triggers e deploy). Esta separação faz parte da migração de runtime autorizada por Rafael. Use dependências com lockfile e confira as versões efetivas em cada etapa. Execute os testes existentes e os novos testes relevantes; confira build, home, categoria, produto e rotas afetadas.
- Valide menu/busca mobile e desktop, carrinho, quantidade, preço, frete, login/OAuth e etapas do checkout em contexto de teste, sem compra real nem evento Purchase fictício em produção.
- Alterações de frontend precisam de validação visual e de interações no navegador antes de publicar. Registre medições bloqueadas ou não executadas; não as apresente como aprovadas.
- Preserve proxy, autenticação injetada e verificação TLS. A importação permanente do certificado do proxy no Chromium foi rejeitada pela revisão automática e não recebeu autorização explícita; não contorne esse bloqueio.
- Rafael autorizou explicitamente confiar no certificado do proxy apenas em um perfil temporário de testes. Mantenha a verificação HTTPS ativa, não altere a confiança permanente do usuário/sistema e apague o perfil após a validação.
- Registre rollback e parecer do advisor junto à entrega. Depois do deploy e, se houver, da reversão, confirme a versão efetiva e o funcionamento na loja pública.
