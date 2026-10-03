function renderMenu() {

app.innerHTML = `
<div class="screen">
<div class="menu">
<div class="minecraft-title">StockQuest Pro</div>
<button class="menu-btn" id="newProfileBtn">Create New Profile</button>
<button class="menu-btn gold" id="viewProfilesBtn">View Saved Profiles</button>
<button class="menu-btn red-btn" id="resetBtn">Reset All Saved Data</button>
</div>
</div>`;

const newBtn=document.getElementById("newProfileBtn");
const viewBtn=document.getElementById("viewProfilesBtn");
const resetBtn=document.getElementById("resetBtn");
if(newBtn) newBtn.onclick=renderCreateProfile;
if(viewBtn) viewBtn.onclick=renderProfileSelect;
if(resetBtn) resetBtn.onclick=renderResetConfirm;
}

function renderCreateProfile(){
app.innerHTML=`
<div class="screen"><div class="menu">
<button class="back-btn" id="backBtn">Back</button>
<div class="minecraft-title">Create Profile</div>
<input id="profileInput" placeholder="Profile Name">
<button class="menu-btn gold" id="createBtn">Create Profile</button>
</div></div>`;

document.getElementById("backBtn").onclick=renderMenu;
document.getElementById("createBtn").onclick=()=>{
const input=document.getElementById("profileInput");
if(!input)return;
const name=input.value.trim();
if(!name){alert("Enter a profile name");return;}
const profiles=getProfiles();
if(profiles[name]){alert("Profile already exists");return;}
profiles[name]={cash:100000,portfolio:{},market:[...starterMarkets]};
saveProfiles(profiles);
loadProfile(name);
renderApp();
};
}

function renderProfileSelect(){
const profiles=getProfiles();
let html=`
<div class="screen"><div class="menu">
<button class="back-btn" id="backBtn">Back</button>
<div class="minecraft-title">Profiles</div>`;
Object.keys(profiles).forEach(name=>{
html += `
<div class="profile-card">
<h2>${name}</h2>
<button class="menu-btn gold" onclick="launchProfile('${name}')">Launch</button>
</div>`;
});
html += `</div></div>`;
app.innerHTML=html;
document.getElementById("backBtn").onclick=renderMenu;
}

window.launchProfile=function(name){
const loaded=loadProfile(name);
if(!loaded){alert("Failed to load profile");return;}
renderApp();
};

function renderResetConfirm(){
app.innerHTML=`
<div class="screen"><div class="menu">
<button class="back-btn" id="backBtn">Back</button>
<div class="minecraft-title">Confirm Reset</div>
<button class="menu-btn red-btn" id="confirmResetBtn">Delete Everything</button>
</div></div>`;
document.getElementById("backBtn").onclick=renderMenu;
document.getElementById("confirmResetBtn").onclick=()=>{
localStorage.removeItem("sq_profiles");
location.reload();
};
}
