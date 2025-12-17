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
window.addEventListener('DOMContentLoaded', () => {
    // Single Server defaults
    addDistRow('ss-ia', 1, 0.25);
    addDistRow('ss-ia', 2, 0.40);
    addDistRow('ss-ia', 3, 0.20);
    addDistRow('ss-ia', 4, 0.15);

    addDistRow('ss-st', 2, 0.30);
    addDistRow('ss-st', 3, 0.28);
    addDistRow('ss-st', 4, 0.25);
    addDistRow('ss-st', 5, 0.17);

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

// --- HELPER: Auto-Fill Random Digits ---
function ensureRandomDigits(elementId, countNeeded, digitType) {
    const input = document.getElementById(elementId);
    if (!input) return false;

    let currentStr = input.value;
    // Simple parse to count existing
    let existing = currentStr.split(/[\s,]+/).filter(s => s.trim() !== '');

    if (existing.length >= countNeeded) return true; // Enough digits

    let needed = countNeeded - existing.length;
    let newDigits = [];

    // Generate 'needed' random digits
    for (let i = 0; i < needed; i++) {
        // Generate random int based on digitType
        let maxVal = Math.pow(10, digitType);
        let val = Math.floor(Math.random() * maxVal); // 0 to 99..

        // Pad
        let s = String(val).padStart(digitType, '0');
        newDigits.push(s);
    }

    // Append to input
    let separator = (currentStr.trim().length > 0) ? ' ' : '';
    input.value = currentStr + separator + newDigits.join(' ');

    // Flash effect
    input.style.borderColor = 'var(--accent-success)';
    setTimeout(() => input.style.borderColor = '', 500);

    return true;
}

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

        if (Math.abs(checkSum(ssIaDist) - 1.0) > 0.000001) {
            throw new Error(`Interarrival Probabilities sum to ${checkSum(ssIaDist).toFixed(4)}, must be 1.0`);
        }
        if (Math.abs(checkSum(ssStDist) - 1.0) > 0.000001) {
            throw new Error(`Service Probabilities sum to ${checkSum(ssStDist).toFixed(4)}, must be 1.0`);
        }

        // AUTO-FILL
        if (typeof ensureRandomDigits === 'function') {
            ensureRandomDigits('ss-rd-arr', n - 1, 3);
            ensureRandomDigits('ss-rd-svc', n, 2);
        }

        // 3. Parse inputs
        const rdArrInput = document.getElementById('ss-rd-arr').value;
        const rdSvcInput = document.getElementById('ss-rd-svc').value;

        const arrStream = new RandomDigitStream(rdArrInput);
        const svcStream = new RandomDigitStream(rdSvcInput);

        if (arrStream.count !== (n - 1)) {
            throw new Error(`Expected ${n - 1} Arrival Random Digits, found ${arrStream.count}.`);
        }
        if (svcStream.count !== n) {
            throw new Error(`Expected ${n} Service Random Digits, found ${svcStream.count}.`);
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
        let totalRunTime = 0;

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
        if (Math.abs(checkSum(msIaDist) - 1.0) > 0.000001) throw new Error("IA Probabilities sum != 1.0");
        if (Math.abs(checkSum(msAbleDist) - 1.0) > 0.000001) throw new Error("Able Probabilities sum != 1.0");
        if (Math.abs(checkSum(msBakerDist) - 1.0) > 0.000001) throw new Error("Baker Probabilities sum != 1.0");

        // AUTO-FILL
        if (typeof ensureRandomDigits === 'function') {
            ensureRandomDigits('ms-rd-arr', n - 1, 2);
            ensureRandomDigits('ms-rd-svc', n, 2);
        }

        const rdArrInput = document.getElementById('ms-rd-arr').value;
        const rdSvcInput = document.getElementById('ms-rd-svc').value;
        const arrStream = new RandomDigitStream(rdArrInput);
        const svcStream = new RandomDigitStream(rdSvcInput);

        if (arrStream.count !== (n - 1)) throw new Error(`Expected ${n - 1} Arrival Random Digits, found ${arrStream.count}.`);
        if (svcStream.count !== n) throw new Error(`Expected ${n} Service Random Digits, found ${svcStream.count}.`);

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

            let ableIdle = (arrivalTime >= ableFree);
            let bakerIdle = (arrivalTime >= bakerFree);

            if (ableIdle && bakerIdle) {
                server = (rule === 'able') ? 'able' : 'baker';
            } else if (ableIdle) {
                server = 'able';
            } else if (bakerIdle) {
                server = 'baker';
            } else {
                if (ableFree <= bakerFree) server = 'able'; else server = 'baker';
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
        if (Math.abs(checkSum(invDemDist) - 1.0) > 0.000001) throw new Error("Demand Probabilities sum != 1.0");
        if (Math.abs(checkSum(invLtDist) - 1.0) > 0.000001) throw new Error("Lead Time Probabilities sum != 1.0");

        const totalDays = cycles * N;

        // AUTO-FILL
        if (typeof ensureRandomDigits === 'function') {
            ensureRandomDigits('inv-rd-dem', totalDays, 2);
            ensureRandomDigits('inv-rd-lt', cycles, 1);
        }

        const rdDemInput = document.getElementById('inv-rd-dem').value;
        const rdLtInput = document.getElementById('inv-rd-lt').value;
        const demStream = new RandomDigitStream(rdDemInput);
        const ltStream = new RandomDigitStream(rdLtInput);

        if (demStream.count !== totalDays) throw new Error(`Expected ${totalDays} Demand RDs (Days), found ${demStream.count}.`);
        if (ltStream.count !== cycles) throw new Error(`Expected ${cycles} Lead Time RDs (Cycles), found ${ltStream.count}.`);

        let tableBody = document.querySelector('#inv-table tbody');
        tableBody.innerHTML = '';

        let onHand = startInv;
        let outstandingQty = initOrderQty;
        let daysUntilArrival = initOrderDaysInfo;

        let totalEndingInv = 0;
        let daysShortage = 0;

        for (let cycle = 1; cycle <= cycles; cycle++) {
            for (let dayInRange = 1; dayInRange <= N; dayInRange++) {
                if (daysUntilArrival > 0) {
                    daysUntilArrival--;
                    if (daysUntilArrival === 0) {
                        onHand += outstandingQty;
                        outstandingQty = 0;
                    }
                }

                let begInv = onHand;
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

                let orderQty = '-';
                let rdLtStr = '-';
                let daysToArrive = (outstandingQty > 0 || daysUntilArrival > 0) ? daysUntilArrival : '-';

                if (dayInRange === N) {
                    let Q = M - endInv + shortage;
                    orderQty = Q;
                    rdLtStr = ltStream.next();
                    let leadTime = invLtDist.lookup(rdLtStr);
                    if (leadTime === null) throw new Error(`Invalid Lead Time RD '${rdLtStr}'`);

                    outstandingQty = Q;
                    daysUntilArrival = leadTime;
                    daysToArrive = leadTime;
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
                    <td>${daysToArrive}</td>
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

    let output = [];
    // Generate period (up to m) - limit to 50 for display sanity or full m? Prompt says "Sequence"
    const limit = Math.min(m, 50);
    for (let i = 0; i < limit; i++) {
        z = (a * z + c) % m;
        output.push(z);
    }

    document.getElementById('lcg-output').innerText = "Sequence (first 50): " + output.join(", ");
}

// Critical Values Table (Approximation or Subset)
// Keys: alpha -> df
const CHI_CRITICAL = {
    "0.10": { 9: 14.68, 19: 27.20, 29: 39.09, 49: 62.04, 99: 117.41 },
    "0.05": { 9: 16.92, 19: 30.14, 29: 42.56, 49: 66.34, 99: 123.23 },
    "0.025": { 9: 19.02, 19: 32.85, 29: 45.72, 49: 70.22, 99: 128.42 },
    "0.01": { 9: 21.67, 19: 36.19, 29: 49.59, 49: 74.92, 99: 134.64 },
    "0.005": { 9: 23.59, 19: 38.58, 29: 52.34, 49: 78.23, 99: 138.99 }
};

function getChiCritical(alpha, df) {
    // Exact lookup
    if (CHI_CRITICAL[alpha] && CHI_CRITICAL[alpha][df]) return CHI_CRITICAL[alpha][df];

    // Approximation for large df (Wilson-Hilferty)
    // X^2 = df * ( 1 - 2/(9df) + z * sqrt(2/(9df)) )^3
    // z for 0.05 = 1.645, etc.
    // Fallback: Use 16.9 for df=9, alpha=0.05 default if missing
    if (df === 9 && alpha === "0.05") return 16.92;
    return null;
}

function runChiSquare() {
    // Inputs
    const N = parseInt(document.getElementById('chi-n').value);
    const k = parseInt(document.getElementById('chi-k').value); // Classes
    const alpha = document.getElementById('chi-alpha').value;

    // LCG Params
    const a = parseInt(document.getElementById('lcg-a').value);
    const c = parseInt(document.getElementById('lcg-c').value);
    const m = parseInt(document.getElementById('lcg-m').value);
    let z = parseInt(document.getElementById('lcg-seed').value);

    // 1. Generate Stream
    let stream = [];
    for (let i = 0; i < N; i++) {
        z = (a * z + c) % m;
        let r = z / m; // [0,1)
        stream.push(r);
    }

    // 2. Observations
    let observed = new Array(k).fill(0);
    // Interval width = 1/k
    for (let r of stream) {
        let bin = Math.floor(r * k);
        if (bin >= k) bin = k - 1;
        observed[bin]++;
    }

    // 3. Expected
    let expected = N / k;

    // 4. Calc Statistic
    let chiCalc = 0;
    let html = '';

    for (let i = 0; i < k; i++) {
        let O = observed[i];
        let E = expected;
        let term = Math.pow(O - E, 2) / E;
        chiCalc += term;

        let start = (i / k).toFixed(2);
        let end = ((i + 1) / k).toFixed(2);

        html += `<tr>
            <td>[${start}, ${end})</td>
            <td>${O}</td>
            <td>${E}</td>
            <td>${term.toFixed(3)}</td>
        </tr>`;
    }

    document.querySelector('#chi-table tbody').innerHTML = html;

    // 5. Decision
    const df = k - 1;
    let criticalCv = getChiCritical(alpha, df);

    let resDiv = document.getElementById('chi-result');
    document.getElementById('chi-details').style.display = 'block';

    let msg = `Calculated χ² = <strong>${chiCalc.toFixed(3)}</strong>. (df=${df}, α=${alpha})<br>`;

    if (criticalCv === null) {
        msg += `<span style="color:orange">Warning: Critical value for df=${df}, alpha=${alpha} not in lookup table. Using generic threshold check needed.</span>`;
    } else {
        msg += `Critical Value = <strong>${criticalCv}</strong>.<br>`;
        if (chiCalc > criticalCv) {
            msg += `<span style="color:var(--accent-danger)">Reject H₀ (Not Uniform). ${chiCalc.toFixed(3)} > ${criticalCv}</span>`;
        } else {
            msg += `<span style="color:var(--accent-success)">Fail to Reject H₀ (Uniform). ${chiCalc.toFixed(3)} <= ${criticalCv}</span>`;
        }
    }

    resDiv.innerHTML = msg;
}

function runAutocorrelation() {
    const n = parseInt(document.getElementById('auto-n').value);
    const k = parseInt(document.getElementById('auto-k').value); // Lag
    const source = document.getElementById('auto-source').value;

    let sequence = [];

    if (source === 'lcg') {
        const a = parseInt(document.getElementById('lcg-a').value);
        const c = parseInt(document.getElementById('lcg-c').value);
        const m = parseInt(document.getElementById('lcg-m').value);
        let z = parseInt(document.getElementById('lcg-seed').value);

        for (let i = 0; i < n; i++) {
            z = (a * z + c) % m;
            sequence.push(z / m);
        }
    } else {
        const raw = document.getElementById('auto-manual-input').value;
        sequence = raw.trim().split(/[\s,]+/).filter(x => x !== '').map(parseFloat);
        if (sequence.length < n) {
            document.getElementById('auto-result').innerHTML = `<span style="color:red">Error: Input sequence length ${sequence.length} < N (${n}).</span>`;
            return;
        }
        sequence = sequence.slice(0, n); // Take first N
    }

    // 1. Mean
    let sum = 0;
    for (let x of sequence) sum += x;
    let mean = sum / n;

    // 2. Variance (Sx^2)
    let sumSqDiff = 0;
    for (let x of sequence) {
        sumSqDiff += Math.pow(x - mean, 2);
    }
    let variance = sumSqDiff / (n - 1);
    let sx = Math.sqrt(variance);

    // 3. Autocorrelation (rxx(k))
    // (1/(n-k)) * sum( (xi - mean)*(xi+k - mean) ) / variance
    // Note: Prompt formula div by (sx * sx) which is variance.

    let numeratorSum = 0;
    for (let i = 0; i < n - k; i++) {
        numeratorSum += (sequence[i] - mean) * (sequence[i + k] - mean);
    }

    let rkk = (1 / (n - k)) * numeratorSum / variance;

    // Display
    let html = `
        <strong>Results (N=${n}, Lag k=${k}):</strong><br>
        Mean ($\bar{x}$) = ${mean.toFixed(4)}<br>
        Variance ($S_x^2$) = ${variance.toFixed(4)}<br>
        Autocorrelation ($r_{xx}(k)$) = <strong>${rkk.toFixed(4)}</strong><br>
        <br>
        <small style="color:var(--text-muted)">
            Interpretation: <br>
            Near 0: Independence.<br>
            Near 1: Dependence (Positive correlation).<br>
            Near -1: Dependence (Negative correlation).
        </small>
    `;
    document.getElementById('auto-result').innerHTML = html;
}

// Ensure toggle for manual input works
document.addEventListener('DOMContentLoaded', () => {
    const autoSource = document.getElementById('auto-source');
    if (autoSource) {
        autoSource.addEventListener('change', (e) => {
            document.getElementById('auto-manual-input').style.display = (e.target.value === 'manual') ? 'block' : 'none';
        });
    }
});

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
