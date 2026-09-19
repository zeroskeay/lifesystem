const APP_VERSION="__APP_VERSION__";
const GITHUB_REPO="__GITHUB_REPO__";
const KEY="life-system-v01";
const dayNames=["日","一","二","三","四","五","六"];
const checkKeys=["sleep","body","task","life","entertainment"];
const checkNames={sleep:"睡眠",body:"身体",task:"任务",life:"主动",entertainment:"娱乐"};
const checkDescriptions={sleep:"睡得好，才有好状态",body:"动起来，感受身体的变化",task:"把重要的事一件件完成",life:"主动选择，认真生活",entertainment:"适度放松，享受当下"};
const checkIcons={sleep:"☾",body:"♟",task:"✓",life:"✦",entertainment:"⌁"};
const today=new Date();today.setHours(0,0,0,0);
let selectedDate=new Date(today), data=JSON.parse(localStorage.getItem(KEY)||"{}");
let currentView="home", currentDays=7, currentEditor="sleep";

const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const rec=d=>data[key(d)]||{checks:{},scores:{sleep:7,body:6,task:8,life:7,entertainment:6},score:7.5,note:""};
const save=()=>localStorage.setItem(KEY,JSON.stringify(data));
const isToday=d=>key(d)===key(today);
const isFuture=d=>d>today;
const hasRecord=d=>Object.prototype.hasOwnProperty.call(data,key(d));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const defaults={sleep:7,body:6,task:8,life:7,entertainment:6};
const formatMinutes=minutes=>`${String(Math.floor(minutes/60)).padStart(2,"0")}小时${String(minutes%60).padStart(2,"0")}分`;
const ensureRecord=d=>{
  const r=rec(d);r.checks=r.checks||{};r.scores={...defaults,...(r.scores||{})};r.todos=Array.isArray(r.todos)?r.todos.slice(0,3):[];return r;
};
function showToast(t){const el=document.getElementById("toast");el.textContent=t;el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),1400)}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))}

function navigate(view){
  currentView=view;
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.dataset.view===view));
  document.querySelectorAll(".nav-item").forEach(v=>v.classList.toggle("active",v.dataset.nav===view));
  if(view==="home")renderHome();
  if(view==="records")renderEditor();
  if(view==="stats")renderStats();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-nav]").forEach(el=>el.addEventListener("click",()=>navigate(el.dataset.nav)));

function renderHome(){
  const recorded=hasRecord(selectedDate), r=rec(selectedDate), k=key(selectedDate);
  document.getElementById("dateLabel").textContent=`${selectedDate.getFullYear()}年${selectedDate.getMonth()+1}月${selectedDate.getDate()}日`;
  document.getElementById("dateHint").textContent=`星期${dayNames[selectedDate.getDay()]}${isToday(selectedDate)?" · 今天":""}`;
  const done=recorded?checkKeys.filter(x=>r.checks[x]).length:0;
  document.getElementById("completion").textContent=`${done}/5`;
  document.querySelectorAll(".status-item").forEach(el=>{
    const x=el.dataset.key;el.classList.toggle("done",!!r.checks[x]);
    const score=recorded?r.scores?.[x]??defaults[x]:null;
    el.querySelector("small").textContent=score===null?"—":`${score}/10`;
  });
  const avg=checkKeys.reduce((sum,x)=>sum+Number(r.scores?.[x]??defaults[x]),0)/checkKeys.length;
  document.getElementById("scoreValue").textContent=recorded?avg.toFixed(1):"—";
  document.getElementById("noteDisplay").textContent=recorded?(r.note||""):"";
  document.getElementById("editTodayBtn").textContent=recorded?"去修改":"去记录";
  document.getElementById("editTodayBtn").hidden=isFuture(selectedDate);
  document.getElementById("nextDay").disabled=isToday(selectedDate);
  renderBars("homeBars",7,selectedDate);
  renderSparkline("homeSparkline",7,selectedDate);
}

function weekRecords(days, endDate=selectedDate){
  const arr=[];for(let i=days-1;i>=0;i--){const d=new Date(endDate);d.setDate(d.getDate()-i);arr.push({date:d,record:data[key(d)]||null})}return arr;
}
function renderBars(id,days,endDate){
  const box=document.getElementById(id);if(!box)return;box.innerHTML="";
  weekRecords(days,endDate).forEach(({date,record})=>{
    const score=record?Number(record.score??0):0;
    const col=document.createElement("div");col.className="bar-col";
    col.innerHTML=`<div class="bar-stack"><i class="bar-fill" style="height:${clamp(score*10,3,100)}%"></i></div><span>${date.getMonth()+1}/${date.getDate()}</span>`;
    box.appendChild(col);
  });
}
function renderSparkline(svgId,days,endDate){
  const svg=document.getElementById(svgId);if(!svg)return;
  const vals=weekRecords(days,endDate).map(x=>x.record?Number(x.record.score??0):null).filter(x=>x!==null);
  if(!vals.length){svg.innerHTML="";return}
  const pts=vals.map((v,i)=>{const x=5+(i/(Math.max(1,vals.length-1)))*140;const y=49-v*4.2;return `${x},${y}`}).join(" ");
  svg.innerHTML=`<polyline points="${pts}" fill="none" stroke="#2389ee" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function persistRecord(record){data[key(selectedDate)]=record;save();renderHome()}
document.getElementById("prevDay").addEventListener("click",()=>{selectedDate.setDate(selectedDate.getDate()-1);renderHome()});
document.getElementById("nextDay").addEventListener("click",()=>{if(isToday(selectedDate))return;selectedDate.setDate(selectedDate.getDate()+1);renderHome()});
document.getElementById("todayBtn").addEventListener("click",()=>{selectedDate=new Date(today);renderHome()});
document.getElementById("editTodayBtn").addEventListener("click",()=>{if(!isFuture(selectedDate))navigate("records")});
document.getElementById("recordPrevDay").addEventListener("click",()=>{selectedDate.setDate(selectedDate.getDate()-1);renderEditor()});
document.getElementById("recordNextDay").addEventListener("click",()=>{if(isToday(selectedDate))return;selectedDate.setDate(selectedDate.getDate()+1);renderEditor()});
document.getElementById("recordTodayBtn").addEventListener("click",()=>{selectedDate=new Date(today);renderEditor()});
document.getElementById("settingsQuick").addEventListener("click",()=>navigate("settings"));
document.getElementById("githubBtn").addEventListener("click",()=>window.open(`https://github.com/${GITHUB_REPO}/releases/latest`,"_blank"));
document.getElementById("aboutBtn").addEventListener("click",()=>showToast(`生活系统 v${APP_VERSION}`));

function renderEditor(){
  if(isFuture(selectedDate)){navigate("home");return}
  const r=ensureRecord(selectedDate),date=key(selectedDate);
  document.getElementById("recordDateLabel").textContent=`${selectedDate.getFullYear()}年${selectedDate.getMonth()+1}月${selectedDate.getDate()}日`;
  document.getElementById("recordDateHint").textContent=`星期${dayNames[selectedDate.getDay()]}${isToday(selectedDate)?" · 今天":""}`;
  document.getElementById("recordNextDay").disabled=isToday(selectedDate);
  const tabs=document.getElementById("recordTabs");
  tabs.innerHTML=checkKeys.map(x=>`<button class="${x===currentEditor?"active":""}" data-editor="${x}"><span class="tab-icon ${x}">${checkIcons[x]}</span><span>${checkNames[x]}</span></button>`).join("");
  const editor=document.getElementById("recordEditor"),x=currentEditor,score=r.scores[x];
  const details=r.details||{};
  const body=x==="sleep"?`<div class="duration-control"><strong id="sleepMinutesValue">${formatMinutes(details.sleepMinutes??360)}</strong><input class="duration-range" data-field="sleepMinutes" type="range" min="0" max="720" step="30" value="${details.sleepMinutes??360}"></div>`:
    x==="body"?`<input id="contentInput" class="text-input" maxlength="100" placeholder="例如：跑步、散步、拉伸" value="${escapeHtml(details.bodyActivity||"")}"><div class="duration-control"><strong id="bodyMinutesValue">${formatMinutes(details.bodyMinutes??30)}</strong><input class="duration-range" data-field="bodyMinutes" type="range" min="0" max="300" step="30" value="${details.bodyMinutes??30}"></div>`:
    x==="task"?`<div class="todo-list">${r.todos.map((todo,i)=>`<div class="todo-swipe"><div class="todo-actions"><button class="todo-delete" data-index="${i}" aria-label="删除待办">删除</button></div><div class="todo-row" data-index="${i}"><label><input class="todo-check" type="checkbox" data-index="${i}" ${r.todoDone?.[i]?"checked":""}><span>${escapeHtml(todo)}</span></label></div></div>`).join("")}</div>${r.todos.length<3?'<div class="todo-add"><input id="todoInput" maxlength="50" placeholder="添加任务"><button id="todoAdd">＋ 添加任务</button></div>':""}`:
    x==="life"?`<textarea id="contentInput" maxlength="300" placeholder="今天主动做了什么？">${escapeHtml(details.lifeContent||"")}</textarea><input id="purposeInput" class="text-input" maxlength="100" placeholder="为什么做这件事？" value="${escapeHtml(details.lifePurpose||"")}">`:
    `<div class="duration-control"><strong id="entertainmentMinutesValue">${formatMinutes(details.entertainmentMinutes??90)}</strong><input class="duration-range" data-field="entertainmentMinutes" type="range" min="0" max="600" step="30" value="${details.entertainmentMinutes??90}"></div><input id="purposeInput" class="text-input" maxlength="100" placeholder="例如：放松心情" value="${escapeHtml(details.entertainmentPurpose||"")}">`;
  editor.innerHTML=`<div class="editor-heading"><span class="record-icon ${x}">${checkIcons[x]}</span><div><h2>${checkNames[x]}</h2><small>${checkDescriptions[x]}</small></div><strong id="editorScore">${score}/10</strong></div><input id="editorScoreInput" class="editor-score" type="range" min="0" max="10" step="1" value="${score}">${body}`;
  document.getElementById("summaryInput").value=r.note||"";
  document.getElementById("summaryInput").oninput=e=>{r.note=e.target.value;persistRecord(r)};
  tabs.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{currentEditor=b.dataset.editor;renderEditor()}));
  document.getElementById("editorScoreInput").addEventListener("input",e=>{r.scores[x]=Number(e.target.value);r.checks[x]=true;document.getElementById("editorScore").textContent=`${e.target.value}/10`;persistRecord(r)});
  if(x==="body")document.getElementById("contentInput").addEventListener("input",e=>{r.details={...(r.details||{}),bodyActivity:e.target.value};r.checks[x]=true;persistRecord(r)});
  if(x==="life"){document.getElementById("contentInput").addEventListener("input",e=>{r.details={...(r.details||{}),lifeContent:e.target.value};r.checks[x]=true;persistRecord(r)});document.getElementById("purposeInput").addEventListener("input",e=>{r.details={...(r.details||{}),lifePurpose:e.target.value};r.checks[x]=true;persistRecord(r)})}
  if(x==="entertainment")document.getElementById("purposeInput").addEventListener("input",e=>{r.details={...(r.details||{}),entertainmentPurpose:e.target.value};r.checks[x]=true;persistRecord(r)});
  editor.querySelectorAll(".duration-range").forEach(input=>input.addEventListener("input",()=>{r.details={...(r.details||{}),[input.dataset.field]:Number(input.value)};r.checks[x]=true;const output=document.getElementById(`${input.dataset.field}Value`);if(output)output.textContent=formatMinutes(Number(input.value));persistRecord(r)}));
  if(x==="task"){document.getElementById("todoAdd")?.addEventListener("click",()=>{const input=document.getElementById("todoInput"),value=input.value.trim();if(!value)return;r.todos.push(value);r.checks.task=true;persistRecord(r);renderEditor()});editor.querySelectorAll(".todo-delete").forEach(b=>b.addEventListener("click",event=>{event.stopPropagation();r.todos.splice(Number(b.dataset.index),1);if(r.todoDone)r.todoDone.splice(Number(b.dataset.index),1);persistRecord(r);renderEditor()}));editor.querySelectorAll(".todo-check").forEach(b=>b.addEventListener("change",()=>{r.todoDone=r.todoDone||[];r.todoDone[Number(b.dataset.index)]=b.checked;persistRecord(r)}))}
  let todoStartX=0;
  editor.querySelectorAll(".todo-swipe").forEach(row=>{
    row.addEventListener("pointerdown",event=>{if(event.target.closest("button,input"))return;todoStartX=event.clientX;row.setPointerCapture?.(event.pointerId)});
    row.addEventListener("pointerup",event=>{const delta=event.clientX-todoStartX;if(delta<-35){row.classList.add("open")}if(delta>35){row.classList.remove("open")}});
  });
}

function avg(list,fn){const a=list.map(fn).filter(v=>Number.isFinite(v));return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function renderStats(){
  const rows=weekRecords(currentDays,selectedDate);
  const scores=rows.map(x=>x.record?Number(x.record.score??0):null);
  const valid=scores.filter(x=>x!==null);
  document.getElementById("statsAvg").textContent=`平均 ${valid.length?avg(valid,x=>x).toFixed(1):"—"}`;
  drawTrend(rows);drawRadar(rows);
  const recent=weekRecords(7,selectedDate).filter(x=>x.record);
  document.getElementById("weekSleep").textContent=recent.length?avg(recent,x=>Number(x.record.scores?.sleep??7)).toFixed(1):"—";
  document.getElementById("weekBody").textContent=recent.length?avg(recent,x=>Number(x.record.scores?.body??6)).toFixed(1):"—";
  document.getElementById("weekTask").textContent=recent.length?avg(recent,x=>Number(x.record.scores?.task??8)).toFixed(1):"—";
}
function drawTrend(rows){
  const svg=document.getElementById("trendSvg"),w=360,h=150,pad=20;
  let html="";
  for(let i=0;i<5;i++){const y=15+i*28;html+=`<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="#e8f0f6" stroke-width="1"/>`}
  const vals=rows.map(x=>x.record?Number(x.record.score??0):null), valid=vals.filter(x=>x!==null);
  if(valid.length){
    const pts=vals.map((v,i)=>v===null?null:`${pad+(i/(Math.max(1,rows.length-1)))*(w-2*pad)},${h-20-v*11}`).filter(Boolean);
    html+=`<polyline points="${pts.join(" ")}" fill="none" stroke="#2186eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    pts.forEach(p=>{const [x,y]=p.split(",");html+=`<circle cx="${x}" cy="${y}" r="3.2" fill="#2186eb"/>`});
  }
  const labelIndexes=rows.length>7?[0,Math.floor((rows.length-1)/2),rows.length-1]:rows.map((_,i)=>i);
  labelIndexes.forEach(i=>{const x=rows[i],xx=pad+(i/(Math.max(1,rows.length-1)))*(w-2*pad);html+=`<text x="${xx}" y="146" text-anchor="middle" font-size="8" fill="#8396aa">${x.date.getMonth()+1}/${x.date.getDate()}</text>`});
  svg.innerHTML=html;
}
function drawRadar(rows){
  const svg=document.getElementById("radarSvg"),cx=130,cy=112,R=78;
  const labels=["睡眠","身体","任务","主动","娱乐"];
  const vals=labels.map((_,i)=>avg(rows.filter(x=>x.record),x=>Number(x.record?.scores?.[checkKeys[i]]??[7,6,8,7,6][i])));
  let html="";
  for(let ring=1;ring<=4;ring++){
    const rr=R*ring/4;const pts=labels.map((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/5;return `${cx+Math.cos(a)*rr},${cy+Math.sin(a)*rr}`}).join(" ");
    html+=`<polygon points="${pts}" fill="none" stroke="#dfeaf4" stroke-width="1"/>`;
  }
  const outer=labels.map((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/5;return `${cx+Math.cos(a)*R},${cy+Math.sin(a)*R}`});
  outer.forEach((p,i)=>{const [x,y]=p.split(",");html+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e3edf5" stroke-width="1"/><text x="${cx+(x-cx)*1.2}" y="${cy+(y-cy)*1.2}" text-anchor="middle" font-size="9" fill="#4b6684">${labels[i]} ${vals[i].toFixed(1)}</text>`});
  const area=labels.map((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/5;const rr=R*clamp(vals[i],0,10)/10;return `${cx+Math.cos(a)*rr},${cy+Math.sin(a)*rr}`}).join(" ");
  html+=`<polygon points="${area}" fill="#2c8ef533" stroke="#2588eb" stroke-width="2.5"/>`;
  svg.innerHTML=html;
}
document.querySelectorAll(".period").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".period").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentDays=Number(b.dataset.days);renderStats()}));

document.getElementById("dataBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=`life-system-backup-${key(today)}.json`;a.click();URL.revokeObjectURL(url);showToast("数据已导出");
});

document.querySelectorAll(".back-btn").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.nav)));
renderHome();
