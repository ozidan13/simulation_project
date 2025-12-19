// --- NAVIGATION ---
function switchTab(tabId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    document.querySelector(`button[onclick="switchTab('${tabId}')"]`).classList.add('active');
}

// --- HELPER FUNCTIONS ---
// --- HELPER FUNCTIONS ---
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

// Globals for tables
// Globals for tables
const ssIaDist = new DistributionTable('ss-ia-dist-table', 3); // 3-digit
const ssStDist = new DistributionTable('ss-st-dist-table', 2); // 2-digit
const msIaDist = new DistributionTable('ms-ia-dist-table', 2); // 2-digit per PDF
const msAbleDist = new DistributionTable('ms-able-dist-table', 2);
const msBakerDist = new DistributionTable('ms-baker-dist-table', 2);
const invDemDist = new DistributionTable('inv-dem-dist-table', 2); // 2-digit
const invLtDist = new DistributionTable('inv-lt-dist-table', 1); // 1-digit (0-9)

// Register in global map (utils.js)
distTables['ss-ia'] = ssIaDist;
distTables['ss-st'] = ssStDist;
distTables['ms-ia'] = msIaDist;
distTables['ms-able'] = msAbleDist;
distTables['ms-baker'] = msBakerDist;
distTables['inv-dem'] = invDemDist;
distTables['inv-lt'] = invLtDist;

const DIST_MAP = {
    'ss-ia': ssIaDist,
    'ss-st': ssStDist,
    'ms-ia': msIaDist,
    'ms-able': msAbleDist,
    'ms-baker': msBakerDist,
    'inv-dem': invDemDist,
    'inv-lt': invLtDist
};

// Initialize with some default rows
// Initialize with some default rows
window.addEventListener('DOMContentLoaded', () => {
    // Single Server defaults (3-digit Interarrival, 1..8, 0.125 each)
    for (let i = 1; i <= 8; i++) {
        addDistRow('ss-ia', i, 0.125);
    }

    // Service Defaults (2-digit, Lecture Ex)
    addDistRow('ss-st', 1, 0.10);
    addDistRow('ss-st', 2, 0.20);
    addDistRow('ss-st', 3, 0.30);
    addDistRow('ss-st', 4, 0.25);
    addDistRow('ss-st', 5, 0.10);
    addDistRow('ss-st', 6, 0.05);

    // Multi Server defaults (Call Center Example)
    addDistRow('ms-ia', 1, 0.25);
    addDistRow('ms-ia', 2, 0.40);
    addDistRow('ms-ia', 3, 0.20);
    addDistRow('ms-ia', 4, 0.15);

    addDistRow('ms-able', 2, 0.30);
    addDistRow('ms-able', 3, 0.28);
    addDistRow('ms-able', 4, 0.25);
    addDistRow('ms-able', 5, 0.17);

    addDistRow('ms-baker', 3, 0.35);
    addDistRow('ms-baker', 4, 0.25);
    addDistRow('ms-baker', 5, 0.20);
    addDistRow('ms-baker', 6, 0.20);

    // Inventory Defaults
    // Demand (0-4)
    addDistRow('inv-dem', 0, 0.10);
    addDistRow('inv-dem', 1, 0.25);
    addDistRow('inv-dem', 2, 0.35);
    addDistRow('inv-dem', 3, 0.21);
    addDistRow('inv-dem', 4, 0.09);

    // Lead Time (1-3)
    addDistRow('inv-lt', 1, 0.60);
    addDistRow('inv-lt', 2, 0.30);
    addDistRow('inv-lt', 3, 0.10);
});

// --- 2. SINGLE SERVER SIMULATION ---
function runSingleServerSim() {
    try {
        // 1. Inputs
        const nInput = document.getElementById('ss-n');
        if (!nInput) throw new Error("Input 'ss-n' not found.");
        const n = parseInt(nInput.value);
        if (isNaN(n) || n < 1) throw new Error("Invalid Number of Customers.");

        const errorBox = document.getElementById('ss-error');
        errorBox.style.display = 'none';

        // 2. Validate Distributions
        const checkSum = (dist) => (dist.rows.length > 0 ? dist.rows[dist.rows.length - 1].cumProb : 0);

        // Strict 1.0 check
        if (Math.abs(checkSum(ssIaDist) - 1.0) > 0.00001) {
            throw new Error(`Interarrival Probabilities sum to ${checkSum(ssIaDist).toFixed(4)}, must be 1.0`);
        }
        if (Math.abs(checkSum(ssStDist) - 1.0) > 0.00001) {
            throw new Error(`Service Probabilities sum to ${checkSum(ssStDist).toFixed(4)}, must be 1.0`);
        }

        // 3. Parse inputs - NO AUTO-FILL
        const rdArrInput = document.getElementById('ss-rd-arr').value;
        const rdSvcInput = document.getElementById('ss-rd-svc').value;

        const arrStream = new RandomDigitStream(rdArrInput);
        const svcStream = new RandomDigitStream(rdSvcInput);

        if (arrStream.count < (n - 1)) {
            throw new Error(`Not enough Arrival digits. Need ${n - 1}, found ${arrStream.count}.`);
        }
        if (svcStream.count < n) {
            throw new Error(`Not enough Service digits. Need ${n}, found ${svcStream.count}.`);
        }

        // 4. Run
        let tableBody = document.querySelector('#ss-table tbody');
        tableBody.innerHTML = '';

        let arrivalClock = 0;
        let serviceEndPrev = 0;

        // Performance
        let totalWaitQueue = 0;
        let numWhoWait = 0;
        let totalServiceTime = 0;
        let sumInterarrival = 0;
        let totalTimeInSystem = 0;
        let totalIdleTime = 0;
        let totalRunTime = 0; // Time Service Ends of last customer

        for (let i = 1; i <= n; i++) {
            let rdArrStr = '-';
            let interarrival = '-';

            if (i === 1) {
                arrivalClock = 0;
            } else {
                rdArrStr = arrStream.next();
                interarrival = ssIaDist.lookup(rdArrStr);
                if (interarrival === null) throw new Error(`Invalid Arrival RD '${rdArrStr}' at index ${i}.`);
                arrivalClock += interarrival;
                sumInterarrival += interarrival;
            }

            let rdSvcStr = svcStream.next();
            let serviceTime = ssStDist.lookup(rdSvcStr);
            if (serviceTime === null) throw new Error(`Invalid Service RD '${rdSvcStr}' at index ${i}.`);

            let serviceBegin = Math.max(arrivalClock, serviceEndPrev);
            let serviceEnd = serviceBegin + serviceTime;
            let waitQueue = serviceBegin - arrivalClock;
            let timeInSystem = serviceEnd - arrivalClock;
            let idleTime = Math.max(0, arrivalClock - serviceEndPrev);

            // Special case for first customer, idle time is 0 (assumed started at 0) OR
            // If we consider idle time of server before first customer comes? Usually 0 if starts at 0.
            if (i === 1) idleTime = arrivalClock; // If arrives at 0, idle=0. If arrives at 5, idle=5? Lecture usually assumes starts at 0.

            serviceEndPrev = serviceEnd;
            totalRunTime = serviceEnd;

            totalWaitQueue += waitQueue;
            if (waitQueue > 0) numWhoWait++;
            totalServiceTime += serviceTime;
            totalTimeInSystem += timeInSystem;
            totalIdleTime += idleTime;

            const row = `<tr>
                <td>${i}</td>
                <td>${rdArrStr}</td>
                <td>${interarrival}</td>
                <td>${arrivalClock}</td>
                <td>${rdSvcStr}</td>
                <td>${serviceTime}</td>
                <td>${serviceBegin}</td>
                <td>${serviceEnd}</td>
                <td>${waitQueue}</td>
                <td>${timeInSystem}</td>
                <td>${idleTime}</td>
            </tr>`;
            tableBody.innerHTML += row;
        }

        // 5. Results
        document.getElementById('ss-res-avg-wait').innerText = (totalWaitQueue / n).toFixed(2);
        document.getElementById('ss-res-prob-wait').innerText = (numWhoWait / n).toFixed(2);
        document.getElementById('ss-res-prob-idle').innerText = (totalIdleTime / totalRunTime).toFixed(2);
        document.getElementById('ss-res-avg-svc').innerText = (totalServiceTime / n).toFixed(2);
        document.getElementById('ss-res-avg-ia').innerText = (sumInterarrival / (n - 1)).toFixed(2);
        let avgWaitCond = (numWhoWait > 0) ? (totalWaitQueue / numWhoWait) : 0;
        document.getElementById('ss-res-avg-wait-cond').innerText = avgWaitCond.toFixed(2);
        document.getElementById('ss-res-avg-sys').innerText = (totalTimeInSystem / n).toFixed(2);

        // Check verification
        let checkVal = (totalWaitQueue / n) + (totalServiceTime / n); // avg wait + avg svc
        document.getElementById('ss-res-check').innerText = checkVal.toFixed(2);

    } catch (e) {
        const err = document.getElementById('ss-error');
        if (err) {
            err.style.display = 'block';
            err.innerText = "Error: " + e.message;
        }
        console.error(e);
    }
}

// --- 3. MULTI-SERVER SIMULATION ---
function runMultiServerSim() {
    try {
        const nInput = document.getElementById('ms-n');
        if (!nInput) throw new Error("Input 'ms-n' not found.");
        const n = parseInt(nInput.value);
        const rule = document.getElementById('ms-rule').value;
        const errorBox = document.getElementById('ms-error');
        errorBox.style.display = 'none';

        // 1. Validate
        const checkSum = (dist) => (dist.rows.length > 0 ? dist.rows[dist.rows.length - 1].cumProb : 0);
        if (Math.abs(checkSum(msIaDist) - 1.0) > 0.00001) throw new Error("IA Probabilities sum != 1.0");
        if (Math.abs(checkSum(msAbleDist) - 1.0) > 0.00001) throw new Error("Able Probabilities sum != 1.0");
        if (Math.abs(checkSum(msBakerDist) - 1.0) > 0.00001) throw new Error("Baker Probabilities sum != 1.0");

        // NO AUTO-FILL
        const rdArrInput = document.getElementById('ms-rd-arr').value;
        const rdSvcInput = document.getElementById('ms-rd-svc').value;
        const arrStream = new RandomDigitStream(rdArrInput);
        const svcStream = new RandomDigitStream(rdSvcInput);

        if (arrStream.count < (n - 1)) throw new Error(`Not enough Arrival digits. Need ${n - 1}, found ${arrStream.count}.`);
        if (svcStream.count < n) throw new Error(`Not enough Service digits. Need ${n}, found ${svcStream.count}.`);

        // 2. Run
        let tableBody = document.querySelector('#ms-table tbody');
        tableBody.innerHTML = '';

        let clock = 0;
        let ableFree = 0;
        let bakerFree = 0;

        let ableBusyTime = 0;
        let bakerBusyTime = 0;

        for (let i = 1; i <= n; i++) {
            let rdArrStr = '-';
            let iaTime = '-';

            if (i > 1) {
                rdArrStr = arrStream.next();
                iaTime = msIaDist.lookup(rdArrStr);
                if (iaTime === null) throw new Error(`Invalid IA RD '${rdArrStr}'`);
                clock += iaTime;
            } else {
                clock = 0;
            }

            let arrivalTime = clock;
            let server = '';

            // Server Selection Logic
            // 1. Check current status
            let ableIdle = (arrivalTime >= ableFree);
            let bakerIdle = (arrivalTime >= bakerFree);

            if (ableIdle && bakerIdle) {
                // Both Idle => Use Rule
                server = (rule === 'able') ? 'able' : 'baker';
            } else if (ableIdle) {
                server = 'able';
            } else if (bakerIdle) {
                server = 'baker';
            } else {
                // Both Busy => Choose earliest free time
                // If tie, use Rule
                if (ableFree < bakerFree) {
                    server = 'able';
                } else if (bakerFree < ableFree) {
                    server = 'baker';
                } else {
                    // Tie in free time
                    server = (rule === 'able') ? 'able' : 'baker';
                }
            }

            let rdSvcStr = svcStream.next();
            let svcTime = 0;
            let start = 0;
            let end = 0;
            let ableStart = '-', ableTime = '-', ableEnd = '-';
            let bakerStart = '-', bakerTime = '-', bakerEnd = '-';

            if (server === 'able') {
                svcTime = msAbleDist.lookup(rdSvcStr);
                if (svcTime === null) throw new Error(`Invalid Able RD '${rdSvcStr}'`);
                start = Math.max(arrivalTime, ableFree);
                end = start + svcTime;
                ableFree = end;
                ableBusyTime += svcTime;
                ableStart = start; ableTime = svcTime; ableEnd = end;
            } else {
                svcTime = msBakerDist.lookup(rdSvcStr);
                if (svcTime === null) throw new Error(`Invalid Baker RD '${rdSvcStr}'`);
                start = Math.max(arrivalTime, bakerFree);
                end = start + svcTime;
                bakerFree = end;
                bakerBusyTime += svcTime;
                bakerStart = start; bakerTime = svcTime; bakerEnd = end;
            }

            let timeInQueue = start - arrivalTime;

            const row = `<tr>
                <td>${i}</td>
                <td>${rdArrStr}</td>
                <td>${iaTime === '-' ? 0 : iaTime}</td>
                <td>${arrivalTime}</td>
                <td>${rdSvcStr}</td>
                <td>${ableStart}</td>
                <td>${ableTime}</td>
                <td>${ableEnd}</td>
                <td>${bakerStart}</td>
                <td>${bakerTime}</td>
                <td>${bakerEnd}</td>
                <td>${timeInQueue}</td>
            </tr>`;
            tableBody.innerHTML += row;
        }

        let totalSimTime = Math.max(ableFree, bakerFree);
        document.getElementById('ms-res-able-util').innerText = ((ableBusyTime / totalSimTime) * 100).toFixed(2) + '%';
        document.getElementById('ms-res-baker-util').innerText = ((bakerBusyTime / totalSimTime) * 100).toFixed(2) + '%';

    } catch (e) {
        const err = document.getElementById('ms-error');
        if (err) {
            err.style.display = 'block';
            err.innerText = "Error: " + e.message;
        }
        console.error(e);
    }
}

// --- 4. INVENTORY SIMULATION ---
function runInventorySim() {
    try {
        const mInput = document.getElementById('inv-m');
        if (!mInput) throw new Error("Input 'inv-m' not found.");

        const M = parseInt(mInput.value);
        const N = parseInt(document.getElementById('inv-n').value);
        const cycles = parseInt(document.getElementById('inv-cycles').value);
        const startInv = parseInt(document.getElementById('inv-start').value);
        const initOrderQty = parseInt(document.getElementById('inv-init-order').value) || 0;
        const initOrderDaysInfo = parseInt(document.getElementById('inv-init-days').value) || 0;

        const errorBox = document.getElementById('inv-error');
        errorBox.style.display = 'none';

        const checkSum = (dist) => (dist.rows.length > 0 ? dist.rows[dist.rows.length - 1].cumProb : 0);
        if (Math.abs(checkSum(invDemDist) - 1.0) > 0.00001) throw new Error("Demand Probabilities sum != 1.0");
        if (Math.abs(checkSum(invLtDist) - 1.0) > 0.00001) throw new Error("Lead Time Probabilities sum != 1.0");

        const totalDays = cycles * N;

        // NO AUTO-FILL
        const rdDemInput = document.getElementById('inv-rd-dem').value;
        const rdLtInput = document.getElementById('inv-rd-lt').value;
        const demStream = new RandomDigitStream(rdDemInput);
        const ltStream = new RandomDigitStream(rdLtInput);

        if (demStream.count < totalDays) throw new Error(`Not enough Demand RDs. Need ${totalDays}, found ${demStream.count}.`);
        if (ltStream.count < cycles) throw new Error(`Not enough Lead Time RDs. Need ${cycles}, found ${ltStream.count}.`);

        let tableBody = document.querySelector('#inv-table tbody');
        tableBody.innerHTML = '';

        let onHand = startInv;
        let outstandingQty = initOrderQty;
        let daysUntilArrival = initOrderDaysInfo;

        let totalEndingInv = 0;
        let daysShortage = 0;

        for (let cycle = 1; cycle <= cycles; cycle++) {
            for (let dayInRange = 1; dayInRange <= N; dayInRange++) {

                // 1. Order Arrival (Start of Day)
                if (daysUntilArrival > 0) {
                    daysUntilArrival--;
                    if (daysUntilArrival === 0) {
                        onHand += outstandingQty;
                        outstandingQty = 0;
                    }
                }

                let begInv = onHand;

                // 2. Demand
                let rdDemStr = demStream.next();
                let demand = invDemDist.lookup(rdDemStr);
                if (demand === null) throw new Error(`Invalid Demand RD '${rdDemStr}'`);

                let shortage = 0;
                if (onHand >= demand) {
                    onHand -= demand;
                    shortage = 0;
                } else {
                    shortage = demand - onHand;
                    onHand = 0;
                }

                let endInv = onHand;
                if (shortage > 0) daysShortage++;
                totalEndingInv += endInv;

                // 3. Review / Order (End of Day, Only if Day==N)
                let orderQty = '-';
                let rdLtStr = '-';

                // Keep track of what we show for "Days until Order Arrives"
                // Usually showed countdown. If order arrives today, it showed 0 or -? 
                // Lecture: "Days until Order Arrives" often shows the lead time generated on review day.
                // Or the outstanding count logic.
                // We will match the logic: show remaining days if waiting.

                let displayDaysToArrive = (outstandingQty > 0 || daysUntilArrival > 0) ? daysUntilArrival : '-';

                if (dayInRange === N) {
                    // Place Order
                    let Q = M - endInv + shortage;
                    orderQty = Q;
                    rdLtStr = ltStream.next();
                    let leadTime = invLtDist.lookup(rdLtStr);
                    if (leadTime === null) throw new Error(`Invalid Lead Time RD '${rdLtStr}'`);

                    outstandingQty = Q;
                    daysUntilArrival = leadTime;

                    // Display the newly generated lead time in the last column
                    displayDaysToArrive = leadTime;
                }

                const row = `<tr>
                    <td>${cycle}</td>
                    <td>${dayInRange}</td>
                    <td>${begInv}</td>
                    <td>${rdDemStr}</td>
                    <td>${demand}</td>
                    <td>${endInv}</td>
                    <td>${shortage}</td>
                    <td>${orderQty}</td>
                    <td>${rdLtStr}</td>
                    <td>${displayDaysToArrive}</td>
                </tr>`;
                tableBody.innerHTML += row;
            }
        }

        document.getElementById('inv-res-avg-end').innerText = (totalEndingInv / totalDays).toFixed(2);
        document.getElementById('inv-res-shortage').innerText = daysShortage;

    } catch (e) {
        const err = document.getElementById('inv-error');
        if (err) {
            err.style.display = 'block';
            err.innerText = "Error: " + e.message;
        }
        console.error(e);
    }
}

// --- 5. RNG ALGORITHMS & TESTS ---

function generateLCG() {
    const a = parseInt(document.getElementById('lcg-a').value);
    const c = parseInt(document.getElementById('lcg-c').value);
    const m = parseInt(document.getElementById('lcg-m').value);
    let z = parseInt(document.getElementById('lcg-seed').value);

    // Get table body and clear it
    const tableBody = document.querySelector('#lcg-table tbody');
    tableBody.innerHTML = '';

    // Safety limit to prevent infinite loops if m is huge or loop intended
    const limit = Math.min(m * 2, 50);

    // 1. Initial Row (i=0)
    let html = `<tr>
        <td>0</td>
        <td>${z}</td>
        <td>-</td>
    </tr>`;

    // 2. Loop
    for (let i = 1; i <= limit; i++) {
        z = (a * z + c) % m;
        let u = (z / m).toFixed(3); // Round to 3 decimals distinct

        html += `<tr>
            <td>${i}</td>
            <td>${z}</td>
            <td>${u}</td>
        </tr>`;
    }

    tableBody.innerHTML = html;
}

// Critical Values Table (Approximation or Subset)
// Keys: alpha -> df
const CHI_CRITICAL_05 = {
    1: 3.84, 2: 5.99, 3: 7.81, 4: 9.49, 5: 11.1,
    6: 12.6, 7: 14.1, 8: 15.5, 9: 16.9, 10: 18.3,
    11: 19.7, 12: 21.0, 13: 22.4, 14: 23.7, 15: 25.0,
    16: 26.3, 17: 27.6, 18: 28.9, 19: 30.1, 20: 31.4
};

function getChiCritical(alpha, df) {
    // Exact lookup for alpha = 0.05 which is the standard requirement
    if (alpha == "0.05") {
        if (CHI_CRITICAL_05[df]) return CHI_CRITICAL_05[df];
    }

    // Fallback or other alphas (using the old subset or approximation if needed)
    // For now, we prioritize the 0.05 set requested.
    if (CHI_CRITICAL[alpha] && CHI_CRITICAL[alpha][df]) return CHI_CRITICAL[alpha][df];

    // Approximation for large df
    if (df > 20) {
        // Wilson-Hilferty approx for alpha=0.05 (z=1.645)
        // For alpha=0.05, z approx 1.645
        return parseFloat((df * Math.pow(1 - 2 / (9 * df) + 1.645 * Math.sqrt(2 / (9 * df)), 3)).toFixed(2));
    }
    return null;
}

function runChiSquare() {
    try {
        // Inputs
        const N = parseInt(document.getElementById('chi-n').value);
        const k = parseInt(document.getElementById('chi-k').value); // Classes
        const alpha = document.getElementById('chi-alpha').value;

        // 1. Get Random Numbers from Input
        const rdInput = document.getElementById('chi-rd-input').value;
        if (!rdInput.trim()) throw new Error("Please enter random numbers.");

        // Parse stream (allow space, comma, newline)
        let stream = rdInput.trim().split(/[\s,]+/).filter(x => x !== '').map(parseFloat);

        // Validation
        if (stream.some(isNaN)) throw new Error("Invalid number found in input.");
        if (stream.length !== N) {
            throw new Error(`Input count (${stream.length}) does not match Sample Size N (${N}).`);
        }

        // Check range [0, 1]
        if (stream.some(x => x < 0 || x >= 1)) throw new Error("Random numbers must be between 0 and 1 (exclusive of 1).");

        // 2. Observations
        let observed = new Array(k).fill(0);
        // Interval width = 1/k
        for (let r of stream) {
            let bin = Math.floor(r * k);
            if (bin >= k) bin = k - 1; // Safety for 1.0 (though input should be < 1)
            observed[bin]++;
        }

        // 3. Expected
        let expected = N / k;

        // 4. Calc Statistic & Build Detailed Table
        let chiCalc = 0;
        let tableHtml = '';

        // Header for Detailed Table
        // Columns: Interval | Oi | Ei | Oi - Ei | (Oi - Ei)² | (Oi - Ei)²/Ei
        let totalOi = 0;
        let totalChiTerm = 0;

        for (let i = 0; i < k; i++) {
            let O = observed[i];
            let E = expected;
            let diff = O - E;
            let diffSq = Math.pow(diff, 2);
            let term = diffSq / E;

            chiCalc += term;
            totalOi += O;
            totalChiTerm += term;

            let start = (i / k);
            let end = ((i + 1) / k);

            // Format to 1 decimal if suitable, or 2 max to match "0.0, 0.1"
            let startStr = (start % 1 === 0) ? start.toFixed(1) : start.toFixed(2).replace(/\.?0+$/, '');
            let endStr = (end % 1 === 0) ? end.toFixed(1) : end.toFixed(2).replace(/\.?0+$/, '');

            // Force 0.0 style for integers too if we want uniformity e.g. 0.0
            startStr = Number(start).toFixed(2).replace(/0$/, ''); // 0.00 -> 0.0
            endStr = Number(end).toFixed(2).replace(/0$/, '');

            // Simpler approach: Just use fixed 1 digit if they are tenths
            if (k <= 10) {
                startStr = start.toFixed(1);
                endStr = end.toFixed(1);
            } else {
                startStr = start.toFixed(2);
                endStr = end.toFixed(2);
            }

            tableHtml += `<tr>
                <td>[${startStr}, ${endStr})</td>
                <td>${O}</td>
                <td>${E.toFixed(2)}</td>
                <td>${diff.toFixed(2)}</td>
                <td>${diffSq.toFixed(2)}</td>
                <td>${term.toFixed(3)}</td>
            </tr>`;
        }

        // Total Row
        tableHtml += `<tr style="font-weight:bold; background:rgba(255,255,255,0.1);">
            <td>Total</td>
            <td>${totalOi}</td>
            <td>${(expected * k).toFixed(2)}</td>
            <td>0.00</td>
            <td>-</td>
            <td>${totalChiTerm.toFixed(3)}</td>
        </tr>`;

        // Update Table
        document.querySelector('#chi-table tbody').innerHTML = tableHtml;
        // Ensure class matches if needed, though structure is key
        document.getElementById('chi-table').classList.add('sim-table');


        // 5. Decision
        const df = k - 1;
        let criticalCv = getChiCritical(alpha, df);

        let resDiv = document.getElementById('chi-result');
        document.getElementById('chi-details').style.display = 'block';

        let msg = `
        <h3>Uniformity Test (Chi-Square) Results</h3>
        <p><strong>Hypotheses:</strong><br>
        H₀: R ~ Uniform[0, 1]<br>
        H₁: R ≁ Uniform[0, 1]</p>
        <p><strong>Calculated χ²:</strong> ${chiCalc.toFixed(3)}</p>
        <p><strong>Critical Value (χ²<sub>${alpha}, ${df}</sub>):</strong> ${criticalCv !== null ? criticalCv : 'N/A'}</p>
        `;

        if (criticalCv === null) {
            msg += `<p style="color:orange">Warning: Critical value for df=${df}, alpha=${alpha} not found.</p>`;
        } else {
            if (chiCalc > criticalCv) {
                msg += `<p class="formula" style="color:var(--accent-danger); border-color:var(--accent-danger);">
                    Result: <strong>Reject H₀</strong>. <br>
                    Since ${chiCalc.toFixed(3)} > ${criticalCv}, the numbers are NOT Uniform.
                </p>`;
            } else {
                msg += `<p class="formula" style="color:var(--accent-success); border-color:var(--accent-success);">
                    Result: <strong>Fail to reject H₀</strong>. <br>
                    Since ${chiCalc.toFixed(3)} ≤ ${criticalCv}, we accept that numbers are Uniform.
                </p>`;
            }
        }

        resDiv.innerHTML = msg;

    } catch (e) {
        let resDiv = document.getElementById('chi-result');
        resDiv.innerHTML = `<span style="color:var(--accent-danger)">Error: ${e.message}</span>`;
        console.error(e);
    }
}

function runAutocorrelation() {
    try {
        const nParam = parseInt(document.getElementById('auto-n').value);
        // We will ignore auto-k input for the SINGLE lag check and do a Loop up to M
        // But if user wants specific lag, they can look at the table.
        // Rule: Calculate rxx(k) for k = 1 up to M (M = min(10, N/2))

        // 1. Parse Input
        const raw = document.getElementById('auto-manual-input').value;
        if (!raw.trim()) {
            document.getElementById('auto-result').innerHTML = `<span style="color:var(--accent-danger)">Error: Please enter random numbers.</span>`;
            return;
        }

        let sequence = raw.trim().split(/[\s,]+/).filter(x => x !== '').map(parseFloat);

        // Validation
        if (sequence.some(isNaN)) {
            document.getElementById('auto-result').innerHTML = `<span style="color:var(--accent-danger)">Error: Invalid numbers in input.</span>`;
            return;
        }

        if (sequence.length < nParam) {
            document.getElementById('auto-result').innerHTML = `<span style="color:var(--accent-danger)">Error: Input sequence length ${sequence.length} < N (${nParam}).</span>`;
            return;
        }

        // Use exact N
        const N = nParam;
        const R = sequence.slice(0, N);

        // Calculate Mean and StdDev
        let sum = R.reduce((a, b) => a + b, 0);
        let mean = sum / N;
        let sumSqDiff = R.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        let stdDev = Math.sqrt(sumSqDiff / (N - 1)); // Sample Std dev

        // 2. Build detailed table for lags k = 1 to M
        // M rule: min(10, N/2) usually, or just N/2
        let M = Math.floor(N / 2);
        if (M > 10) M = 10;
        if (M < 1) M = 1;

        let tableBody = document.querySelector('#auto-table tbody');
        tableBody.innerHTML = '';

        let headerHtml = `
            <div style="margin-bottom:15px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                <strong>Statistics:</strong><br>
                Mean ($\bar{x}$) = ${mean.toFixed(4)}<br>
                Std Dev ($s_x$) = ${stdDev.toFixed(4)}<br>
                N = ${N}, Max Lag M = ${M}
            </div>
            
            <table class="sim-table">
                <thead>
                    <tr>
                        <th>k (Lag)</th>
                        <th>$r_{xx}(k)$</th>
                        <th>Interpretation</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let sumAbsRxx = 0;

        for (let k = 1; k <= M; k++) {
            // Calculate Autocorrelation at lag k
            // Numerator: Sum from i=1 to N-k of (Ri - mean)(Ri+k - mean)
            // Denominator: Sum from i=1 to N of (Ri - mean)^2  <-- This is sumSqDiff

            let numerator = 0;
            for (let i = 0; i < N - k; i++) {
                numerator += (R[i] - mean) * (R[i + k] - mean);
            }

            let r_k = numerator / sumSqDiff;
            sumAbsRxx += Math.abs(r_k);

            let interp = (Math.abs(r_k) < 0.1) ?
                "<span style='color:var(--accent-success)'>Independent (Low)</span>" :
                "<span style='color:var(--accent-warning)'>Possible Dependence</span>";

            headerHtml += `<tr>
                <td>${k}</td>
                <td>${r_k.toFixed(4)}</td>
                <td>${interp}</td>
            </tr>`;
        }

        headerHtml += `</tbody>
            <tfoot>
                <tr style="font-weight:bold; background:rgba(255,255,255,0.05);">
                    <td colspan="3" style="text-align:center;">Average |$r_{xx}(k)$| = ${(sumAbsRxx / M).toFixed(4)}</td>
                </tr>
            </tfoot>
        </table>`;

        // Replace the entire INNER content of the #auto-result or restructure
        // The HTML structure in index.html has a <table> inside .table-container
        // But we want to REPLACE that structure with our custom columns or update headers.
        // The existing table has 4 columns: i, Ri, Ri+k, prod.
        // We need to CHANGE the headers of the existing table or just overwrite the container.

        // Let's overwrite the container's innerHTML effectively.
        let container = document.querySelector('#auto-table').parentNode;
        container.innerHTML = headerHtml;

        document.getElementById('auto-result').innerHTML = ''; // Clear result div as we put stats above

    } catch (e) {
        console.error(e);
        document.getElementById('auto-result').innerHTML = `<span style="color:var(--accent-danger)">Error: ${e.message}</span>`;
    }
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
