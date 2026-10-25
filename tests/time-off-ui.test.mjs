import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261025214358_add_time_off_balances.sql',import.meta.url),'utf8');

test('expõe o módulo de saldo de folgas no menu e na página inicial',()=>{
 assert.match(html,/href="#folgas"/);assert.match(app,/Saldo de dias de folga/);assert.match(app,/renderTimeOff/);
});

test('permite observação em grupo, edição individual e vias por colaborador',()=>{
 assert.match(app,/OBSERVAÇÃO EM GRUPO/);assert.match(app,/observation_mode:'group'/);assert.match(app,/observation_mode='individual'/);assert.match(app,/data-field="copies"/);
});

test('mantém layout responsivo e compacto do módulo',()=>{
 assert.match(css,/\.time-off-row/);assert.match(css,/@media\(max-width:760px\).*\.time-off-row/s);assert.match(css,/padding:3px 10px/);
});

test('protege saldos e histórico com RLS sem acesso anônimo',()=>{
 assert.match(migration,/alter table public\.fp_time_off_balances enable row level security/);assert.match(migration,/alter table public\.fp_time_off_generation_logs enable row level security/);assert.match(migration,/revoke all on public\.fp_time_off_balances, public\.fp_time_off_generation_logs from anon/);assert.match(migration,/private\.fp_is_admin\(\)/);
});
