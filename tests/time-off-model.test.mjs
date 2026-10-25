import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTimeOffPrintPlan,normalizeBalanceDays,normalizeCopies,timeOffPages} from '../js/time-off-model.js';

test('pagina o saldo sem perder ou duplicar dias',()=>{
 assert.deepEqual(timeOffPages(31),[{start:1,end:31,count:31,page:1}]);
 assert.deepEqual(timeOffPages(32),[{start:1,end:31,count:31,page:1},{start:32,end:32,count:1,page:2}]);
});

test('repete todas as páginas conforme a quantidade de vias',()=>{
 const employee={id:'1',name:'COLABORADOR'};
 const plan=buildTimeOffPrintPlan([{employee,balance_days:28,copies:2,observation:'Saldo anterior'}]);
 assert.equal(plan.length,2);assert.deepEqual(plan.map(item=>[item.copy,item.start,item.end]),[[1,1,28],[2,1,28]]);
});

test('rejeita saldos e vias inválidos',()=>{
 assert.throws(()=>normalizeBalanceDays(-1),/saldo inteiro/);assert.throws(()=>normalizeBalanceDays(2.5),/saldo inteiro/);assert.throws(()=>normalizeCopies(0),/1 e 50/);
});
