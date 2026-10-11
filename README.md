# Portal UBSF Nova Sertânia — Prefeitura de Sertânia

Portal web de serviços administrativos da UBSF Nova Sertânia. A folha de ponto é
um dos módulos do portal, ao lado da biblioteca de avisos para impressão.

## Recursos

- autenticação administrativa com Supabase Auth;
- cadastro de unidades e colaboradores;
- seleção múltipla com busca e filtros;
- geração mensal em A4, uma página por colaborador;
- pré-visualização antes do download;
- histórico de documentos gerados;
- contador persistente das pendências de ultrassom da UBSF Nova Sertânia, com
  cópia das 12 quantidades na ordem da planilha;
- biblioteca de avisos oficiais em PDF A4, com acesso à versão editável no Canva;
- sincronização automática da arte e do PDF do Canva a cada minuto;
- banco protegido por Row Level Security (RLS).

## Sincronização com o Canva

O módulo de avisos consulta a data de atualização do design no Canva e exporta
novamente o PNG e o PDF quando encontra uma alteração. Os arquivos são
armazenados no bucket público `notice-assets`, e a versão registrada em
`fp_notice_assets` impede que o navegador reutilize uma cópia antiga.

A Edge Function `canva-sync` concentra o OAuth, a renovação dos tokens e as
exportações. O agendamento `canva-notice-sync-every-minute` é executado pelo
Supabase Cron. O Client ID e o Client secret são cadastrados pela área
administrativa do próprio site e armazenados de forma criptografada no Supabase
Vault.

No Canva Developer Portal, crie o aplicativo público `UBSF Sync`, acesse
**Outside Canva**, inicie a integração e mantenha as APIs REST ativadas. Gere o
Client secret, habilite as permissões `design:meta:read` e
`design:content:read` e cadastre a URL de retorno:

```text
https://xwlmpxypjheuhbxyfplo.supabase.co/functions/v1/canva-sync/callback
```

Na área **Avisos** do portal, use **Configurar integração** para salvar o Client
ID e o Client secret diretamente no Vault do Supabase e concluir a autorização
OAuth. O segredo não deve ser incluído no repositório.

## Desenvolvimento local

Sirva a raiz do projeto em um servidor HTTP. Por exemplo:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

## Validação

```bash
npm test
npm run check
```

## Publicação

O site é publicado pelo GitHub Pages a partir da branch `main`. A estrutura do
banco está versionada em `supabase/migrations`, com RLS habilitado em todas as
tabelas do módulo.
