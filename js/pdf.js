import {formatDate,monthDays,referenceLabel,safeFilename} from './model.js';

const C={black:rgb(0,0,0),header:rgb(.816,.878,.89),saturday:rgb(.812,.886,.953),sunday:rgb(.851,.824,.914),blue:rgb(.11,.271,.529),wine:rgb(.298,.067,.188)};
function rgb(r,g,b){return window.PDFLib.rgb(r,g,b);}
function drawCell(page,{x,y,w,h,text='',font,size=8,bold=false,fill=null,align='center',color=C.black,borders=true,padding=2}){
 if(fill)page.drawRectangle({x,y,width:w,height:h,color:fill});
 if(borders)page.drawRectangle({x,y,width:w,height:h,borderColor:C.black,borderWidth:.55});
 if(!text)return;
 const used=bold?font.bold:font.regular;let fontSize=size;const lines=String(text).split('\n');
 while(fontSize>5&&Math.max(...lines.map(line=>used.widthOfTextAtSize(line,fontSize)))>w-padding*2)fontSize-=.25;
 const lineHeight=fontSize+1,totalHeight=lines.length*lineHeight-1;
 lines.forEach((label,index)=>{const textWidth=used.widthOfTextAtSize(label,fontSize);const tx=align==='left'?x+padding:align==='right'?x+w-padding-textWidth:x+(w-textWidth)/2;page.drawText(label,{x:tx,y:y+(h-totalHeight)/2+(lines.length-index-1)*lineHeight+1,size:fontSize,font:used,color});});
}
function drawMerged(page,args){drawCell(page,args);}
async function logoBytes(){const response=await fetch('assets/logo-sertania.png');if(!response.ok)throw new Error('Não foi possível carregar o brasão.');return response.arrayBuffer();}
function wrapObservations(page,text,font,x,y,w,h){
 const size=7,max=w-8,words=String(text||'').split(/\s+/).filter(Boolean);let line='',lines=[];
 for(const word of words){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)>max){lines.push(line);line=word}else line=next;}if(line)lines.push(line);
 lines.slice(0,5).forEach((value,i)=>page.drawText(value,{x:x+4,y:y+h-18-i*9,size,font,color:C.black}));
}
function drawPage(doc,page,employee,year,month,font,logo){
 const W=page.getWidth(),m=27.5,x=m,w=W-m*2;let y=814;
 drawCell(page,{x,y:y-44,w:274,h:44});page.drawImage(logo,{x:x+105,y:y-40,width:64,height:40});
 drawMerged(page,{x:x+274,y:y-44,w:96,h:44,text:'FOLHA\nINDIVIDUAL DE\nFREQUÊNCIA',font,size:11,bold:true});
 drawCell(page,{x:x+370,y:y-15,w:w-370,h:15,text:'Mês/Ano',font,size:8,bold:true,fill:C.header});
 drawCell(page,{x:x+370,y:y-44,w:w-370,h:29,text:referenceLabel(year,month),font,size:12,bold:true});
 y-=44;
 drawCell(page,{x,y:y-16,w:274,h:16,text:employee.unit?.secretariat||'SECRETARIA DE SAÚDE',font,size:11,bold:true});
 drawCell(page,{x:x+274,y:y-16,w:48,h:16,text:'SETOR:',font,size:7,bold:true,fill:C.header});
 drawCell(page,{x:x+322,y:y-16,w:w-322,h:16,text:employee.unit?.name||'SEM SETOR',font,size:10,bold:true});
 y-=16;
 drawCell(page,{x,y:y-16,w:60,h:16,text:'SITUAÇÃO:',font,size:9,bold:true,align:'left'});
 drawCell(page,{x:x+60,y:y-16,w:w-60,h:16,text:employee.employment_status||'',font,size:10,bold:true,align:'left'});
 y-=16;
 const widths=[60,310,w-370];
 ['MATRÍCULA','NOME DO FUNCIONÁRIO','CARGO'].forEach((label,i)=>drawCell(page,{x:x+widths.slice(0,i).reduce((a,b)=>a+b,0),y:y-13,w:widths[i],h:13,text:label,font,size:7,bold:true,fill:C.header}));
 y-=13;
 [employee.registration||'',employee.name,employee.job_title||''].forEach((value,i)=>drawCell(page,{x:x+widths.slice(0,i).reduce((a,b)=>a+b,0),y:y-17,w:widths[i],h:17,text:value,font,size:9,bold:true}));
 y-=27;
 const cols=[60,48,48,119,48,48,121,w-492];
 drawCell(page,{x,y:y-26,w:cols[0],h:26,text:'DATA',font,size:8,bold:true,fill:C.header});
 drawCell(page,{x:x+60,y:y-26,w:cols[1],h:26,text:'DIA/SEM',font,size:8,bold:true,fill:C.header});
 drawCell(page,{x:x+108,y:y-13,w:215,h:13,text:'MANHÃ',font,size:10,bold:true,fill:C.header,color:C.blue});
 drawCell(page,{x:x+323,y:y-13,w:w-323,h:13,text:'TARDE',font,size:10,bold:true,fill:C.header,color:C.wine});
 let cx=x+108;['ENTRADA','RUBRICA','SAÍDA','ENTRADA','RUBRICA','SAÍDA'].forEach((label,i)=>{const cw=cols[i+2];drawCell(page,{x:cx,y:y-26,w:cw,h:13,text:label,font,size:7,bold:true,fill:C.header});cx+=cw;});
 y-=26;
 const days=monthDays(year,month),rowH=18.05;
 days.forEach(day=>{
  const fill=day?.weekend==='saturday'?C.saturday:day?.weekend==='sunday'?C.sunday:null;cx=x;
  const values=[day?formatDate(day.day,month,year):'',day?.weekday||'','','','','','',''];
  cols.forEach((cw,i)=>{drawCell(page,{x:cx,y:y-rowH,w:cw,h:rowH,text:values[i],font,size:i<2?8:7,bold:i<2,fill});cx+=cw;});y-=rowH;
 });
 y-=8;drawCell(page,{x,y:y-57,w,h:57,text:'',font});page.drawText('OBSERVAÇÕES:',{x:x+2,y:y-11,size:7.5,font:font.bold,color:C.black});wrapObservations(page,employee.observations,font.bold,x,y-57,w,57);
}
export async function generateAttendancePdf(employees,{year,month}){
 if(!employees.length)throw new Error('Selecione ao menos um colaborador.');
 const {PDFDocument,StandardFonts}=window.PDFLib||{};if(!PDFDocument)throw new Error('Gerador de PDF ainda não carregou. Atualize a página.');
 const doc=await PDFDocument.create();doc.setTitle(`Folha de ponto - ${referenceLabel(year,month)}`);doc.setAuthor('Prefeitura Municipal de Sertânia');doc.setCreator('Sistema Folha de Ponto');
 const [regular,bold,bytes]=await Promise.all([doc.embedFont(StandardFonts.Helvetica),doc.embedFont(StandardFonts.HelveticaBold),logoBytes()]);const logo=await doc.embedPng(bytes);const font={regular,bold};
 employees.forEach(employee=>drawPage(doc,doc.addPage([595.28,841.89]),employee,year,month,font,logo));
 const pdfBytes=await doc.save();const blob=new Blob([pdfBytes],{type:'application/pdf'});
 const filename=employees.length===1?`FOLHA-DE-PONTO-${safeFilename(employees[0].name).toUpperCase()}-${String(month).padStart(2,'0')}-${year}.pdf`:`FOLHA-DE-PONTO-UNIFICADA-${String(month).padStart(2,'0')}-${year}.pdf`;
 return {blob,filename,pages:employees.length};
}
