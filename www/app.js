const APP_VERSION="__APP_VERSION__";
const UPDATE_REPO="__GITHUB_REPO__";
const KEY="life-system-v01";
const labels=["日","一","二","三","四","五","六"];
const keys=["sleep","body","task","life","entertainment"];
const today=new Date(); today.setHours(0,0,0,0);
let selectedDate=new Date(today);
let data=JSON.parse(localStorage.getItem(KEY)||"{}");
let latestRelease=null;

const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const getRecord=d=>data[dateKey(d)]||{checks:{},score:7,note:""};
const saveData=()=>localStorage.setItem(KEY,JSON.stringify(data));
const isToday=d=>dateKey(d)===dateKey(today);

function render(){
  const r=getRecord(selectedDate);
  const todayFlag=isToday(selectedDate);
  document.getElementById("dateLabel").textContent=`${selectedDate.getFullYear()}年${selectedDate.getMonth()+1}月${selectedDate.getDate()}日`;
  document.getElementById("dateHint").textContent=`星期${labels[selectedDate.getDay()]}${todayFlag?" · 今天":""}`;
  document.querySelectorAll(".check-item").forEach(el=>el.classList.toggle("done",!!r.checks[el.dataset.key]));
  document.getElementById("completion").textContent=`${keys.filter(k=>r.checks[k]).length} / 5`;
  document.getElementById("score").value=r.score??7;
  document.getElementById("scoreValue").textContent=r.score??7;
  document.getElementById("note").value=r.note||"";
  renderWeek();
}

function renderWeek(){
  const box=document.getElementById("weekSummary");
  box.innerHTML="";
  let total=0,scored=0,active=0,stable=0;
  for(let i=6;i>=0;i--){
    const d=new Date(selectedDate); d.setDate(d.getDate()-i);
    const r=getRecord(d), k=dateKey(d), s=Number(r.score??0);
    const c=keys.filter(x=>r.checks[x]).length;
    if(data[k]){
      total+=s; scored++;
      if(r.checks.life) active++;
      if(c>=4) stable++;
    }
    const el=document.createElement("div");
    el.className="bar-day";
    el.innerHTML=`<span>${labels[d.getDay()]}</span><div class="bar"><i style="height:${Math.max(8,s*10)}%"></i></div><span>${data[k]?s:"—"}</span>`;
    box.appendChild(el);
  }
  document.getElementById("avgScore").textContent=scored?(total/scored).toFixed(1):"—";
  document.getElementById("activeDays").textContent=active;
  document.getElementById("stableDays").textContent=stable;
}

function persistCurrent(){
  const r=getRecord(selectedDate);
  r.score=Number(document.getElementById("score").value);
  r.note=document.getElementById("note").value.trim();
  data[dateKey(selectedDate)]=r;
  saveData();
}

document.querySelectorAll(".check-item").forEach(el=>el.addEventListener("click",()=>{
  const r=getRecord(selectedDate);
  r.checks[el.dataset.key]=!r.checks[el.dataset.key];
  data[dateKey(selectedDate)]=r;
  saveData();
  render();
}));

document.getElementById("score").addEventListener("input",e=>{
  document.getElementById("scoreValue").textContent=e.target.value;
});

document.getElementById("saveBtn").addEventListener("click",()=>{
  persistCurrent(); render();
  const b=document.getElementById("saveBtn");
  b.innerHTML="已保存 ✓";
  setTimeout(()=>b.innerHTML='保存今天 <span>→</span>',1000);
});

document.getElementById("prevDay").addEventListener("click",()=>{persistCurrent();selectedDate.setDate(selectedDate.getDate()-1);render()});
document.getElementById("nextDay").addEventListener("click",()=>{persistCurrent();selectedDate.setDate(selectedDate.getDate()+1);render()});
document.getElementById("todayBtn").addEventListener("click",()=>{persistCurrent();selectedDate=new Date(today);render()});

function normalizeVersion(v){
  return String(v||"").replace(/^v/i,"").split(/[+-]/)[0].split(".").map(n=>parseInt(n,10)||0).slice(0,3).concat([0,0,0]).slice(0,3);
}
function isNewer(a,b){
  const x=normalizeVersion(a),y=normalizeVersion(b);
  for(let i=0;i<3;i++){if(x[i]>y[i])return true;if(x[i]<y[i])return false}
  return false;
}
function releaseUrl(release){
  return release?.html_url || `https://github.com/${UPDATE_REPO}/releases/latest`;
}
function setUpdateStatus(text){document.getElementById("updateStatus").textContent=text;}

function openUpdateModal(release){
  latestRelease=release;
  document.getElementById("modalTitle").textContent=`发现新版本 v${normalizeVersion(release.tag_name).join(".")}`;
  document.getElementById("modalBody").textContent="新版本已经发布，点击下方按钮进入 GitHub Release 下载最新 APK。";
  document.getElementById("updateModal").classList.remove("hidden");
  document.getElementById("updateModal").setAttribute("aria-hidden","false");
}

async function checkUpdate(showNoUpdate=true){
  if(!UPDATE_REPO || UPDATE_REPO.includes("__")){
    setUpdateStatus("构建时会自动绑定 GitHub 仓库，当前预览环境暂不检查。");
    return;
  }
  const btn=document.getElementById("updateBtn");
  const old=btn.textContent; btn.textContent="检查中…"; btn.disabled=true;
  try{
    const res=await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`,{
      headers:{Accept:"application/vnd.github+json"},
      cache:"no-store"
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const release=await res.json();
    if(isNewer(release.tag_name,APP_VERSION)){
      setUpdateStatus(`发现新版本 v${normalizeVersion(release.tag_name).join(".")}`);
      openUpdateModal(release);
    }else if(showNoUpdate){
      setUpdateStatus(`当前已是最新版本 v${APP_VERSION}`);
    }
  }catch(e){
    setUpdateStatus("暂时无法检查更新，请稍后再试。");
  }finally{
    btn.textContent=old; btn.disabled=false;
  }
}

document.getElementById("updateBtn").addEventListener("click",()=>checkUpdate(true));
document.getElementById("closeModal").addEventListener("click",()=>{
  document.getElementById("updateModal").classList.add("hidden");
});
document.getElementById("laterUpdate").addEventListener("click",()=>{
  document.getElementById("updateModal").classList.add("hidden");
});
document.getElementById("installUpdate").addEventListener("click",()=>{
  const url=releaseUrl(latestRelease);
  window.open(url,"_blank");
});

document.getElementById("versionText").textContent=`当前版本 v${APP_VERSION}`;
render();
setTimeout(()=>checkUpdate(false),1200);
