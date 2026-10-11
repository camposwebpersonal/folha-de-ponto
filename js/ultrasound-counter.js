export const ULTRASOUND_TYPES=[
 {key:'under_5',label:'< 5 anos',sheetLabel:'< 5 ANOS'},
 {key:'obstetric',label:'Obstétrica',sheetLabel:'OBSTETRICA'},
 {key:'transvaginal',label:'Transvaginal',sheetLabel:'TRANSVAGINAL'},
 {key:'pelvic',label:'Pélvica',sheetLabel:'PELVICA'},
 {key:'breast',label:'Mama',sheetLabel:'MAMA'},
 {key:'thyroid',label:'Tireoide',sheetLabel:'TIREOIDE'},
 {key:'urinary',label:'Rins e vias urinárias',sheetLabel:'RINS E VIAS URI'},
 {key:'abdomen',label:'Abdome',sheetLabel:'ABDOME'},
 {key:'abdominal_wall',label:'Parede abdominal',sheetLabel:'PAREDE ABD'},
 {key:'prostate',label:'Próstata',sheetLabel:'PROSTATA'},
 {key:'bones_joints',label:'Ossos e articulações',sheetLabel:'OSSOS E ARTICULAÇÕES'},
 {key:'soft_tissues',label:'Partes moles',sheetLabel:'PARTES MOLES'}
];

export function emptyUltrasoundCounts(){return Object.fromEntries(ULTRASOUND_TYPES.map(type=>[type.key,0]));}

export function normalizeUltrasoundCounts(value={}){
 const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 return Object.fromEntries(ULTRASOUND_TYPES.map(type=>{
  const number=Number(source[type.key]);
  return [type.key,Number.isFinite(number)?Math.max(0,Math.trunc(number)):0];
 }));
}

export function changeUltrasoundCount(counts,key,delta){
 if(!ULTRASOUND_TYPES.some(type=>type.key===key))return normalizeUltrasoundCounts(counts);
 const next=normalizeUltrasoundCounts(counts);
 next[key]=Math.max(0,next[key]+Math.trunc(Number(delta)||0));
 return next;
}

export function ultrasoundTotal(counts){const normalized=normalizeUltrasoundCounts(counts);return ULTRASOUND_TYPES.reduce((sum,type)=>sum+normalized[type.key],0);}

// Copia apenas as 12 categorias. A coluna TOTAL da planilha pode continuar com sua fórmula.
export function ultrasoundSpreadsheetRow(counts){const normalized=normalizeUltrasoundCounts(counts);return ULTRASOUND_TYPES.map(type=>normalized[type.key]).join('\t');}
