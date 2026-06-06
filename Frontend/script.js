let processes = [{ id: 'P1', arrival: 0, burst: 5, priority: 1 }];
let myChart = null;

const scenarios = {
    banking: { algo: 'rr', q: 2, data: [
        { id: 'TXN1', arrival: 0, burst: 4, priority: 2 },
        { id: 'TXN2', arrival: 1, burst: 3, priority: 2 },
        { id: 'BAL_CHK', arrival: 2, burst: 2, priority: 3 },
        { id: 'REPORT', arrival: 3, burst: 12, priority: 4 }
    ]},
    hospital: { algo: 'priority', q: 2, data: [
        { id: 'TRIAGE', arrival: 0, burst: 2, priority: 2 },
        { id: 'ER_SURG', arrival: 1, burst: 15, priority: 1 },
        { id: 'LAB_RES', arrival: 3, burst: 4, priority: 3 },
        { id: 'CONSULT', arrival: 5, burst: 5, priority: 4 }
    ]},
    embedded: { algo: 'sjf', q: 2, data: [
        { id: 'SENS_1', arrival: 0, burst: 1, priority: 1 },
        { id: 'SENS_2', arrival: 0, burst: 2, priority: 1 },
        { id: 'ACTUATE', arrival: 1, burst: 2, priority: 1 },
        { id: 'LOG_ERR', arrival: 2, burst: 6, priority: 3 }
    ]}
};

function loadScenario() {
    const val = document.getElementById('scenario-select').value;
    if (val === 'custom') return;
    const s = scenarios[val];
    processes = JSON.parse(JSON.stringify(s.data));
    document.getElementById('algo-select').value = s.algo;
    document.getElementById('quantum').value = s.q;
    toggleRR(); renderTable();
    setTimeout(() => document.getElementById('run-btn').click(), 100);
}

function toggleRR() {
    document.getElementById('rr-ui').style.display = 
        document.getElementById('algo-select').value === 'rr' ? 'block' : 'none';
}

function renderTable() {
    document.getElementById('p-body').innerHTML = processes.map((p, i) => `
        <tr>
            <td><strong>${p.id}</strong></td>
            <td><input type="number" value="${p.arrival}" onchange="edit(${i},'arrival',this.value)"></td>
            <td><input type="number" value="${p.burst}" onchange="edit(${i},'burst',this.value)"></td>
            <td><input type="number" value="${p.priority}" onchange="edit(${i},'priority',this.value)"></td>
            <td><button onclick="del(${i})" style="background:none; color:#ef4444; font-size:0.75rem; cursor:pointer">Remove</button></td>
        </tr>
    `).join('');
}

window.edit = (i, k, v) => processes[i][k] = parseInt(v) || 0;
window.del = (i) => { processes.splice(i, 1); renderTable(); };

document.getElementById('add-row').addEventListener('click', () => {
    processes.push({ id: 'P' + (processes.length + 1), arrival: 0, burst: 4, priority: 1 });
    renderTable();
});

function solve(algo, q = 2) {
    let time = 0, completed = [], gantt = [];
    let pool = processes.map(p => ({ ...p, rem: p.burst, done: false }));

    if (algo === 'fcfs') {
        pool.sort((a,b) => a.arrival - b.arrival).forEach(p => {
            if (time < p.arrival) time = p.arrival;
            gantt.push({ id: p.id, len: p.burst });
            time += p.burst; p.finish = time; completed.push(p);
        });
    } else if (algo === 'sjf' || algo === 'priority') {
        while (completed.length < pool.length) {
            let ready = pool.filter(p => p.arrival <= time && !p.done);
            if (ready.length > 0) {
                ready.sort((a, b) => algo === 'sjf' ? a.burst - b.burst : a.priority - b.priority);
                let p = ready[0];
                gantt.push({ id: p.id, len: p.burst });
                time += p.burst; p.finish = time; p.done = true; completed.push(p);
            } else time++;
        }
    } else if (algo === 'rr') {
        let readyQ = [], temp = [...pool].sort((a,b) => a.arrival - b.arrival);
        while (completed.length < pool.length) {
            temp.filter(p => p.arrival <= time && !readyQ.includes(p) && !p.done).forEach(p => readyQ.push(p));
            if (readyQ.length > 0) {
                let p = readyQ.shift();
                let take = Math.min(p.rem, q);
                gantt.push({ id: p.id, len: take });
                time += take; p.rem -= take;
                temp.filter(p2 => p2.arrival <= time && !readyQ.includes(p2) && !p2.done && p2 !== p).forEach(p2 => readyQ.push(p2));
                if (p.rem > 0) readyQ.push(p);
                else { p.finish = time; p.done = true; completed.push(p); }
            } else time++;
        }
    }
    let totalWT = 0;
    completed.forEach(p => totalWT += (p.finish - p.arrival - p.burst));
    return { avgWT: (totalWT / pool.length).toFixed(2), gantt: gantt };
}

async function animateGantt(ganttData) {
    const display = document.getElementById('gantt-display');
    const btn = document.getElementById('run-btn');
    display.innerHTML = "";
    btn.disabled = true;

    for (const item of ganttData) {
        const block = document.createElement('div');
        block.className = 'gantt-box';
        block.innerText = item.id;
        display.appendChild(block);

        await new Promise(r => setTimeout(r, 50));
        block.style.flex = item.len;
        block.style.width = "auto";
        
        await new Promise(r => setTimeout(r, 400));
    }
    btn.disabled = false;
}

document.getElementById('run-btn').addEventListener('click', async () => {
    if (processes.length === 0) return;
    const algo = document.getElementById('algo-select').value;
    const q = parseInt(document.getElementById('quantum').value) || 2;
    const results = ['fcfs', 'sjf', 'priority', 'rr'].map(a => parseFloat(solve(a, q).avgWT));

    document.getElementById('active-algo').innerText = `[ Current: ${algo.toUpperCase()} ]`;
    const current = solve(algo, q);
    
    await animateGantt(current.gantt);

    if (myChart) myChart.destroy();
    myChart = new Chart(document.getElementById('compChart'), {
        type: 'bar',
        data: {
            labels: ['FCFS', 'SJF', 'Priority', 'RR'],
            datasets: [{ label: 'Avg Wait (ms)', data: results, backgroundColor: '#38bdf8' }]
        },
        options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });

    const minWT = Math.min(...results);
    const bestIdx = results.indexOf(minWT);
    const bestAlgoName = ['FCFS', 'SJF', 'Priority', 'Round Robin'][bestIdx];
    
    const avgBurst = processes.reduce((acc, p) => acc + p.burst, 0) / processes.length;
    const burstVar = processes.map(p => Math.abs(p.burst - avgBurst)).reduce((a,b) => a+b, 0);

    let aiRec = `<strong>${bestAlgoName}</strong> is mathematically optimal for this workload. `;
    if(burstVar > 8) aiRec += "The high variance in task lengths means SJF is preventing the 'Convoy Effect'.";
    else if(bestAlgoName === 'Priority') aiRec += "The priority levels are effectively organizing your critical tasks first.";
    else aiRec += "The workload is fairly uniform, allowing most algorithms to perform stably.";

    document.getElementById('ai-text-content').innerHTML = `<p style="font-size:0.85rem; margin-top:8px">${aiRec}</p><p style="font-size:0.75rem; color:var(--accent); font-weight:bold; margin-top:5px">Optimal Average Wait: ${minWT}ms</p>`;
});

renderTable();

async function saveToMySQL(algo, avgWT, count) {
    try {
        const response = await fetch('save_result.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ algorithm: algo, avgWT: avgWT, count: count })
        });
        console.log("Data saved to local MySQL database!");
    } catch (err) {
        console.error("Database connection failed", err);
    }
}