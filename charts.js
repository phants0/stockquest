const chartMap = {};

function graph(price){
    const arr = [];
    let p = price;
    for(let i = 0; i < 40; i++){
        p += (Math.random() - 0.5) * 2;
        arr.push(p);
    }
    return arr;
}

function createChart(canvas, data, green = true){
    if(!canvas || typeof Chart === "undefined") return;

    const key = canvas.id || canvas;
    if(chartMap[key]) chartMap[key].destroy();

    chartMap[key] = new Chart(canvas, {
        type:"line",
        data:{
            labels:data.map((_, i) => i),
            datasets:[{
                data,
                borderColor:green ? "#4ade80" : "#ff4444",
                borderWidth:2,
                pointRadius:0,
                tension:0.35
            }]
        },
        options:{
            responsive:true,
            maintainAspectRatio:false,
            plugins:{legend:{display:false}},
            animation:false,
            scales:{x:{display:false},y:{display:false}}
        }
    });
}
