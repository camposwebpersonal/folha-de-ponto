import {safeFilename} from './model.js';
import {buildTimeOffPrintPlan} from './time-off-model.js';

const C={black:rgb(.055,.145,.165),white:rgb(1,1,1),deep:rgb(.025,.255,.22),teal:rgb(.02,.47,.39),muted:rgb(.36,.46,.48),grid:rgb(.54,.64,.65),soft:rgb(.95,.975,.97),softGreen:rgb(.87,.94,.92),zebra:rgb(.982,.988,.987)};
function rgb(r,g,b){return window.PDFLib.rgb(r,g,b);}
async function logoBytes(){const response=await fetch('assets/logo-sertania.png');if(!response.ok)throw new Error('Não foi possível carregar o brasão.');return response.arrayBuffer();}
function fitText(font,text,maxWidth,start=9,min=5.5){let size=start;while(size>min&&font.widthOfTextAtSize(String(text||''),size)>maxWidth)size-=.25;return size;}
function drawCell(page,{x,y,w,h,text='',font,size=8,bold=false,fill=C.white,align='center',color=C.black,padding=4}){
 page.drawRectangle({x,y,width:w,height:h,color:fill,borderColor:C.grid,borderWidth:.45});
 if(!text)return;const used=bold?font.bold:font.regular,fontSize=fitText(used,text,w-padding*2,size);const width=used.widthOfTextAtSize(String(text),fontSize);const tx=align==='left'?x+padding:align==='right'?x+w-padding-width:x+(w-width)/2;
 page.drawText(String(text),{x:tx,y:y+(h-fontSize)/2+1,size:fontSize,font:used,color});
}
function wrapLines(text,font,size,maxWidth,maxLines=7){const words=String(text||'').split(/\s+/).filter(Boolean),lines=[];let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(next,size)>maxWidth&&line){lines.push(line);line=word;if(lines.length===maxLines-1)break;}else line=next;}if(line&&lines.length<maxLines)lines.push(line);return lines;}
function drawInfo(page,{x,y,w,h,label,value,font}){page.drawRectangle({x,y,width:w,height:h,color:C.white,borderColor:C.grid,borderWidth:.45});page.drawText(label,{x:x+7,y:y+h-9,size:5.5,font:font.bold,color:C.teal});const text=String(value||'');page.drawText(text,{x:x+7,y:y+6,size:fitText(font.bold,text,w-14,8.5),font:font.bold,color:C.black});}
function drawPage(page,item,font,logo,index,total){
 const W=page.getWidth(),m=27.5,x=m,w=W-m*2,headerY=756;
 page.drawRectangle({x,y:headerY,width:w,height:58,color:C.deep});page.drawRectangle({x:x+10,y:headerY+8,width:76,height:42,color:C.white});page.drawImage(logo,{x:x+18,y:headerY+10,width:60,height:38});
 page.drawText('CONTROLE DE SALDO',{x:x+101,y:headerY+32,size:14.5,font:font.bold,color:C.white});page.drawText('DE DIAS DE FOLGA',{x:x+101,y:headerY+17,size:9,font:font.bold,color:C.softGreen});
 const badgeX=x+w-151;page.drawRectangle({x:badgeX,y:headerY+9,width:139,height:40,color:C.white});page.drawText('SALDO REGISTRADO',{x:badgeX+10,y:headerY+35,size:5.8,font:font.bold,color:C.muted});page.drawText(`${item.balanceDays} DIA${item.balanceDays===1?'':'S'}`,{x:badgeX+10,y:headerY+16,size:11,font:font.bold,color:C.deep});
 let y=728;drawInfo(page,{x,y,w:245,h:22,label:'SECRETARIA',value:item.employee.unit?.secretariat||'SECRETARIA DE SAÚDE',font});drawInfo(page,{x:x+245,y,w:w-245,h:22,label:'UNIDADE / SETOR',value:item.employee.unit?.name||'SEM SETOR',font});
 y=691;drawInfo(page,{x,y,w:70,h:32,label:'MATRÍCULA',value:item.employee.registration||'',font});drawInfo(page,{x:x+70,y,w:275,h:32,label:'COLABORADOR(A)',value:item.employee.name,font});drawInfo(page,{x:x+345,y,w:w-345,h:32,label:'CARGO / FUNÇÃO',value:item.employee.job_title||'',font});
 y=623;page.drawRectangle({x,y,width:w,height:58,color:C.white,borderColor:C.grid,borderWidth:.45});page.drawRectangle({x,y:y+44,width:w,height:14,color:C.softGreen});page.drawText('JUSTIFICATIVA / OBSERVAÇÃO DO SALDO',{x:x+8,y:y+48,size:6.5,font:font.bold,color:C.deep});const lines=wrapLines(item.observation||'Sem observação informada.',font.regular,8,w-16,4);lines.forEach((line,i)=>page.drawText(line,{x:x+8,y:y+31-i*9,size:8,font:font.regular,color:C.black}));
 y=611;const cols=[32,98,112,w-242];['Nº','DATA','DIA DA SEMANA','OBSERVAÇÃO'].forEach((label,i)=>{const cx=x+cols.slice(0,i).reduce((sum,value)=>sum+value,0);drawCell(page,{x:cx,y:y-25,w:cols[i],h:25,text:label,font,size:7,bold:true,fill:C.deep,color:C.white});});y-=25;
 const rowH=19;for(let day=item.start;day<=item.end;day+=1){let cx=x;const values=[String(day),'____/____/________','________________',''];cols.forEach((cw,i)=>{drawCell(page,{x:cx,y:y-rowH,w:cw,h:rowH,text:values[i],font,size:i===0?7.5:7,bold:i===0,fill:(day-item.start)%2?C.zebra:C.white,align:i===3?'left':'center'});cx+=cw;});y-=rowH;}
 const signY=63;page.drawLine({start:{x:x+18,y:signY+20},end:{x:x+w/2-18,y:signY+20},thickness:.55,color:C.grid});page.drawLine({start:{x:x+w/2+18,y:signY+20},end:{x:x+w-18,y:signY+20},thickness:.55,color:C.grid});page.drawText('ASSINATURA DO(A) COLABORADOR(A)',{x:x+43,y:signY+8,size:6.2,font:font.bold,color:C.muted});page.drawText('ASSINATURA DO(A) RESPONSÁVEL',{x:x+w/2+60,y:signY+8,size:6.2,font:font.bold,color:C.muted});
 page.drawText(`VIA ${item.copy} DE ${item.copies}  •  FOLHA ${item.page}  •  ITENS ${item.start}–${item.end}`,{x,y:22,size:5.8,font:font.bold,color:C.muted});const pageLabel=`PÁGINA ${index+1} DE ${total}`,pw=font.bold.widthOfTextAtSize(pageLabel,5.8);page.drawText(pageLabel,{x:x+w-pw,y:22,size:5.8,font:font.bold,color:C.muted});
}

export async function generateTimeOffPdf(entries){
 const plan=buildTimeOffPrintPlan(entries);if(!plan.length)throw new Error('Selecione ao menos um colaborador com saldo maior que zero.');
 const {PDFDocument,StandardFonts}=window.PDFLib||{};if(!PDFDocument)throw new Error('Gerador de PDF ainda não carregou. Atualize a página.');
 const doc=await PDFDocument.create();doc.setTitle('Controle de saldo de dias de folga');doc.setAuthor('Prefeitura Municipal de Sertânia');doc.setCreator('Portal UBSF Nova Sertânia');
 const [regular,bold,bytes]=await Promise.all([doc.embedFont(StandardFonts.Helvetica),doc.embedFont(StandardFonts.HelveticaBold),logoBytes()]);const logo=await doc.embedPng(bytes),font={regular,bold};plan.forEach((item,index)=>drawPage(doc.addPage([595.28,841.89]),item,font,logo,index,plan.length));
 const pdfBytes=await doc.save(),blob=new Blob([pdfBytes],{type:'application/pdf'}),employees=[...new Set(entries.map(entry=>entry.employee.name))];const stem=employees.length===1?safeFilename(employees[0]).toUpperCase():'SELECIONADOS';
 return {blob,filename:`SALDO-DE-FOLGAS-${stem}.pdf`,pages:plan.length,copies:plan.filter((item,index,array)=>index===array.findIndex(other=>other.employee.id===item.employee.id&&other.copy===item.copy)).length};
}
