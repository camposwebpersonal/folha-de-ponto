export const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const WEEKDAYS=['DOM.','SEG.','TER.','QUA.','QUI.','SEX.','SÁB.'];

export function normalizeText(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}
export function monthDays(year,month){
 const total=new Date(year,month,0).getDate();
 return Array.from({length:31},(_,index)=>{
  const day=index+1;if(day>total)return null;
  const date=new Date(year,month-1,day,12);
  return {day,date,weekday:WEEKDAYS[date.getDay()],weekend:date.getDay()===0?'sunday':date.getDay()===6?'saturday':''};
 });
}
export function referenceLabel(year,month){return `${MONTHS[month-1].toUpperCase()}-${year}`;}
export function formatDate(day,month,year){return [day,month,year].map((n,i)=>i===2?String(n):String(n).padStart(2,'0')).join('/');}
export function filterEmployees(employees,{query='',unitId='',status='active'}={}){
 const q=normalizeText(query);
 return employees.filter(e=>(!unitId||e.unit_id===unitId)&&(status==='all'||(status==='active')===e.active)&&(!q||normalizeText([e.name,e.registration,e.job_title,e.employment_status,e.unit?.name].join(' ')).includes(q)));
}
export function sortEmployees(employees){return [...employees].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));}
export function safeFilename(value){return normalizeText(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

