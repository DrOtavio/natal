# Natal da Família Oliveira

Base de uma aplicação de amigo secreto com **React, Vite, TypeScript, Tailwind CSS e Supabase**. O frontend é estático e gera a pasta `dist`. A publicação no **Cloudflare Pages é manual, via Direct Upload**, sem integração GitHub–Cloudflare.

**Estado:** implementação local compilável e testada; ainda não validada para produção. É necessário configurar um projeto Supabase, aplicar a migração, implantar a função, cadastrar a organização e executar o ensaio real descrito abaixo. Não foram incluídas credenciais reais.

A identidade visual está em `public/logo-natal-oliveira.svg`, integrada ao cabeçalho com texto alternativo “Natal da Família Oliveira”. O ícone e a ilustração usam a mesma paleta verde, vinho e dourado, sem dependência de imagens externas.

## Design e acessibilidade

O frontend usa verde floresta `#12372A`, vinho `#7A1F2B`, dourado `#C9A227` e off-white `#F7F3EA`. A logo original foi preservada. Cormorant Garamond e Manrope são servidas localmente em WOFF2; suas licenças OFL acompanham `public/fonts/`. Não há requisições a serviços externos de fontes ou imagens.

Gradientes, vidro translúcido, luzes difusas, brilho dos botões e a abertura do presente usam CSS e SVG. As animações movimentam transformações e opacidade. O scroll reveal observa cada elemento uma vez e mantém o conteúdo visível quando `prefers-reduced-motion` está ativo ou `IntersectionObserver` não está disponível. A revelação só anima após uma resposta bem-sucedida da API, move o foco para o resultado e mostra a pessoa imediatamente com movimento reduzido. As telas são carregadas sob demanda por rota.

O redesign não modifica banco, migrações, Edge Functions, sorteio, autenticação nem contratos de API. A verificação visual foi feita com respostas simuladas, sem inscrições, sorteios ou reinícios reais.

## Executar

Requer Node.js 24 LTS (veja `.nvmrc`) e npm.

```bash
npm install
npm run dev
```

```bash
npm run build      # checagem TypeScript + build estático em dist/
npm test           # sorteio, autorização HTTP e migração PostgreSQL via PGlite
npm run preview   # conferir o build localmente
```

O `package-lock.json` está versionado para instalações reproduzíveis com `npm ci`. Sem configuração Supabase, o site abre normalmente e informa que as inscrições estão em preparação; não simula inscrições nem sorteios.

## Configurar o Supabase

1. Crie um projeto Supabase.
2. Copie `.env.example` para `.env.local` e preencha **somente os valores públicos**:

   ```dotenv
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
   ```

   Use a chave **publishable** ou a chave legada **anon**. Essas chaves identificam o projeto e podem estar no navegador; não concedem acesso às tabelas desta aplicação. **Nunca** coloque `service_role`, uma chave `sb_secret_*`, senha do banco ou outro segredo em variáveis `VITE_*`. O Vite incorpora essas variáveis no JavaScript durante o build. Reinicie o dev server após alterar `.env.local` e faça novo build antes de publicar.

3. Aplique `supabase/migrations/20261029000000_initial.sql` pelo SQL Editor do Supabase em um projeto novo. Alternativamente, com a CLI Supabase 2.122.0:

   ```bash
   npx supabase@2.122.0 login
   npx supabase@2.122.0 link --project-ref SEU_PROJECT_REF
   npx supabase@2.122.0 db push
   ```

4. Crie uma conta administrativa em **Authentication → Users** (com e-mail confirmado). Desabilite o cadastro público de usuários em Authentication: as inscrições da família usam a função própria e não precisam de contas Auth. Adicione o usuário à lista de organizadores pelo SQL Editor, substituindo o e-mail:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where lower(email) = lower('organizador@exemplo.com')
   on conflict do nothing;

   -- Confirme que a conta foi encontrada e adicionada:
   select user_id from public.admins;
   ```

   Não existe senha padrão, cadastro administrativo pela interface nem permissão de administrador baseada em dados editáveis pelo usuário.

5. Configure a origem exata do frontend como segredo de configuração da Edge Function. Para desenvolvimento, `http://localhost:5173`; em produção, o domínio real, sem barra final. Várias origens podem ser separadas por vírgula. Não use `*` nem autorize todos os subdomínios `pages.dev`.

   ```bash
   npx supabase@2.122.0 secrets set ALLOWED_ORIGINS=https://SEU-SITE.pages.dev
   npx supabase@2.122.0 functions deploy christmas-api
   ```

   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos automaticamente no servidor Supabase. Nenhuma chave administrativa precisa ser copiada para este repositório ou para o Cloudflare Pages. O arquivo `supabase/functions/.env.example` documenta a configuração local da função. Em um ambiente de nuvem com rede restrita, libere o hostname específico do projeto Supabase nas configurações antes de testar a conexão.

## Reinício administrativo (testes ou nova edição)

A migração adicional `supabase/migrations/20261029010000_admin_reset.sql` adiciona a RPC protegida `reset_christmas_event`. **Se o projeto já recebeu a migração inicial, execute somente esse novo arquivo no SQL Editor**, uma vez. A migração inicial não deve ser repetida. Em seguida, reimplante `christmas-api` pela automação GitHub Actions e publique novamente a interface compilada via Cloudflare Pages.

O painel `/admin` terá uma seção **Zona de manutenção**, com:
- **Refazer sorteio (manter inscritos):** elimina todos os pares e links antigos, mantém participantes e dicas, reabre inscrições.
- **Apagar inscrições e sorteio:** elimina também participantes e dicas e reabre inscrições do zero.

Ambas as opções pedem `REINICIAR` digitado por extenso e exigem sessão de administrador validada no servidor. São **irreversíveis**: links anteriores param de funcionar e pessoas que já visualizaram resultados podem conhecer combinações antigas. Não execute reinício de um evento real sem informar todos os participantes. O banco aplica cada reset de forma atômica usando o mesmo lock de inscrições/sorteio; não modifica a lista `admins`.

Para desenvolvimento local, rode `npm test` e `npm run build`. A automação GitHub Actions **Validar aplicacao** também é disparada após alterações relevantes. Para o site publicado, execute novamente **Publicar API de Natal no Supabase** e **Gerar site para Cloudflare Pages**, baixe o artefato `dist` e faça novo Direct Upload no projeto Cloudflare já existente.

## Fluxos

| Rota | Uso |
| --- | --- |
| `/` | Informações e inscrição pública com nome, e-mail e dica opcional |
| `/admin` | Login por Supabase Auth, participantes, pausa de inscrições e sorteio |
| `/revelar#token=…` | Revelação personalizada mediante um token secreto |

O formulário envia os dados para `christmas-api`. A inscrição é limitada a 200 pessoas por instalação, e o mesmo e-mail não cria duas inscrições. A resposta pública é a mesma para inscrições novas e duplicadas. Os e-mails não são publicados nem enviados ao amigo secreto. **Não há envio automático de e-mail** nesta base: a organização distribui os links em particular.

O painel confirma a sessão no servidor e consulta `admins`. Um usuário apenas autenticado não obtém acesso administrativo. A sessão do painel fica em memória e exige novo login após recarregar a página. A confirmação do sorteio encerra as inscrições de forma atômica. O reinício excepcional por administrador só fica disponível após aplicar a migração adicional de reset e reimplantar a função e o frontend.

### Sorteio e links

- O servidor utiliza Web Crypto, Fisher–Yates e rejeição de permutações com auto-sorteio. Não usa `Math.random` nem um fallback que altere as probabilidades.
- Uma transação PostgreSQL trava o evento e valida cobertura completa, participantes únicos, destinatários únicos e ausência de auto-sorteio. Se a lista mudar durante o sorteio, a gravação é recusada. Chamadas posteriores não sobrescrevem um sorteio concluído.
- Cada link usa 32 bytes aleatórios (256 bits). O banco guarda apenas o hash SHA-256 do token, junto ao par do sorteio.
- Os tokens são devolvidos **uma única vez** na resposta ao administrador e ficam somente na memória da página. Baixe o arquivo confidencial imediatamente, antes de sair ou atualizar. Não coloque o arquivo no Git nem envie em grupos. Se a resposta for perdida ou os links não forem salvos, esta versão inicial não tem recuperação ou reemissão pelo painel; será necessária uma rotina administrativa de rotação de tokens antes de utilizar o evento novamente. Não apague pares para tentar refazer o sorteio.
- O token fica no **fragmento** `#token=…`, que não é enviado ao servidor estático do Cloudflare. Na revelação, é enviado por HTTPS no corpo de um POST. As respostas da função usam `Cache-Control: no-store`; o site não carrega analytics ou scripts de terceiros.
- O link é uma credencial de acesso: qualquer pessoa que o receber poderá abrir a revelação. A organização recebe todos os links e pode abri-los; esta base não oferece sigilo criptográfico contra a própria organização ou o proprietário do banco.

As tabelas têm RLS habilitado e privilégios revogados para `anon` e `authenticated`. As funções `SECURITY DEFINER` também têm execução pública revogada; somente `service_role` pode executá-las. O handler valida o JWT real com `auth.getUser()` e a lista administrativa antes das operações privadas. `verify_jwt = false` no gateway permite as operações públicas e o uso de publishable keys; **não** desabilita a validação dentro do handler. CORS restringe as origens do navegador, mas não substitui autorização nem impede chamadas fora do navegador.

## Publicação manual no Cloudflare Pages

O workflow **[Gerar site para Cloudflare Pages](https://github.com/DrOtavio/natal/actions/workflows/build-cloudflare.yml)** agora também executa automaticamente após mudanças de frontend na `main`, além do disparo manual. Ele usa a URL Supabase já configurada e o secret existente `SUPABASE_PUBLISHABLE_KEY`, executa testes e build e disponibiliza o artefato **`natal-oliveira-cloudflare`** por sete dias. Baixe o ZIP na seção **Artifacts** da execução concluída e envie seu conteúdo no Direct Upload do projeto Cloudflare existente. O pacote contém `index.html` na raiz, `assets/`, `fonts/`, a logo, `_headers` e `_redirects`. Nenhuma implantação de API ou migração é necessária para aplicar apenas este redesign.

Para gerar o pacote localmente:

1. Configure o Supabase e os dois valores públicos em `.env.local` **na máquina onde será feito o build**.
2. Execute `npm install` (ou `npm ci`), `npm test` e `npm run build`.
3. No Cloudflare, abra **Workers & Pages → Create application → Pages → Upload assets / Direct Upload**. Não escolha a conexão com Git.
4. Faça upload **do conteúdo da pasta `dist`**, incluindo `index.html`, `assets`, `_headers`, `_redirects` e `favicon.svg`, e publique.
5. Atualize `ALLOWED_ORIGINS` no Supabase para o domínio publicado. Se alterar o domínio do site, atualize essa configuração. Os links exportados usam a origem em que o painel está aberto: faça o sorteio no domínio definitivo, não no ambiente local ou numa URL temporária de preview.
6. Verifique a página inicial, o acesso direto a `/admin` e `/revelar`, uma inscrição e o login. Faça um ensaio completo em um **projeto Supabase de teste separado** antes do evento real, pois o sorteio é definitivo.

`public/_redirects` mantém as rotas da SPA no upload estático. `public/_headers` define CSP, proteção contra iframes e política de referenciador. A CSP permite o domínio padrão `*.supabase.co`; se usar um domínio personalizado para o Supabase, ajuste `connect-src` antes de compilar. Não há backend Node ou Cloudflare Worker para publicar: a lógica privada roda no Supabase.

## Estrutura e validação

```text
src/                          interface React e cliente público Supabase
public/                       ícone, headers e fallback das rotas
supabase/functions/           API privada/pública e sorteio no servidor
supabase/migrations/          tabelas, RLS, privilégios e transações
tests/                        algoritmos, autorização e SQL real via PGlite
```

`npm run build` checa o frontend, a configuração Vite e o handler compartilhado, e gera `dist`. Para checar também o entrypoint Deno da Edge Function:

```bash
npx --yes --package=deno@2.9.6 deno check --config supabase/functions/christmas-api/deno.json supabase/functions/christmas-api/index.ts
```

Os testes SQL executam a migração em PostgreSQL via PGlite com os papéis de acesso do Supabase. Não substituem um ensaio contra o serviço real, incluindo Auth, gateway, implantação da Edge Function e CORS. A base pode ser compilada e desenvolvida sem credenciais; o funcionamento integrado exige configurar e implantar o projeto Supabase.

### Ensaio real obrigatório antes de produção

Use um projeto Supabase de teste separado, com a mesma migração e função implantadas, e preencha `.env.local` com seus valores públicos:

1. Reinicie `npm run dev`. O formulário deve sair do estado “em preparação”. Inscreva pelo menos duas pessoas fictícias com e-mails diferentes; tente repetir um e-mail e confirme no painel que não houve duplicação.
2. Abra `/admin`. Acesso sem login não deve listar participantes. Uma conta Auth que **não** conste em `admins` deve receber a mensagem de acesso negado. A conta incluída em `admins` deve ver as inscrições.
3. Pause as inscrições e confirme que um novo envio é recusado; reabra e confirme que volta a aceitar. Use duas sessões ou navegadores para evitar confundir estados já carregados.
4. No domínio de teste que será usado para abrir os links, confirme o sorteio no painel. Baixe o arquivo confidencial. Verifique no banco que cada participante aparece uma vez como remetente e uma vez como destinatário, e que ninguém tirou a si mesmo.
5. Abra cada link em uma janela privativa: deve revelar somente o nome do remetente, o nome de seu amigo secreto e a dica de presente, sem e-mail. Troque um caractere do token: a revelação deve ser recusada. Atualize um link válido: ele deve continuar revelando a mesma pessoa.
6. Confirme que inscrições após o sorteio e nova tentativa de sorteio são recusadas, sem mudar os pares existentes. Confirme que consultar diretamente as tabelas e chamar as RPCs com as credenciais públicas também é recusado.
7. Publique um build de teste no Cloudflare Pages, configure sua origem em `ALLOWED_ORIGINS` e repita inscrição, login e revelação. Teste navegação direta e atualização em `/admin` e `/revelar`. Verifique no navegador que o frontend não recebe chaves administrativas nem a lista de pares.

Registre os resultados desse ensaio antes de usar dados reais. Os testes locais não executam essas etapas contra um Supabase remoto e não demonstram prontidão para produção.

Antes de abrir inscrições amplamente na internet, adicione proteção contra abuso no endpoint público (por exemplo, Turnstile validado no servidor e limitação persistente de tentativas), defina a política de retenção/exclusão dos dados e prepare recuperação de links. O honeypot e o limite de participantes atuais não substituem essas proteções. Dados reais e segredos não devem ser utilizados em testes nem incluídos em logs.
