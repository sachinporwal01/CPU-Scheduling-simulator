// ====================== SUPABASE INIT ======================
const supabaseUrl = "https://ccnahccpuvpepqxhnqth.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbmFoY2NwdXZwZXBxeGhucXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjEzMjIsImV4cCI6MjA5NjMzNzMyMn0.bwCnWdwNg-UY9sQoaCd7GQe3Dcw_joXxs34SJ2h2c6s";
const client = supabase.createClient(supabaseUrl, supabaseKey);

// ====================== DATA STATE ENGINE ======================
let processes = [
    { id: 'P1', arrival: 0, burst: 5, priority: 1 }
];
let myChart = null;
let currentUser = null;

const scenarios = {
    banking: {
        algo: 'rr',
        q: 2,
        data: [
            { id: 'TXN1', arrival: 0, burst: 4, priority: 2 },
            { id: 'TXN2', arrival: 1, burst: 3, priority: 2 },
            { id: 'BAL_CHK', arrival: 2, burst: 2, priority: 3 },
            { id: 'REPORT', arrival: 3, burst: 12, priority: 4 }
        ]
    },
    hospital: {
        algo: 'priority',
        q: 2,
        data: [
            { id: 'TRIAGE', arrival: 0, burst: 2, priority: 2 },
            { id: 'ER_SURG', arrival: 1, burst: 15, priority: 1 },
            { id: 'LAB_RES', arrival: 3, burst: 4, priority: 3 },
            { id: 'CONSULT', arrival: 5, burst: 5, priority: 4 }
        ]
    },
    embedded: {
        algo: 'sjf',
        q: 2,
        data: [
            { id: 'SENS_1', arrival: 0, burst: 1, priority: 1 },
            { id: 'SENS_2', arrival: 0, burst: 2, priority: 1 },
            { id: 'ACTUATE', arrival: 1, burst: 2, priority: 1 },
            { id: 'LOG_ERR', arrival: 2, burst: 6, priority: 3 }
        ]
    }
};

// ====================== CUSTOM CENTERED POPUP ENGINE ======================
function showAlertPopup(message, isSuccess = false) {
    const modal = document.getElementById("custom-alert-modal");
    const iconZone = document.getElementById("alert-icon-zone");
    const titleZone = document.getElementById("alert-title-zone");
    const messageZone = document.getElementById("alert-message-zone");

    if (!modal || !messageZone) return;

    messageZone.innerHTML = message;
    
    if (isSuccess) {
        iconZone.innerText = "🎉";
        titleZone.innerText = "Success";
        titleZone.style.color = "#10b981";
    } else {
        iconZone.innerText = "⚠️";
        titleZone.innerText = "Access Restricted";
        titleZone.style.color = "#f43f5e";
    }

    modal.style.display = "flex";
}

function closeCustomAlert(event) {
    if (event.target.id === "custom-alert-modal") {
        document.getElementById("custom-alert-modal").style.display = "none";
    }
}
window.closeCustomAlert = closeCustomAlert;

// ====================== WINDOW CONTROLS MODAL ======================
function openModal(id) {
    document.getElementById(id).style.display = "flex";
}
function closeModal(event, id) {
    if (event.target.className === "modal-overlay") {
        document.getElementById(id).style.display = "none";
    }
}

// ====================== SCENARIO CONTROLS ======================
function loadScenario() {
    const selector = document.getElementById("scenario-select");
    const val = selector.value;
    if (val === "custom") return;

    // AUTH GATEWAY: Blocks guest profiles from running preset scenarios using center layout component
    if (!currentUser) {
        showAlertPopup("Please log in or create an account to load pre-configured industrial workloads.", false);
        selector.value = "custom"; 
        return;
    }

    const s = scenarios[val];
    processes = JSON.parse(JSON.stringify(s.data));
    document.getElementById("algo-select").value = s.algo;
    document.getElementById("quantum").value = s.q;

    toggleRR();
    renderTable();

    setTimeout(() => {
        document.getElementById("run-btn").click();
    }, 150);
}

function toggleRR() {
    document.getElementById("rr-ui").style.display =
        document.getElementById("algo-select").value === "rr" ? "block" : "none";
}

// ====================== RENDER PROCESS TABLE ======================
function renderTable() {
    document.getElementById("p-body").innerHTML = processes.map((p, i) => `
        <tr>
            <td>
                <input type="text" value="${p.id}" style="width: 85px; font-weight: 600; color: #38bdf8;" onchange="editStr(${i},'id',this.value)">
            </td>
            <td><input type="number" value="${p.arrival}" min="0" onchange="editNum(${i},'arrival',this.value)"></td>
            <td><input type="number" value="${p.burst}" min="1" onchange="editNum(${i},'burst',this.value)"></td>
            <td><input type="number" value="${p.priority}" min="1" onchange="editNum(${i},'priority',this.value)"></td>
            <td>
                <button onclick="del(${i})" style="background:none; color:#ef4444; font-size:0.75rem; cursor:pointer; padding:0; border:none; transform:none; box-shadow:none;">
                    Remove
                </button>
            </td>
        </tr>
    `).join("");
}

window.editNum = (i, k, v) => {
    processes[i][k] = parseInt(v) || 0;
};

window.editStr = (i, k, v) => {
    processes[i][k] = v.trim() || 'P' + (i + 1);
};

window.del = (i) => {
    processes.splice(i, 1);
    renderTable();
};

document.getElementById("add-row").addEventListener("click", () => {
    processes.push({
        id: 'P' + (processes.length + 1),
        arrival: 0,
        burst: 4,
        priority: 1
    });
    renderTable();
});

// ====================== STATE RESET SYSTEM ENGINE ======================
function resetSimulatorEngine() {
    processes = [
        { id: 'P1', arrival: 0, burst: 5, priority: 1 }
    ];
    
    document.getElementById("scenario-select").value = "custom";
    document.getElementById("algo-select").value = "fcfs";
    document.getElementById("quantum").value = "2";
    
    toggleRR();
    
    document.getElementById("active-algo").innerText = "";
    document.getElementById("ai-text-content").innerHTML = `
        <p style="color: var(--text-dim); font-size: 0.85rem; margin-top: 8px;">
            Select a scenario or execute to see which algorithm is best for this workload.
        </p>
    `;
    
    if (myChart) {
        myChart.destroy();
        myChart = null;
    }
    
    document.getElementById("gantt-display").innerHTML = `
        <p style="margin: auto; color: var(--text-dim); font-style: italic;">Ready for execution...</p>
    `;
    
    renderTable();
}
window.resetSimulatorEngine = resetSimulatorEngine;

// ====================== MATHEMATICAL SCHEDULING SOLVER ======================
function solve(algo, q = 2) {
    let time = 0;
    let completed = [];
    let gantt = [];
    let pool = processes.map(p => ({ ...p, rem: p.burst, done: false }));

    if (algo === "fcfs") {
        pool.sort((a, b) => a.arrival - b.arrival);
        pool.forEach(p => {
            if (time < p.arrival) time = p.arrival;
            gantt.push({ id: p.id, len: p.burst });
            time += p.burst;
            p.finish = time;
            completed.push(p);
        });
    } 
    else if (algo === "sjf" || algo === "priority") {
        while (completed.length < pool.length) {
            let ready = pool.filter(p => p.arrival <= time && !p.done);
            if (ready.length > 0) {
                ready.sort((a, b) => algo === "sjf" ? a.burst - b.burst : a.priority - b.priority);
                let p = ready[0];
                gantt.push({ id: p.id, len: p.burst });
                time += p.burst;
                p.finish = time;
                p.done = true;
                completed.push(p);
            } else {
                time++;
            }
        }
    } 
    else if (algo === "rr") {
        let readyQ = [];
        let temp = [...pool].sort((a, b) => a.arrival - b.arrival);
        while (completed.length < pool.length) {
            temp.filter(p => p.arrival <= time && !readyQ.includes(p) && !p.done)
                .forEach(p => readyQ.push(p));

            if (readyQ.length > 0) {
                let p = readyQ.shift();
                let take = Math.min(p.rem, q);
                gantt.push({ id: p.id, len: take });
                time += take;
                p.rem -= take;

                temp.filter(p2 => p2.arrival <= time && !readyQ.includes(p2) && !p2.done && p2 !== p)
                    .forEach(p2 => readyQ.push(p2));

                if (p.rem > 0) {
                    readyQ.push(p);
                } else {
                    p.finish = time;
                    p.done = true;
                    completed.push(p);
                }
            } else {
                time++;
            }
        }
    }

    let totalWT = 0;
    completed.forEach(p => { totalWT += (p.finish - p.arrival - p.burst); });
    return { avgWT: (totalWT / pool.length).toFixed(2), gantt: gantt };
}

// ====================== AI INSIGHTS RECOMMENDATION ENGINE ======================
function updateAIRecommendation(selectedAlgo, results) {
    const algos = ["FCFS", "SJF", "Priority", "RR"];
    
    let bestIndex = 0;
    let minWT = results[0];
    for (let i = 1; i < results.length; i++) {
        if (results[i] < minWT) {
            minWT = results[i];
            bestIndex = i;
        }
    }
    const mathematicallyBest = algos[bestIndex];
    
    const bursts = processes.map(p => p.burst);
    const maxBurst = Math.max(...bursts);
    const minBurst = Math.min(...bursts);
    const hasHighVariance = (maxBurst - minBurst) > 8;
    
    let analysisText = "";
    
    if (mathematicallyBest === "SJF") {
        analysisText = `📈 <strong>Shortest Job First (SJF)</strong> is mathematically optimal here, producing the lowest average waiting time of <strong>${minWT}ms</strong>. This batch structure benefits from prioritizing rapid micro-tasks, which completely prevents bottlenecking.`;
    } else if (mathematicallyBest === "RR") {
        analysisText = `🔄 <strong>Round Robin (RR)</strong> handles this workload mix exceptionally well. By enforcing time slicing, it prevents higher-burst processes from completely freezing out shorter background threads.`;
    } else if (mathematicallyBest === "Priority") {
        analysisText = `🛡️ <strong>Priority Scheduling</strong> is recommended if execution rules depend strictly on system importance hierarchies rather than scheduling cycle optimization thresholds.`;
    } else {
        analysisText = `⏳ <strong>FCFS execution</strong> is viable here because your queue contains steady, uniform execution bursts, limiting potential performance degradations.`;
    }

    let critiqueText = "";
    if (selectedAlgo === "fcfs" && hasHighVariance) {
        critiqueText = `<p style="margin-top: 10px; color: #f43f5e; font-size: 0.8rem;">⚠️ <strong>Convoy Effect Detected:</strong> Using FCFS with long tasks mixed alongside short tasks forces quick processes to stall behind long ones, driving up your average waiting time.</p>`;
    } else if (selectedAlgo.toUpperCase() === mathematicallyBest) {
        critiqueText = `<p style="margin-top: 10px; color: #10b981; font-size: 0.8rem;">🎉 <strong>Optimal Configuration:</strong> Your selected algorithm matches the ideal analytical profile perfectly!</p>`;
    } else {
        critiqueText = `<p style="margin-top: 10px; color: #fbbf24; font-size: 0.8rem;">💡 <strong>Optimization Tip:</strong> Switching from ${selectedAlgo.toUpperCase()} to ${mathematicallyBest} could potentially drop average wait delays down to <strong>${minWT}ms</strong>.</p>`;
    }

    const aiContainer = document.getElementById("ai-text-content");
    if (aiContainer) {
        aiContainer.innerHTML = `
            <p style="color: #f1f5f9; font-size: 0.88rem; line-height: 1.5; margin-top: 8px;">
                ${analysisText}
            </p>
            ${critiqueText}
        `;
    }
}

// ====================== GANTT DISPLAY ANIMATION ======================
async function animateGantt(ganttData) {
    const display = document.getElementById("gantt-display");
    const btn = document.getElementById("run-btn");
    display.innerHTML = "";
    btn.disabled = true;

    for (const item of ganttData) {
        const block = document.createElement("div");
        block.className = "gantt-box";
        block.innerText = item.id;
        display.appendChild(block);

        await new Promise(r => setTimeout(r, 40));
        block.style.flex = item.len;
        block.style.width = "auto";
        await new Promise(r => setTimeout(r, 200));
    }
    btn.disabled = false;
}

// ====================== CORE EXECUTE ENGINE ======================
document.getElementById("run-btn").addEventListener("click", async () => {
    if (processes.length === 0) return;

    const algo = document.getElementById("algo-select").value;
    const q = parseInt(document.getElementById("quantum").value) || 2;
    const results = ["fcfs", "sjf", "priority", "rr"].map(a => parseFloat(solve(a, q).avgWT));

    document.getElementById("active-algo").innerText = `[ Current: ${algo.toUpperCase()} ]`;
    const current = solve(algo, q);

    updateAIRecommendation(algo, results);

    await animateGantt(current.gantt);

    if (myChart) myChart.destroy();
    myChart = new Chart(document.getElementById("compChart"), {
        type: "bar",
        data: {
            labels: ["FCFS", "SJF", "Priority", "RR"],
            datasets: [{
                label: "Avg Wait (ms)",
                data: results,
                backgroundColor: "#38bdf8"
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    if (currentUser) {
        await saveProcessHistory(algo, current.avgWT);
    }
});

// ====================== SECURE HISTORY & ARCHIVE PROFILE ======================
async function saveProcessHistory(algo, avgWT) {
    if (!currentUser) return;
    
    const { error } = await client.from('process_history').insert([
        {
            user_id: currentUser.id,
            algo: algo.toUpperCase(),
            avg_wt: parseFloat(avgWT),
            processes_json: processes
        }
    ]);

    if (error) {
        console.error("Historical Analytics Log Sync Failure:", error.message);
    } else {
        fetchAndRenderHistory();
    }
}

function toggleHistoryView() {
    const historySection = document.getElementById("history-section");
    if (!historySection) return;

    if (historySection.style.display === "none") {
        historySection.style.display = "block";
        fetchAndRenderHistory();
        historySection.scrollIntoView({ behavior: 'smooth' });
    } else {
        historySection.style.display = "none";
    }
}
window.toggleHistoryView = toggleHistoryView;

async function fetchAndRenderHistory() {
    const historySection = document.getElementById("history-section");
    if (!historySection) return;
    if (!currentUser) { historySection.innerHTML = ""; return; }

    const { data, error } = await client
        .from('process_history')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Failed to query runtime logouts:", error.message);
        return;
    }

    if (!data || data.length === 0) {
        historySection.innerHTML = `<h3 style="margin-top:0">Calculated Metrics Trace Log</h3><p style="color: var(--text-dim); font-style:italic;">No calculation records saved for your session profile yet.</p>`;
        return;
    }

    historySection.innerHTML = `
        <h3 style="margin-top:0; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 8px; color: var(--accent);">Your Simulation Execution Log</h3>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                <thead>
                    <tr style="color: #38bdf8; border-bottom: 2px solid var(--border);">
                        <th style="padding: 10px;">Timestamp</th>
                        <th style="padding: 10px;">Algorithm</th>
                        <th style="padding: 10px;">Avg WT (ms)</th>
                        <th style="padding: 10px;">Queue Snapshot</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => {
                        const date = new Date(item.created_at).toLocaleString();
                        const procDetails = item.processes_json.map(p => `${p.id}[A:${p.arrival},B:${p.burst}]`).join(', ');
                        return `
                            <tr style="border-bottom: 1px solid var(--border);">
                                <td style="padding: 10px; color: var(--text-dim);">${date}</td>
                                <td style="padding: 10px;"><strong>${item.algo}</strong></td>
                                <td style="padding: 10px; color: #38bdf8;">${item.avg_wt}</td>
                                <td style="padding: 10px; font-size: 0.8rem; color: #cbd5e1;">${procDetails}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ====================== AUTHENTICATION PIPELINE METRICS ======================
function updateUI(name, email = "") {
    let displayName = name;
    
    if (!displayName || displayName.trim() === "" || displayName.toLowerCase() === "user" || displayName.includes("@")) {
        displayName = email ? email.split("@")[0] : "User";
    }

    const authContainer = document.getElementById("auth-zone");
    if (authContainer) {
        authContainer.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="color:white; font-weight:600; font-size:0.85rem; white-space:nowrap;">Welcome, ${displayName}</span>
                <button onclick="logoutUser()" class="btn-login">Logout</button>
            </div>
        `;
    }
    
    const historyTabBtn = document.getElementById("history-tab-btn");
    if (historyTabBtn) historyTabBtn.style.display = "inline-block";
    fetchAndRenderHistory();
}

function resetAuthUI() {
    const authContainer = document.getElementById("auth-zone");
    if (authContainer) {
        authContainer.innerHTML = `
            <button class="btn-login" onclick="openModal('login-modal')">Log In</button>
            <button class="btn-signup" onclick="openModal('signup-modal')">Sign Up</button>
        `;
    }
    
    const historyTabBtn = document.getElementById("history-tab-btn");
    if (historyTabBtn) historyTabBtn.style.display = "none";

    const historySection = document.getElementById("history-section");
    if (historySection) {
        historySection.style.display = "none";
        historySection.innerHTML = "";
    }
}

async function registerUser(fullname, email, password) {
    if (!fullname.trim()) {
        showAlertPopup("Please fill out the Full Name field.", false);
        return;
    }

    const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: { 
            data: { 
                fullname: fullname,
                full_name: fullname
            } 
        }
    });

    if (error) {
        if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("exists")) {
            showAlertPopup("Account already exists with this email address.", false);
        } else {
            showAlertPopup(error.message, false);
        }
    } else {
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            showAlertPopup("Account already exists with this email address.", false);
            return;
        }

        if (data.user && data.session) {
            showAlertPopup("Account Created Successfully!", true);
            document.getElementById("signup-modal").style.display = "none";
            currentUser = data.user;
            updateUI(fullname, email);
        } else {
            showAlertPopup("Registration successful! Please check your email inbox for confirmation.", true);
            document.getElementById("signup-modal").style.display = "none";
        }
    }
}

async function loginUser(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email: email, password: password });

    if (error) {
        showAlertPopup(error.message, false);
    } else {
        currentUser = data.user;
        
        const fullname = data.user?.user_metadata?.fullname || 
                         data.user?.user_metadata?.full_name || 
                         "";
                         
        document.getElementById("login-modal").style.display = "none";
        updateUI(fullname, data.user?.email || email);
    }
}

async function logoutUser() {
    const { error } = await client.auth.signOut();
    if (error) {
        showAlertPopup(error.message, false);
    } else {
        currentUser = null;
        resetAuthUI();
        resetSimulatorEngine();
    }
}
window.logoutUser = logoutUser;

async function checkUser() {
    const { data: { session } } = await client.auth.getSession();
    if (session && session.user) {
        currentUser = session.user;
        
        const fullname = session.user.user_metadata?.fullname || 
                         session.user.user_metadata?.full_name || 
                         "";
                         
        updateUI(fullname, session.user.email);
    }
}

// Initialize Active Environment Engine Hooks
document.getElementById("signupBtn").addEventListener("click", () => {
    registerUser(
        document.getElementById("fullname").value, 
        document.getElementById("signupEmail").value, 
        document.getElementById("signupPassword").value
    );
});

document.getElementById("loginBtn").addEventListener("click", () => {
    loginUser(document.getElementById("email").value, document.getElementById("password").value);
});

// Seed Table Runtime Layout Execution
checkUser();
renderTable();