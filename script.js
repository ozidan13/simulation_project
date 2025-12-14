// --- NAVIGATION ---
function switchTab(tabId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    document.querySelector(`button[onclick="switchTab('${tabId}')"]`).classList.add('active');
}

// --- HELPER FUNCTIONS ---
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round(num) {
    return Math.round(num * 100) / 100;
}

// --- 1. ANALYTICAL CALCULATOR ---
function calculateAnalytical() {
    const lambda = parseFloat(document.getElementById('calc-lambda').value);
    const mu = parseFloat(document.getElementById('calc-mu').value);
    const c1 = parseFloat(document.getElementById('cost-c1').value);
    const c2 = parseFloat(document.getElementById('cost-c2').value);

    const warning = document.getElementById('traffic-warning');

    if (lambda >= mu) {
        warning.style.display = 'block';
        document.getElementById('analytical-results').innerHTML = "System Unstable (Infinite Queue)";
        document.getElementById('total-cost-display').innerText = "Infinite Cost";
        return;
    }

    warning.style.display = 'none';

    const R = (lambda / mu);
    const Ls = lambda / (mu - lambda);
    const Lq = (lambda * lambda) / (mu * (mu - lambda));
    const Ws = 1 / (mu - lambda);
    const Wq = lambda / (mu * (mu - lambda));

    // Cost assuming 1 server
    const totalCost = (c1 * 1) + (c2 * Ls);

    document.getElementById('analytical-results').innerHTML = `
    Utilization (R): ${(R * 100).toFixed(2)}%<br>
    Ls (Cust in Sys): ${Ls.toFixed(2)}<br>
    Lq (Queue Len): ${Lq.toFixed(2)}<br>
    Ws (Wait Sys): ${Ws.toFixed(2)} hr<br>
    Wq (Wait Queue): ${Wq.toFixed(2)} hr
`;

    document.getElementById('total-cost-display').innerText = `Total Cost: $${totalCost.toFixed(2)} / hr`;
}

// --- 2. SINGLE SERVER SIMULATION ---
function runSingleServerSim() {
    const n = parseInt(document.getElementById('sim-count').value);
    const arrMin = parseInt(document.getElementById('arrival-min').value);
    const arrMax = parseInt(document.getElementById('arrival-max').value);
    const serMin = parseInt(document.getElementById('service-min').value);
    const serMax = parseInt(document.getElementById('service-max').value);

    const tableBody = document.querySelector('#ss-table tbody');
    tableBody.innerHTML = '';

    let arrivalClock = 0;
    let serviceEnd = 0;

    let totalWait = 0;
    let totalSystem = 0;
    let totalIdle = 0;
    let waitCount = 0;
    let totalServiceTime = 0;

    // First customer logic: Arrival is at t=0 (assumption from lecture examples)
    // Actually, lecture examples often start Interarrival at "-" for first, or random.
    // We will generate Interarrival for all, but Cust 1 arrives at t=0 usually in simple mesh.
    // Let's assume Cust 1 arrives at t=0 for simplicity, or generate random. 
    // Lecture Table: Cust 1 has Interarrival "-", Arrival Clock 0.

    for (let i = 1; i <= n; i++) {
        let interarrival = (i === 1) ? 0 : getRandomInt(arrMin, arrMax);
        arrivalClock += interarrival;

        let serviceTime = getRandomInt(serMin, serMax);
        totalServiceTime += serviceTime;

        let serviceBegin = Math.max(arrivalClock, serviceEnd);
        let idle = (i === 1) ? 0 : (serviceBegin - serviceEnd); // Idle time *before* this service starts

        // Correction: Idle time is tracked for the server.
        // If Arrival > Previous Service End, Server was idle.
        // For Cust 1, idle is 0 (assumed ready).

        if (i > 1 && arrivalClock > serviceEnd) {
            // idle += (arrivalClock - serviceEnd); 
            // Logic already handled by serviceBegin math above, just need to record it.
        }
        // Actually, simply: Idle = ServiceBegin - PreviousServiceEnd. 
        // Need to store PreviousServiceEnd before updating it.
        let prevEnd = (i === 1) ? 0 : serviceEnd; // Reset temp var logic is tricky in loop
        // Let's use the calculated variable:
        let thisIdle = serviceBegin - ((i === 1) ? 0 : prevEnd);
        if (i === 1) thisIdle = 0; // Lecture convention

        serviceEnd = serviceBegin + serviceTime;

        let waitQueue = serviceBegin - arrivalClock;
        let timeSystem = serviceEnd - arrivalClock;

        totalWait += waitQueue;
        totalSystem += timeSystem;
        if (waitQueue > 0) waitCount++;
        if (i > 1) totalIdle += (serviceBegin - prevEnd); // Accumulate idle

        const row = `<tr>
        <td>${i}</td>
        <td>${(i === 1) ? '-' : interarrival}</td>
        <td>${arrivalClock}</td>
        <td>${serviceTime}</td>
        <td>${serviceBegin}</td>
        <td>${serviceEnd}</td>
        <td>${waitQueue}</td>
        <td>${timeSystem}</td>
        <td>${(i === 1) ? 0 : (serviceBegin - prevEnd)}</td>
    </tr>`;
        tableBody.innerHTML += row;

        // Update for next loop logic needs true previous end, which is 'serviceEnd' before update? 
        // No, serviceEnd is updated for this customer. Next loop uses it.
    }

    // Stats
    document.getElementById('ss-avg-wait').innerText = (totalWait / n).toFixed(2);
    document.getElementById('ss-util').innerText = ((totalServiceTime / serviceEnd) * 100).toFixed(1) + '%';
    // Note: Utilization = Total Service / Total Run Time. Run Time = End of last service.
    document.getElementById('ss-idle').innerText = totalIdle;
    document.getElementById('ss-prob-wait').innerText = ((waitCount / n) * 100).toFixed(0) + '%';
}

// --- 3. MULTI-SERVER SIMULATION ---
function runMultiServerSim() {
    // Hardcoded distributions for demo (Able: 2-5, Baker: 3-6)
    // Interarrival: 1-4
    const n = 50;
    let tableBody = document.querySelector('#ms-table tbody');
    tableBody.innerHTML = '';

    let arrivalClock = 0;
    let ableFree = 0;
    let bakerFree = 0;

    let ableBusyTime = 0;
    let bakerBusyTime = 0;

    for (let i = 1; i <= n; i++) {
        let interarrival = (i === 1) ? 0 : getRandomInt(1, 4);
        arrivalClock += interarrival;

        let server = '';
        let serviceTime = 0;
        let start = 0;
        let end = 0;

        // Logic: Check availability at Arrival Time
        let ableAvailable = (ableFree <= arrivalClock);
        let bakerAvailable = (bakerFree <= arrivalClock);

        if (ableAvailable && bakerAvailable) {
            server = 'Able'; // Priority Rule
        } else if (ableAvailable) {
            server = 'Able';
        } else if (bakerAvailable) {
            server = 'Baker';
        } else {
            // Both busy, find who finishes first
            if (ableFree <= bakerFree) server = 'Able';
            else server = 'Baker';
        }

        // Generate Service Time
        if (server === 'Able') {
            serviceTime = getRandomInt(2, 5); // Able is faster
            start = Math.max(arrivalClock, ableFree);
            end = start + serviceTime;
            ableFree = end;
            ableBusyTime += serviceTime;
        } else {
            serviceTime = getRandomInt(3, 6); // Baker is slower
            start = Math.max(arrivalClock, bakerFree);
            end = start + serviceTime;
            bakerFree = end;
            bakerBusyTime += serviceTime;
        }

        let wait = start - arrivalClock;

        let tagClass = (server === 'Able') ? 'able' : 'baker';

        tableBody.innerHTML += `<tr>
        <td>${i}</td>
        <td>${arrivalClock}</td>
        <td><span class="tag ${tagClass}">${server}</span></td>
        <td>${start}</td>
        <td>${serviceTime}</td>
        <td>${end}</td>
        <td>${wait}</td>
    </tr>`;
    }

    let endTime = Math.max(ableFree, bakerFree);
    document.getElementById('ms-able-util').innerText = ((ableBusyTime / endTime) * 100).toFixed(1) + '%';
    document.getElementById('ms-baker-util').innerText = ((bakerBusyTime / endTime) * 100).toFixed(1) + '%';
}

// --- 4. INVENTORY SIMULATION ---
function runInventorySim() {
    const M = parseInt(document.getElementById('inv-m').value);
    const N = parseInt(document.getElementById('inv-n').value);
    let currentInv = parseInt(document.getElementById('inv-start').value);

    const days = 20;
    let tableBody = document.querySelector('#inv-table tbody');
    let chartContainer = document.getElementById('inv-chart');

    tableBody.innerHTML = '';
    chartContainer.innerHTML = '';

    let pendingOrderAmount = 0;
    let orderArrivalDay = -1;

    for (let day = 1; day <= days; day++) {
        let cycle = Math.ceil(day / N);
        let demand = getRandomInt(0, 4); // Based on lecture prob range roughly

        // Receive Order?
        if (day === orderArrivalDay) {
            currentInv += pendingOrderAmount;
            pendingOrderAmount = 0;
            orderArrivalDay = -1;
        }

        let begInv = currentInv;
        let shortage = 0;

        // Satisfy Demand
        if (demand > currentInv) {
            shortage = demand - currentInv;
            currentInv = 0;
        } else {
            currentInv -= demand;
        }

        let endInv = currentInv;
        let orderQty = '-';
        let leadTime = '-';

        // Review?
        if (day % N === 0) {
            // Lecture Formula: Order = M - EndInv + Shortage
            let qty = M - endInv + shortage;
            orderQty = qty;
            leadTime = getRandomInt(1, 3);
            pendingOrderAmount = qty;
            orderArrivalDay = day + leadTime;
        }

        // Visual Bar
        let barHeight = (endInv / M) * 100;
        chartContainer.innerHTML += `<div class="bar" style="height:${barHeight}%" title="Day ${day}: ${endInv}"></div>`;

        tableBody.innerHTML += `<tr>
        <td>${cycle}</td>
        <td>${day}</td>
        <td>${begInv}</td>
        <td>${demand}</td>
        <td><strong>${endInv}</strong></td>
        <td>${(shortage > 0) ? `<span style="color:red">${shortage}</span>` : 0}</td>
        <td>${orderQty}</td>
        <td>${leadTime}</td>
    </tr>`;
    }
}

// --- 5. RNG ---
function generateLCG() {
    const a = parseInt(document.getElementById('lcg-a').value);
    const c = parseInt(document.getElementById('lcg-c').value);
    const m = parseInt(document.getElementById('lcg-m').value);
    let z = parseInt(document.getElementById('lcg-seed').value);

    let output = [];
    // Generate period
    for (let i = 0; i < m + 2; i++) {
        z = (a * z + c) % m;
        output.push(z);
    }

    document.getElementById('lcg-output').innerText = "Sequence: " + output.join(" → ");
}

function runChiSquare() {
    // Generate 100 random numbers (0-99 scaled to 0-1 for bins)
    // Or actually Math.random() is [0,1).
    const n = 100;
    const k = 10; // 10 intervals
    const expected = n / k; // 10
    let obs = new Array(k).fill(0);

    for (let i = 0; i < n; i++) {
        let r = Math.random();
        let bin = Math.floor(r * k);
        obs[bin]++;
    }

    let chiCalc = 0;
    let html = '';

    for (let i = 0; i < k; i++) {
        let O = obs[i];
        let E = expected;
        let term = Math.pow(O - E, 2) / E;
        chiCalc += term;

        html += `<tr>
        <td>[${(i / 10).toFixed(1)}, ${(i + 1) / 10 >= 1 ? '1.0' : ((i + 1) / 10).toFixed(1)})</td>
        <td>${O}</td>
        <td>${E}</td>
        <td>${term.toFixed(2)}</td>
    </tr>`;
    }

    document.querySelector('#chi-table tbody').innerHTML = html;

    // Critical value for alpha=0.05, df=9 is 16.9
    let resultText = `Calculated Chi-Square: <strong>${chiCalc.toFixed(2)}</strong>. <br>`;
    if (chiCalc < 16.9) {
        resultText += `<span style="color:green">Accept Null Hypothesis (Uniform). Value < 16.9</span>`;
    } else {
        resultText += `<span style="color:red">Reject Null Hypothesis (Not Uniform). Value > 16.9</span>`;
    }
    document.getElementById('chi-result').innerHTML = resultText;
}

// --- 6. PRACTICE ---
function checkQ1() {
    const ans = document.getElementById('q1-ans').value.toLowerCase();
    const fb = document.getElementById('q1-fb');
    fb.classList.remove('hidden');
    if (ans.includes('120') || ans.includes('impossible') || ans.includes('unstable') || ans.includes('infinite')) {
        fb.style.color = 'green';
        fb.innerText = "Correct! Utilization > 100% means the system is unstable and queue grows infinitely.";
    } else {
        fb.style.color = 'red';
        fb.innerText = "Incorrect. Rate is 6/5 = 1.2 or 120%. Think about stability.";
    }
}

function checkQ2() {
    const ans = parseInt(document.getElementById('q2-ans').value);
    const fb = document.getElementById('q2-fb');
    fb.classList.remove('hidden');
    // Q = M - End + Shortage = 10 - 4 + 1 = 7
    if (ans === 7) {
        fb.style.color = 'green';
        fb.innerText = "Correct! Q = 10 - 4 + 1 = 7.";
    } else {
        fb.style.color = 'red';
        fb.innerText = "Incorrect. Remember: Q = M - EndingInv + Shortage.";
    }
}

function checkQ3() {
    const ans = document.getElementById('q3-ans').value;
    const fb = document.getElementById('q3-fb');
    fb.classList.remove('hidden');
    if (ans === 'Baker') {
        fb.style.color = 'green';
        fb.innerText = "Correct! Able is busy (free at 12, arrival at 10). Baker is free at 10.";
    } else {
        fb.style.color = 'red';
        fb.innerText = "Incorrect. Check availability at t=10. Able is busy until 12.";
    }
}

// Init Analytical
calculateAnalytical();

