import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20261011141349_ultrasound_pending_counter.sql',import.meta.url),'utf8');

test('portal expõe o contador no menu e na página inicial',()=>{
 assert.match(index,/href="#ultrassom"/);
 assert.match(app,/Pendências de ultrassom/);
 assert.match(app,/Copiar 12 quantidades/);
 assert.match(app,/Limpar contagem/);
});

test('cada clique agenda persistência e a limpeza exige confirmação',()=>{
 assert.match(app,/changeUltrasoundCount[\s\S]*queueUltrasoundSave/);
 assert.match(app,/confirm\('Limpar todas as 12 quantidades/);
 assert.match(app,/localStorage\.setItem\(ULTRASOUND_LOCAL_KEY/);
 assert.match(app,/fp_ultrasound_counters/);
});

test('tabela persistente possui RLS e não concede acesso anônimo',()=>{
 assert.match(migration,/enable row level security/);
 assert.match(migration,/to authenticated/);
 assert.match(migration,/revoke all on public\.fp_ultrasound_counters from anon/);
});
