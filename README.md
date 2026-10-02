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
- biblioteca de avisos oficiais em PDF A4, com acesso à versão editável no Canva;
- banco protegido por Row Level Security (RLS).

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
