// 世界模型、文档、语音、安全和机柜等专用信息结构；只绘制本期传入的数据。
export const sectorLayouts=['world','sparse','dualscope','ocrpipeline','modalities','cyberbudget','imageedit','longdoc','speech','observability','clinical','leaderboard','mergegate','sales','rack','partnership','memory'];
export function drawSector(v,time,h,p,c){
 const {T,B,line,circle,A,C,sheet,progress,x0,y0}=h,{foreground:fg,muted,accent:acc,surface,line:rule}=p,L=[...v.labels,...Array(6).fill('')];
 switch(v.layout){
 case 'world':
  B(10,70,710,330,surface,10);for(let j=0;j<7;j++){line(360,150,30+j*110,390,rule);line(20,215+j*27,710,215+j*27,rule)}
  B(140+Math.sin(time*.5)*30,200,70,110,acc,3);circle(555,150,35,acc);T(L[0],35,120,29);T(L[1],35,465,30);T(L[2],35,525,27,muted);T(v.value,420,465,44,acc,600,290);break;
 case 'sparse':
  for(let i=0;i<28;i++){const x=20+i%7*95,y=95+Math.floor(i/7)*82;B(x,y,70,55,i%9===0?acc:rule,3)}
  T(L[0],15,475,29);T(v.values?.[0]||v.value,15,550,60,fg,600,320);T(L[1],390,475,29);T(v.values?.[1]||v.value,390,550,60,acc,600,320);break;
 case 'dualscope':
  B(10,80,315,350);B(385,80,315,350);T(L[0],35,140,39,acc,600,265);T(L[1],410,140,39,fg,600,265);
  for(let j=0;j<3;j++){B(55+j*74,220,52,105,rule,3)}B(465,225,150,100,acc,5);T(L[2],35,480,28);T(L[3],400,480,28,muted,500,300);T(v.value,35,555,36,fg,600,650);break;
 case 'ocrpipeline':
  sheet(0,80,200,270);T(L[0],25,130,29);A(225,220,300,220);B(320,140,180,160);C(L[1],410,230,29,acc,160);A(520,220,580,220);circle(660,220,58);C(L[2],660,230,24,fg,100);T(v.value,15,470,52,acc,600,690);T(L[3],15,535,27,muted);break;
 case 'modalities':
  const positions=[[70,120],[285,120],[500,120],[70,310],[285,310],[500,310]];
  positions.forEach(([x,y],i)=>{B(x,y,180,125);for(let j=0;j<5;j++)line(x+28+j*24,y+35,x+28+j*24,y+55+Math.sin(i+j)*16,acc,3);T(L[i],x+18,y+95,26,fg,600,145)});
  T(v.value,55,540,45,acc,600,660);break;
 case 'cyberbudget':
  const nums=v.numbers||[100,82],scale=560/Math.max(...nums);
  L.slice(0,2).forEach((s,i)=>{const y=120+i*190;T(s,15,y,29);B(15,y+35,nums[i]*scale*progress,52,i?acc:rule,3);T(v.values?.[i]||String(nums[i]),590,y+75,35,fg,600,140)});T(L[2],15,525,29,acc);T(L[3],15,575,24,muted);break;
 case 'imageedit':
  B(5,90,330,285);B(390,90,330,285);for(const x of [5,390]){line(x+20,340,x+150,160,rule,3);line(x+150,160,x+305,340,rule,3)}circle(260,160,30,muted);circle(645,160,42,acc,true);line(360,60,360,400,acc,3);T(L[0],20,440,30);T(L[1],410,440,30,acc);T(v.value,20,525,49,acc,600,690);T(L[2],20,580,26,muted);break;
 case 'longdoc':
  for(let i=3;i>=0;i--){const x=70+i*35,y=65+i*42;sheet(x,y,420,340);T(L[i],x+22,y+45,25,fg,600,360)}
  line(625,80,625,470,rule,5);B(610,90+progress*250,30,100,acc,6);T(v.value,40,565,53,acc,600,670);break;
 case 'speech':
  for(let i=0;i<36;i++){const height=25+Math.abs(Math.sin(i*.65+time*2))*100;B(12+i*20,180-height/2,10,height,acc,4)}
  T(L[0],15,320,29);T(v.values?.[0]||v.value,15,385,58,fg,600,220);T(L[1],280,320,29);T(v.values?.[1]||v.value,280,385,58,acc,600,220);T(L[2],15,495,29);T(L[3],15,555,25,muted);break;
 case 'observability':
  const pts=[[30,180],[210,120],[390,270],[570,180],[700,320]];pts.forEach(([x,y],i)=>{if(i)line(...pts[i-1],x,y,rule,3);circle(x,y,12,i===2?acc:fg,true);line(x,y+25,x,420,rule)});
  T(L[0],15,90,29,acc);T(L[1],15,485,29);T(L[2],385,485,29);T(L[3],15,555,26,muted);break;
 case 'clinical':
  const stages=L.slice(0,3);stages.forEach((s,i)=>{const x=10+i*245;circle(x+95,190,60,i===2?rule:acc);C(s,x+95,200,25,fg,110);if(i<2)A(x+170,190,x+215,190)});
  line(530,80,530,325,acc,3);T(v.value,15,425,61,acc,600,680);T(L[3],15,500,28);T(v.footer||'',15,560,25,muted);break;
 case 'leaderboard':
  (v.entries||L.slice(0,4).map((label,i)=>({label,value:60-i*10}))).forEach(({label,value},i)=>{const y=70+i*77;T(label,0,y,25,fg,500,450);B(0,y+15,value/60*550*progress,15,i===0?acc:rule,2);T(String(value),610,y+20,31,i===0?acc:fg,600,120)});
  T(L[0],0,590,24,muted);break;
 case 'mergegate':
  sheet(10,70,265,270);T(v.value,30,145,53,acc,600,220);A(300,200,420,200);line(470,65,470,355,acc,4);B(530,135,185,125);C(L[0],622,210,27,fg,160);T(L[1],15,445,29);T(L[2],15,505,29,acc);T(L[3],15,565,25,muted);break;
 case 'sales':
  L.slice(0,3).forEach((s,i)=>{const x=15+i*245;T(s,x,90,29,fg,600,215);line(x,115,x+205,115,rule);for(let j=0;j<3;j++){B(x,155+j*75,205,52);line(x+15,180+j*75,x+150,180+j*75,j===0?acc:rule,3)}});
  const cursor=(time*.13)%1;circle(30+cursor*660,430,10,acc,true);T(L[3],15,525,29,muted);break;
 case 'rack':
  for(let j=0;j<3;j++){B(20+j*230,85,195,350);for(let i=0;i<8;i++)B(40+j*230,110+i*37,155,22,i%4===0?acc:rule,2)}
  T(L[0],15,495,31);T(v.value,15,570,53,acc,600,680);T(L[1],410,495,27,fg,500,300);break;
 case 'partnership':
  B(260,200,200,110,fg);C(L[0],360,266,32,p.background,170);A(60,115,240,230);A(660,115,480,230);T(L[1],10,90,35,acc,600,310);T(L[2],440,90,35,acc,600,290);
  line(95,375,630,375,rule);T(v.value,45,460,49,fg,600,660);T(L[3],45,540,25,muted);break;
 case 'memory':
  for(let i=0;i<8;i++)B(50+i*12,340-i*24,230,34,i===7?acc:rule,3);
  T(L[0],380,160,32,fg,600,320);T(L[1],380,230,29,acc,600,320);T(L[2],30,455,29);T(v.value,30,530,56,acc,600,680);T(L[3],30,590,25,muted);break;
 }
}
