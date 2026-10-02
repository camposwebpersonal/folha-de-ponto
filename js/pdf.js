import {formatDate,monthDays,referenceLabel,safeFilename} from './model.js';

const C={
 black:rgb(.055,.145,.165),white:rgb(1,1,1),deep:rgb(.025,.255,.22),teal:rgb(.02,.47,.39),blue:rgb(.12,.33,.48),
 muted:rgb(.36,.46,.48),grid:rgb(.54,.64,.65),soft:rgb(.95,.975,.97),softGreen:rgb(.87,.94,.92),softBlue:rgb(.88,.93,.96),
 saturday:rgb(.86,.925,.965),sunday:rgb(.925,.89,.95),zebra:rgb(.982,.988,.987)
};
function rgb(r,g,b){return window.PDFLib.rgb(r,g,b);}
function drawCell(page,{x,y,w,h,text='',font,size=8,bold=false,fill=null,align='center',color=C.black,borders=true,padding=2,borderColor=C.grid,borderWidth=.45}){
 if(fill)page.drawRectangle({x,y,width:w,height:h,color:fill});
 if(borders)page.drawRectangle({x,y,width:w,height:h,borderColor,borderWidth});
 if(!text)return;
 const used=bold?font.bold:font.regular;let fontSize=size;const lines=String(text).split('\n');
 while(fontSize>5&&Math.max(...lines.map(line=>used.widthOfTextAtSize(line,fontSize)))>w-padding*2)fontSize-=.25;
 const lineHeight=fontSize+1,totalHeight=lines.length*lineHeight-1;
 lines.forEach((label,index)=>{const textWidth=used.widthOfTextAtSize(label,fontSize);const tx=align==='left'?x+padding:align==='right'?x+w-padding-textWidth:x+(w-textWidth)/2;page.drawText(label,{x:tx,y:y+(h-totalHeight)/2+(lines.length-index-1)*lineHeight+1,size:fontSize,font:used,color});});
}
async function logoBytes(){const response=await fetch('assets/logo-sertania.png');if(!response.ok)throw new Error('Não foi possível carregar o brasão.');return response.arrayBuffer();}
function drawInfo(page,{x,y,w,h,label,value,font,fill=C.soft}){
 page.drawRectangle({x,y,width:w,height:h,color:fill,borderColor:C.grid,borderWidth:.45});
 page.drawText(label,{x:x+7,y:y+h-9,size:5.5,font:font.bold,color:C.teal});
 const text=String(value||'');let size=8.5;while(size>5.5&&font.bold.widthOfTextAtSize(text,size)>w-14)size-=.25;
 page.drawText(text,{x:x+7,y:y+6,size,font:font.bold,color:C.black});
}
function wrapObservations(page,text,font,x,y,w,h){
 const size=7,max=w-8,words=String(text||'').split(/\s+/).filter(Boolean);let line='',lines=[];
 for(const word of words){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)>max){lines.push(line);line=word}else line=next;}if(line)lines.push(line);
 lines.slice(0,4).forEach((value,i)=>page.drawText(value,{x:x+8,y:y+h-22-i*9,size,font,color:C.black}));
}
function drawPage(page,employee,year,month,font,logo,index,total){
 const W=page.getWidth(),m=27.5,x=m,w=W-m*2;
 const headerY=756;
 page.drawRectangle({x,y:headerY,width:w,height:58,color:C.deep});
 page.drawRectangle({x:x+10,y:headerY+8,width:76,height:42,color:C.white});
 page.drawImage(logo,{x:x+18,y:headerY+10,width:60,height:38});
 page.drawText('FOLHA INDIVIDUAL',{x:x+101,y:headerY+32,size:14.5,font:font.bold,color:C.white});
 page.drawText('DE FREQUÊNCIA',{x:x+101,y:headerY+17,size:9,font:font.bold,color:C.softGreen});
 const badgeX=x+w-146;
 page.drawRectangle({x:badgeX,y:headerY+9,width:134,height:40,color:C.white});
 page.drawText('COMPETÊNCIA',{x:badgeX+10,y:headerY+35,size:5.8,font:font.bold,color:C.muted});
 page.drawText(referenceLabel(year,month),{x:badgeX+10,y:headerY+16,size:11,font:font.bold,color:C.deep});

 let y=728;
 drawInfo(page,{x,y,w:245,h:22,label:'SECRETARIA',value:employee.unit?.secretariat||'SECRETARIA DE SAÚDE',font});
 drawInfo(page,{x:x+245,y,w:w-245,h:22,label:'UNIDADE / SETOR',value:employee.unit?.name||'SEM SETOR',font});
 y=691;const infoWidths=[63,264,125,w-452],labels=['MATRÍCULA','COLABORADOR(A)','CARGO / FUNÇÃO','SITUAÇÃO'],values=[employee.registration||'',employee.name,employee.job_title||'',employee.employment_status||''];let infoX=x;
 infoWidths.forEach((width,i)=>{drawInfo(page,{x:infoX,y,w:width,h:32,label:labels[i],value:values[i],font,fill:C.white});infoX+=width;});

 y=683;
 const cols=[60,48,48,119,48,48,121,w-492];
 drawCell(page,{x,y:y-28,w:cols[0],h:28,text:'DATA',font,size:7.5,bold:true,fill:C.deep,color:C.white,borderColor:C.white});
 drawCell(page,{x:x+60,y:y-28,w:cols[1],h:28,text:'DIA',font,size:7.5,bold:true,fill:C.deep,color:C.white,borderColor:C.white});
 drawCell(page,{x:x+108,y:y-14,w:215,h:14,text:'MANHÃ',font,size:8.5,bold:true,fill:C.teal,color:C.white,borderColor:C.white});
 drawCell(page,{x:x+323,y:y-14,w:w-323,h:14,text:'TARDE',font,size:8.5,bold:true,fill:C.blue,color:C.white,borderColor:C.white});
 let cx=x+108;['ENTRADA','RUBRICA','SAÍDA','ENTRADA','RUBRICA','SAÍDA'].forEach((label,i)=>{const cw=cols[i+2],morning=i<3;drawCell(page,{x:cx,y:y-28,w:cw,h:14,text:label,font,size:6.5,bold:true,fill:morning?C.softGreen:C.softBlue,borderColor:C.white});cx+=cw;});
 y-=28;
 const days=monthDays(year,month),rowH=18;
 days.forEach((day,row)=>{
  const fill=day?.weekend==='saturday'?C.saturday:day?.weekend==='sunday'?C.sunday:row%2?C.zebra:C.white;cx=x;
  const values=[day?formatDate(day.day,month,year):'',day?.weekday||'','','','','','',''];
  cols.forEach((cw,i)=>{drawCell(page,{x:cx,y:y-rowH,w:cw,h:rowH,text:values[i],font,size:i<2?7.5:7,bold:i<2,fill});cx+=cw;});y-=rowH;
 });
 y-=8;const noteY=y-48;page.drawRectangle({x,y:noteY,width:w,height:48,color:C.white,borderColor:C.grid,borderWidth:.55});page.drawRectangle({x,y:noteY+34,width:w,height:14,color:C.softGreen});page.drawText('OBSERVAÇÕES',{x:x+8,y:noteY+38,size:6.5,font:font.bold,color:C.deep});wrapObservations(page,employee.observations,font.regular,x,noteY,w,48);
 page.drawText('Prefeitura Municipal de Sertânia  •  Controle de frequência',{x,y:22,size:5.8,font:font.regular,color:C.muted});
 const pageLabel=`PÁGINA ${index+1} DE ${total}`,pageWidth=font.bold.widthOfTextAtSize(pageLabel,5.8);page.drawText(pageLabel,{x:x+w-pageWidth,y:22,size:5.8,font:font.bold,color:C.muted});
}
export async function generateAttendancePdf(employees,{year,month}){
 if(!employees.length)throw new Error('Selecione ao menos um colaborador.');
 const {PDFDocument,StandardFonts}=window.PDFLib||{};if(!PDFDocument)throw new Error('Gerador de PDF ainda não carregou. Atualize a página.');
 const doc=await PDFDocument.create();doc.setTitle(`Folha de ponto - ${referenceLabel(year,month)}`);doc.setAuthor('Prefeitura Municipal de Sertânia');doc.setCreator('Sistema Folha de Ponto');
 const [regular,bold,bytes]=await Promise.all([doc.embedFont(StandardFonts.Helvetica),doc.embedFont(StandardFonts.HelveticaBold),logoBytes()]);const logo=await doc.embedPng(bytes);const font={regular,bold};
 employees.forEach((employee,index)=>drawPage(doc.addPage([595.28,841.89]),employee,year,month,font,logo,index,employees.length));
 const pdfBytes=await doc.save();const blob=new Blob([pdfBytes],{type:'application/pdf'});
 const filename=employees.length===1?`FOLHA-DE-PONTO-${safeFilename(employees[0].name).toUpperCase()}-${String(month).padStart(2,'0')}-${year}.pdf`:`FOLHA-DE-PONTO-UNIFICADA-${String(month).padStart(2,'0')}-${year}.pdf`;
 return {blob,filename,pages:employees.length};
}
