function getProfiles(){
    return JSON.parse(localStorage.getItem("sq_profiles")) || {};
}

function saveProfiles(data){
    localStorage.setItem("sq_profiles",JSON.stringify(data));
}

function saveCurrentProfile(){
    if(!currentProfile)return;

    const profiles = getProfiles();

    profiles[currentProfile] = {
        cash,
        portfolio,
        market
    };

    saveProfiles(profiles);
}

function loadProfile(name){
    const profiles = getProfiles();

    if(!profiles[name]){
        return false;
    }

    currentProfile = name;
    cash = profiles[name].cash;
    portfolio = profiles[name].portfolio;
    market = profiles[name].market;

    return true;
}
