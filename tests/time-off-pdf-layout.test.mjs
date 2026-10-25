import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../js/time-off-pdf.js',import.meta.url),'utf8');

test('separa verticalmente rótulo e valor nos campos compactos',()=>{
 assert.match(source,/compact=h<=20/);
 assert.match(source,/valueY=y\+\(compact\?2\.5:5\.5\)/);
 assert.match(source,/y:y\+h-7/);
});

test('aproveita o rodapé para oferecer linhas manuscritas mais altas',()=>{
 const rowHeight=Number(source.match(/const rowH=([\d.]+)/)?.[1]);
 const signatureY=Number(source.match(/const signY=([\d.]+)/)?.[1]);
 assert.ok(rowHeight>=17,'as linhas precisam ter pelo menos 17 pontos de altura');
 assert.ok(signatureY<=47,'as assinaturas devem aproveitar a faixa inferior da página');
 assert.match(source,/\{x,y:14,size:5\.8/);
});
