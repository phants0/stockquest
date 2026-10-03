const app=document.getElementById("app");
let currentProfile=null,cash=100000,portfolio={},market=[];
const starterMarkets=[
 {ticker:"AAPL",name:"Apple Inc.",featured:true},{ticker:"NVDA",name:"NVIDIA Corporation",featured:true},
 {ticker:"AMD",name:"Advanced Micro Devices",featured:true},{ticker:"TSLA",name:"Tesla Inc.",featured:true},
 {ticker:"MSFT",name:"Microsoft Corporation",featured:true},{ticker:"META",name:"Meta Platforms",featured:true},
 {ticker:"AMZN",name:"Amazon",featured:true}
];
function showError(text){const old=document.getElementById("error-overlay");if(old)old.remove();const div=document.createElement("div");div.id="error-overlay";div.style="position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#ff4444;color:white;padding:16px 24px;border-radius:16px;font-weight:bold;z-index:999999;box-shadow:0 0 30px rgba(0,0,0,.5);";div.innerText=text;document.body.appendChild(div);setTimeout(()=>div.remove(),5000);}
async function checkBackend(){try{const r=await fetch((window.STOCKQUEST_CONFIG?.API_BASE||"/api")+"/health",{cache:"no-store"});const d=await r.json();if(!r.ok||!d.configured)throw new Error("Stock data service is not configured.");return true;}catch(e){showError("Stock data service is unavailable. Prices and search cannot load yet.");return false;}}
window.onload=()=>{if(typeof renderMenu!=="function"){app.innerHTML='<h1 style="padding:40px;color:red;font-family:Arial;">profiles.js failed to load</h1>';return;}renderMenu();};
function renderApp(){
 app.innerHTML=`
 <div class="app">
  <div class="topbar"><div><h1 id="homeBtn" style="cursor:pointer;">StockQuest Pro</h1><div>Profile: ${currentProfile||"Guest"}</div></div><h2>$${cash.toFixed(2)}</h2></div>
  <div class="layout">
   <div class="panel"><input id="searchInput" placeholder="Search companies..."><div id="results"></div><div id="market"></div></div>
   <div class="panel"><h2>Portfolio</h2><div id="portfolio"></div></div>
  </div>
 </div>`;
 document.getElementById("homeBtn").onclick=renderMenu;
 const input=document.getElementById("searchInput");
 if(input)input.addEventListener("input",e=>{if(typeof search==="function")search(e.target.value);});
 if(typeof renderMarket==="function")renderMarket();
 checkBackend();
}
