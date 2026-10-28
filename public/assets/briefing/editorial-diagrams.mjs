import {sectorLayouts,drawSector} from './sector-diagrams.mjs';
// 按新闻语义绘图：每个布局使用不同的信息结构，文案、数字全部由本期 JSON 提供。
import {smootherstep} from './motion.mjs';
export const editorialLayouts=['pricing','workmap','context','vision','filing','peerreview','boundary','distribution','science','cache','quantization','alliance','evaluation','lease','spv','equity','capacity','neuron','power','factory',...sectorLayouts];
export function drawEditorial(c,v,time,p,fontFamily){
 const {foreground:fg,muted,accent:acc,surface,line:rule,onAccent}=p,x0=1050,y0=245;
 const progress=smootherstep(time/1.5),L=v.labels;
 const T=(s,x,y,size=28,color=fg,weight=500,width=730)=>{c.font=`${weight} ${size}px ${fontFamily}`;const w=c.measureText(s).width;if(w>width)c.font=`${weight} ${size*width/w}px ${fontFamily}`;c.fillStyle=color;c.fillText(s,x0+x,y0+y)};
 const B=(x,y,w,h,color=surface,r=8)=>{c.fillStyle=color;c.beginPath();c.roundRect(x0+x,y0+y,w,h,r);c.fill()};
 const line=(x,y,X,Y,color=fg,w=2)=>{c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x0+x,y0+y);c.lineTo(x0+X,y0+Y);c.stroke()};
 const circle=(x,y,r,color=fg,fill=false)=>{c.beginPath();c.arc(x0+x,y0+y,r,0,Math.PI*2);c.lineWidth=2;c[fill?'fillStyle':'strokeStyle']=color;fill?c.fill():c.stroke()};
 const A=(x,y,X,Y,color=acc)=>{line(x,y,X,Y,color,3);const a=Math.atan2(Y-y,X-x);line(X,Y,X-12*Math.cos(a-.5),Y-12*Math.sin(a-.5),color,3);line(X,Y,X-12*Math.cos(a+.5),Y-12*Math.sin(a+.5),color,3)};
 const C=(s,x,y,size=28,color=fg,width=220)=>{c.font=`600 ${size}px ${fontFamily}`;let w=c.measureText(s).width;const scale=Math.min(1,width/w);T(s,x-w*scale/2,y,size*scale,color,600,width)};
 const sheet=(x,y,w,h)=>{B(x,y,w,h);line(x,y,x+w,y,rule);for(let i=0;i<4;i++)line(x+22,y+65+i*36,x+w-22,y+65+i*36,rule)};
 c.save();c.globalAlpha=smootherstep(time/.65);T(v.heading,0,0,23,muted);const pulse=(Math.sin(time*1.5)+1)/2;
 if(sectorLayouts.includes(v.layout)){drawSector(v,time,{T,B,line,circle,A,C,sheet,progress,x0,y0},p,c);T(v.caption,0,655,24,muted,500,740);c.restore();return}
 switch(v.layout){
 case 'pricing':
  // 仅在同一单位中按真实价格比例绘制，缓存输入的短条保留最小可见宽度。
  L.slice(0,3).forEach((label,i)=>{const y=95+i*135;T(label,0,y,26);B(0,y+24,Math.max(5,510*v.numbers[i]/Math.max(...v.numbers))*progress,28,acc,3);T(v.values[i],560,y+50,38,fg,600,180)});T(v.footer,0,535,24,muted);break;
 case 'workmap':
  sheet(235,95,285,330);C(v.value,377,205,32,acc,240);
  [[35,85],[570,85],[35,410],[570,410]].forEach(([x,y],i)=>{line(x+60,y+20,377,260,rule);T(L[i],x,y,27,fg,600,175)});T(v.footer,210,510,25,muted);break;
 case 'context':
  T(v.value,40,205,116,acc,700,640);T(L[0],45,267,29);
  for(let j=0;j<20;j++){B(30+j*34,330,23,85,j/20<progress?acc:surface,2);if(j%5===0)line(30+j*34,425,30+j*34,445,muted)}
  T(L[1],30,490,29);T(L[2],30,540,25,muted);break;
 case 'vision':
  B(30,115,275,265);for(let i=0;i<4;i++)for(let j=0;j<4;j++)B(50+i*60,135+j*55,45,40,(i+j)%3===0?acc:rule,3);
  A(330,245,435,245);B(465,140,250,205);T(L[1],490,195,27);T(L[2],490,255,26,acc);T(L[3],490,310,23,muted);T(L[0],35,435,32);T(v.value,35,525,61,acc,600);break;
 case 'filing':
  sheet(115,50,435,440);T(v.value,155,150,88,acc,700,350);T(L[0],155,235,32);T(L[1],155,300,27);
  c.save();c.translate(x0+480,y0+410);c.rotate(-.12);c.strokeStyle=acc;c.strokeRect(-130,-42,260,84);c.restore();C(L[2],480,425,30,acc,230);T(L[3],100,550,26,muted);break;
 case 'peerreview':
  sheet(0,100,175,235);T(L[0],18,165,24,fg,600,145);A(195,225,265,225);
  B(285,140,180,160);C(L[1],375,235,27,acc,160);A(485,225,555,225);
  circle(645,225,76);C(L[2],645,235,27,fg,130);line(375,310,375,440,rule);T(L[3],240,490,29,muted,500,470);break;
 case 'boundary':
  B(0,110,320,300);T(L[0],22,165,29);for(let i=0;i<4;i++)B(25+i*65,230,45,100,rule,3);
  line(380,90,380,455,acc,4);T(L[1],405,160,28,acc,600,330);circle(565,275,42);B(532,285,66,65,fg,5);T(L[2],405,410,26,fg,500,330);T(L[3],15,530,28,muted);break;
 case 'distribution':
  B(0,180,200,110,fg,10);C(L[0],100,246,25,p.background,175);
  A(225,235,405,125);A(225,235,405,355);
  B(435,65,285,120);C(L[1],578,138,30,fg,250);B(435,295,285,120);C(L[2],578,368,30,fg,250);
  T(L[3],55,525,30,acc,600,680);break;
 case 'science':
  L.slice(0,3).forEach((s,i)=>{const x=20+i*245;line(x,100,x+180,100,acc,4);T('0'+(i+1),x,150,28,acc);T(s,x,225,30,fg,600,205);for(let j=0;j<3;j++)line(x,270+j*30,x+175,270+j*30,rule)});
  line(20,420,700,420,rule);T(L[3],20,485,30);T(v.footer,20,540,25,muted);break;
 case 'cache':
  T(L[0],0,105,28);T(L[1],460,105,28);B(0,145,260,105);B(460,145,260,105);
  for(let i=0;i<6;i++)B(50+i*106,325,82,65,i===2||i===3?acc:rule,3);
  A(130,265,260,320);A(590,265,475,320);c.setLineDash([9,9]);line(367,130,367,445,acc,3);c.setLineDash([]);
  T(L[2],20,475,29,acc);B(10,505,710*progress,54,fg,4);T(L[3],28,543,28,p.background,600);break;
 case 'quantization':
  for(let i=0;i<12;i++)B(25+i*28,125,17,220+(i%3)*15,rule,2);
  A(390,250,485,250);for(let j=0;j<4;j++)B(530+j*43,160,28,165,acc,3);
  T(L[0],25,430,29);T(v.value,510,430,55,acc,700,210);T(L[1],25,495,29);T(L[2],25,550,25,muted);break;
 case 'alliance':
  c.strokeStyle=rule;c.lineWidth=2;c.beginPath();c.ellipse(x0+375,y0+270,260,165,0,0,Math.PI*2);c.stroke();
  [[115,270],[555,130],[555,410]].forEach(([x,y],i)=>{circle(x,y,20,acc,true);T(L[i],x-65,y+66,28,fg,600,210)});
  C(v.value,375,285,38,acc,260);T(L[3],90,560,27,muted);break;
 case 'evaluation':
  T('{ }',20,235,116,acc,600,210);A(210,210,285,210);B(315,100,320,195);line(340,260,610,260,muted);B(340,125,progress*270,112,rule,3);
  for(let i=0;i<6;i++)line(340+i*50,310,340+i*50,355,acc,2);
  T(L[0],20,425,29);T(L[1],315,425,29);T(L[2],315,495,29,acc);T(L[3],20,560,25,muted);break;
 case 'lease':
  T(v.value,0,145,100,acc,700);T(L[0],0,205,27);
  B(0,280,200,110);C(L[1],100,346,26,fg,180);A(220,335,365,335);B(390,280,320,110);C(L[2],550,346,27,fg,290);
  line(105,420,620,420,rule);circle(120+progress*480,420,9,acc,true);T(L[3],0,525,28,muted);break;
 case 'spv':
  [[0,100],[0,320]].forEach(([x,y],i)=>{B(x,y,220,100);C(L[i],110,y+60,27,fg,200)});A(240,150,330,255);A(240,370,330,255);circle(400,255,62,acc);C(v.value,400,267,29,acc,110);A(480,255,550,255);B(575,190,155,130);C(L[2],652,266,24,fg,140);T(L[3],20,490,29);T(v.footer,20,550,25,muted);break;
 case 'equity':
  T(v.value,0,140,105,acc,700);T(L[0],0,205,28);
  const firstWidth=700*v.numbers[0]/(v.numbers[0]+v.numbers[1]),secondWidth=700-firstWidth;B(0,285,firstWidth*progress,105,acc,3);B(firstWidth,285,secondWidth*progress,105,rule,3);
  c.save();c.beginPath();c.rect(x0+firstWidth,y0+285,secondWidth*progress,105);c.clip();for(let j=0;j<22;j++)line(240+j*28,390,320+j*28,285,muted,1);c.restore();
  T(L[1],0,440,29);T(L[2],300,440,29,fg,500,420);T(L[3],0,540,25,muted);break;
 case 'capacity':
  line(30,465,715,465,rule);const oldHeight=365*v.numbers[0]/v.numbers[1];B(100,465-oldHeight*progress,170,oldHeight*progress,rule,3);B(430,465-365*progress,170,365*progress,acc,3);
  T(v.values[0],100,205,59,fg,700,175);T(v.values[1],430,75,59,acc,700,210);A(300,270,400,205);T(L[0],85,520,27);T(L[1],430,520,27);T(L[2],50,575,25,muted);break;
 case 'neuron':
  B(0,85,720,380);T(L[0],25,135,24,muted);line(0,160,720,160,rule);T('>>>',25,240,32,acc);T(v.value,110,240,41,fg,600,560);T(L[1],30,320,29,acc);T(L[2],30,400,27,muted);A(170,490,540,490);T(L[3],200,550,27);break;
 case 'power':
  T(L[0],20,110,34,fg,600);T(L[1],450,110,34,fg,600);for(let j=0;j<4;j++){line(40,170+j*55,240,170+j*55,rule);line(470,170+j*55,670,170+j*55,rule)}
  A(80,430,650,430);A(650,485,80,485);T(L[2],200,395,31,acc);T(L[3],200,550,31,fg);break;
 case 'factory':
  // 预制模块逐一装配，先有场站就绪条件，再讨论接通时间。
  for(let j=0;j<4;j++){const px=20+j*175,py=180+(1-progress)*j*25;B(px,py,155,190,surface,4);for(let k=0;k<5;k++)line(px+20+k*24,py+20,px+20+k*24,py+140,rule);T(L[j],px+10,py+170,24,fg,600,140)}
  line(0,400,720,400,fg,3);T(v.value,30,495,64,acc,700,650);T(v.footer,30,555,24,muted);break;
 }
 T(v.caption,0,655,24,muted,500,740);c.restore();
}
