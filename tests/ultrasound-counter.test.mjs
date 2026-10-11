import test from 'node:test';
import assert from 'node:assert/strict';
import {ULTRASOUND_TYPES,changeUltrasoundCount,emptyUltrasoundCounts,normalizeUltrasoundCounts,ultrasoundSpreadsheetRow,ultrasoundTotal} from '../js/ultrasound-counter.js';

test('mantém exatamente as 12 colunas do PDF na ordem da planilha',()=>{
 assert.deepEqual(ULTRASOUND_TYPES.map(type=>type.sheetLabel),['< 5 ANOS','OBSTETRICA','TRANSVAGINAL','PELVICA','MAMA','TIREOIDE','RINS E VIAS URI','ABDOME','PAREDE ABD','PROSTATA','OSSOS E ARTICULAÇÕES','PARTES MOLES']);
});

test('soma e subtrai sem permitir quantidade negativa',()=>{
 let counts=emptyUltrasoundCounts();
 counts=changeUltrasoundCount(counts,'obstetric',1);
 counts=changeUltrasoundCount(counts,'obstetric',1);
 counts=changeUltrasoundCount(counts,'obstetric',-1);
 assert.equal(counts.obstetric,1);
 counts=changeUltrasoundCount(counts,'obstetric',-8);
 assert.equal(counts.obstetric,0);
});

test('copia os 12 valores separados por tabulação e não inclui o total',()=>{
 const counts=normalizeUltrasoundCounts({under_5:2,obstetric:11,transvaginal:32,pelvic:4,breast:6,thyroid:3,urinary:14,abdomen:43,abdominal_wall:4,prostate:0,bones_joints:0,soft_tissues:2});
 assert.equal(ultrasoundSpreadsheetRow(counts),'2\t11\t32\t4\t6\t3\t14\t43\t4\t0\t0\t2');
 assert.equal(ultrasoundTotal(counts),121);
});

test('normaliza dados inválidos antes de salvar ou copiar',()=>{
 const counts=normalizeUltrasoundCounts({under_5:-3,obstetric:'7.9',abdomen:'erro'});
 assert.equal(counts.under_5,0);
 assert.equal(counts.obstetric,7);
 assert.equal(counts.abdomen,0);
});
