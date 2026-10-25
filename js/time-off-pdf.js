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
function drawPage(page,item,font,logo,index,total,responsible){
 const W=page.getWidth(),m=27.5,x=m,w=W-m*2,headerY=767;
 page.drawRectangle({x,y:headerY,width:w,height:47,color:C.deep});page.drawRectangle({x:x+9,y:headerY+6,width:68,height:35,color:C.white});page.drawImage(logo,{x:x+16,y:headerY+7,width:54,height:33});
 page.drawText('CONTROLE DE SALDO',{x:x+91,y:headerY+26,size:13.5,font:font.bold,color:C.white});page.drawText('DE DIAS DE FOLGA',{x:x+91,y:headerY+12,size:8.5,font:font.bold,color:C.softGreen});
 const badgeX=x+w-145;page.drawRectangle({x:badgeX,y:headerY+6,width:134,height:35,color:C.white});page.drawText('SALDO REGISTRADO',{x:badgeX+9,y:headerY+29,size:5.5,font:font.bold,color:C.muted});page.drawText(`${item.balanceDays} DIA${item.balanceDays===1?'':'S'}`,{x:badgeX+9,y:headerY+11,size:10.5,font:font.bold,color:C.deep});
 let y=741;drawInfo(page,{x,y,w:245,h:20,label:'SECRETARIA',value:item.employee.unit?.secretariat||'SECRETARIA DE SAÚDE',font});drawInfo(page,{x:x+245,y,w:w-245,h:20,label:'UNIDADE / SETOR',value:item.employee.unit?.name||'SEM SETOR',font});
 y=708;const infoWidths=[62,210,108,w-380],infoLabels=['MATRÍCULA','COLABORADOR(A)','CARGO / FUNÇÃO','RESPONSÁVEL'],infoValues=[item.employee.registration||'',item.employee.name,item.employee.job_title||'',responsible?.name||''];let infoX=x;infoWidths.forEach((width,i)=>{drawInfo(page,{x:infoX,y,w:width,h:28,label:infoLabels[i],value:infoValues[i],font});infoX+=width;});
 y=654;page.drawRectangle({x,y,width:w,height:45,color:C.white,borderColor:C.grid,borderWidth:.45});page.drawRectangle({x,y:y+32,width:w,height:13,color:C.softGreen});page.drawText('JUSTIFICATIVA / OBSERVAÇÃO DO SALDO',{x:x+7,y:y+36,size:6.2,font:font.bold,color:C.deep});const lines=wrapLines(item.observation||'Sem observação informada.',font.regular,7.5,w-14,3);lines.forEach((line,i)=>page.drawText(line,{x:x+7,y:y+21-i*8,size:7.5,font:font.regular,color:C.black}));
 y=646;const cols=[30,96,108,w-234];['Nº','DATA','DIA DA SEMANA','OBSERVAÇÃO'].forEach((label,i)=>{const cx=x+cols.slice(0,i).reduce((sum,value)=>sum+value,0);drawCell(page,{x:cx,y:y-21,w:cols[i],h:21,text:label,font,size:7,bold:true,fill:C.deep,color:C.white});});y-=21;
 const rowH=15.5;for(let day=item.start;day<=item.end;day+=1){let cx=x;const values=[String(day),'____/____/________','________________',''];cols.forEach((cw,i)=>{drawCell(page,{x:cx,y:y-rowH,w:cw,h:rowH,text:values[i],font,size:i===0?7.2:6.8,bold:i===0,fill:(day-item.start)%2?C.zebra:C.white,align:i===3?'left':'center'});cx+=cw;});y-=rowH;}
 const signY=66;page.drawLine({start:{x:x+18,y:signY+17},end:{x:x+w/2-18,y:signY+17},thickness:.55,color:C.grid});page.drawLine({start:{x:x+w/2+18,y:signY+17},end:{x:x+w-18,y:signY+17},thickness:.55,color:C.grid});page.drawText('ASSINATURA DO(A) COLABORADOR(A)',{x:x+43,y:signY+6,size:6.2,font:font.bold,color:C.muted});page.drawText('ASSINATURA DO(A) RESPONSÁVEL',{x:x+w/2+60,y:signY+6,size:6.2,font:font.bold,color:C.muted});
 page.drawText(`VIA ${item.copy} DE ${item.copies}  •  FOLHA ${item.page}  •  ITENS ${item.start}–${item.end}`,{x,y:24,size:5.8,font:font.bold,color:C.muted});const pageLabel=`PÁGINA ${index+1} DE ${total}`,pw=font.bold.widthOfTextAtSize(pageLabel,5.8);page.drawText(pageLabel,{x:x+w-pw,y:24,size:5.8,font:font.bold,color:C.muted});
}

export async function generateTimeOffPdf(entries,{responsible=null}={}){
 const plan=buildTimeOffPrintPlan(entries);if(!plan.length)throw new Error('Selecione ao menos um colaborador com saldo maior que zero.');
 const {PDFDocument,StandardFonts}=window.PDFLib||{};if(!PDFDocument)throw new Error('Gerador de PDF ainda não carregou. Atualize a página.');
 const doc=await PDFDocument.create();doc.setTitle('Controle de saldo de dias de folga');doc.setAuthor('Prefeitura Municipal de Sertânia');doc.setCreator('Portal UBSF Nova Sertânia');
 const [regular,bold,bytes]=await Promise.all([doc.embedFont(StandardFonts.Helvetica),doc.embedFont(StandardFonts.HelveticaBold),logoBytes()]);const logo=await doc.embedPng(bytes),font={regular,bold};plan.forEach((item,index)=>drawPage(doc.addPage([595.28,841.89]),item,font,logo,index,plan.length,responsible));
 const pdfBytes=await doc.save(),blob=new Blob([pdfBytes],{type:'application/pdf'}),employees=[...new Set(entries.map(entry=>entry.employee.name))];const stem=employees.length===1?safeFilename(employees[0]).toUpperCase():'SELECIONADOS';
 return {blob,filename:`SALDO-DE-FOLGAS-${stem}.pdf`,pages:plan.length,copies:plan.filter((item,index,array)=>index===array.findIndex(other=>other.employee.id===item.employee.id&&other.copy===item.copy)).length};
}
