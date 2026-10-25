export const TIME_OFF_ROWS_PER_PAGE=31;

export function normalizeBalanceDays(value){
 const number=Number(value);
 if(!Number.isInteger(number)||number<0||number>3660)throw new Error('Informe um saldo inteiro entre 0 e 3660 dias.');
 return number;
}

export function normalizeCopies(value){
 const number=Number(value);
 if(!Number.isInteger(number)||number<1||number>50)throw new Error('Informe entre 1 e 50 vias por colaborador.');
 return number;
}

export function timeOffPages(balanceDays,rowsPerPage=TIME_OFF_ROWS_PER_PAGE){
 const days=normalizeBalanceDays(balanceDays);
 if(!days)return [];
 const pages=[];
 for(let start=1;start<=days;start+=rowsPerPage){
  const end=Math.min(days,start+rowsPerPage-1);
  pages.push({start,end,count:end-start+1,page:pages.length+1});
 }
 return pages;
}

export function buildTimeOffPrintPlan(entries,rowsPerPage=TIME_OFF_ROWS_PER_PAGE){
 const plan=[];
 entries.forEach(entry=>{
  const balanceDays=normalizeBalanceDays(entry.balance_days);
  const copies=normalizeCopies(entry.copies);
  if(!balanceDays)return;
  const pages=timeOffPages(balanceDays,rowsPerPage);
  for(let copy=1;copy<=copies;copy+=1){
   pages.forEach(page=>plan.push({...page,copy,copies,balanceDays,employee:entry.employee,observation:String(entry.observation||'').trim()}));
  }
 });
 return plan;
}
