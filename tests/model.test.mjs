import test from 'node:test';
import assert from 'node:assert/strict';
import {filterEmployees,formatDate,monthDays,normalizeText,referenceLabel,safeFilename,sortEmployees} from '../js/model.js';

test('monta sempre 31 linhas e deixa dias inexistentes vazios',()=>{
  const february=monthDays(2026,2);
  assert.equal(february.length,31);
  assert.equal(february.filter(Boolean).length,28);
  assert.equal(february[27].day,28);
  assert.equal(february[28],null);
});

test('considera ano bissexto e identifica fins de semana',()=>{
  const february=monthDays(2028,2);
  assert.equal(february.filter(Boolean).length,29);
  assert.equal(february[4].weekday,'SÁB.');
  assert.equal(february[4].weekend,'saturday');
  assert.equal(february[5].weekday,'DOM.');
  assert.equal(february[5].weekend,'sunday');
});

test('formata referência, datas e nomes de arquivo',()=>{
  assert.equal(referenceLabel(2026,10),'OUTUBRO-2026');
  assert.equal(formatDate(2,10,2026),'02/10/2026');
  assert.equal(safeFilename('Mércia Feitosa e Silva'),'mercia-feitosa-e-silva');
  assert.equal(normalizeText('TÉCNICO'),'tecnico');
});

test('busca sem acentos e filtra unidade e status',()=>{
  const employees=[
    {id:'2',name:'MÉRCIA',job_title:'TÉCNICA',employment_status:'EFETIVO',unit_id:'u1',active:true,unit:{name:'UBSF NOVA SERTÂNIA'}},
    {id:'1',name:'ADRIANA',job_title:'RECEPCIONISTA',employment_status:'BCC',unit_id:'u2',active:false,unit:{name:'CENTRO'}}
  ];
  assert.deepEqual(filterEmployees(employees,{query:'tecnica',unitId:'u1',status:'active'}).map(e=>e.id),['2']);
  assert.deepEqual(filterEmployees(employees,{status:'all'}).map(e=>e.id),['2','1']);
  assert.deepEqual(sortEmployees(employees).map(e=>e.name),['ADRIANA','MÉRCIA']);
});
