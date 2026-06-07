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

// ====================== WINDOW CONTROLS MODAL ======================
function openModal(id) {
    document.getElementById(id).style.display = "flex";
}
function closeModal(event, id) {
    if (event.target.className === "modal-overlay") {
        document.getElementById(id).style.none = "none";
    }
}

// ====================== SCENARIO CONTROLS ======================
function loadScenario() {
    const val = document.getElementById("scenario-select").value;
    if (val === "custom") return;

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
        alert("Please fill out the Full Name field.");
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
        // Fallback for explicit error logs returned by custom server configurations
        if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("exists")) {
            alert("Account already exists with this email address.");
        } else {
            alert(error.message);
        }
    } else {
        // THE FIX FOR FREE TIER PROJECTS:
        // If an account already exists, Supabase returns an object where the identities array is completely empty.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            alert("Account already exists with this email address.");
            return;
        }

        // If the identities array has data, it means it's a completely brand new unique user!
        if (data.user && data.session) {
            alert("Account Created Successfully!");
            document.getElementById("signup-modal").style.display = "none";
            currentUser = data.user;
            updateUI(fullname, email);
        } else {
            // Fallback for email confirmation link workflows
            alert("Registration successful! Please check your email inbox for confirmation.");
            document.getElementById("signup-modal").style.display = "none";
        }
    }
}
async function loginUser(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email: email, password: password });

    if (error) {
        alert(error.message);
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
        alert(error.message);
    } else {
        currentUser = null;
        resetAuthUI();
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