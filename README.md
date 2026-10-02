# Folha de Ponto — Prefeitura de Sertânia

Sistema web para cadastrar colaboradores e gerar folhas individuais de frequência
em PDF. Permite gerar um documento individual ou um PDF unificado com uma seleção
de colaboradores.

## Recursos

- autenticação administrativa com Supabase Auth;
- cadastro de unidades e colaboradores;
- seleção múltipla com busca e filtros;
- geração mensal em A4, uma página por colaborador;
- pré-visualização antes do download;
- histórico de documentos gerados;
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
