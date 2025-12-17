
// --- HELPER CLASSES ---

class DistributionTable {
    constructor(elementId, digitType) {
        this.tableElement = document.getElementById(elementId);
        this.tbody = this.tableElement.querySelector('tbody');
        this.digitType = digitType; // 1, 2, or 3
        this.rows = []; // { value: number, prob: number, cumProb: number, rangeStr: string, rangeMin: number, rangeMax: number }
        this.onChangeCallback = null;
    }

    setRows(data) {
        this.rows = data;
        this.updateTable();
        if (this.onChangeCallback) this.onChangeCallback();
    }

    addRow(value = 1, prob = 0.1) {
        this.rows.push({
            value: parseInt(value),
            prob: parseFloat(prob),
            cumProb: 0,
            rangeStr: '',
            rangeMin: 0,
            rangeMax: 0
        });
        this.recalculate();
    }

    deleteRow(index) {
        this.rows.splice(index, 1);
        this.recalculate();
    }

    clear() {
        this.rows = [];
    }

    // STRICT: Largest Remainder Method & Range Construction
    recalculate() {
        if (this.rows.length === 0) return;

        // 1. Calc Cumulative Prob
        let cum = 0;
        this.rows.forEach(r => {
            cum += r.prob;
            r.cumProb = parseFloat(cum.toFixed(6)); // Precision
        });

        // 2. Largest Remainder Method for Counts
        const maxVal = Math.pow(10, this.digitType);
        let rawCounts = this.rows.map(r => r.prob * maxVal);
        let baseCounts = rawCounts.map(c => Math.floor(c));
        let remainders = rawCounts.map((c, i) => ({ idx: i, rem: c - baseCounts[i] }));

        let currentSum = baseCounts.reduce((a, b) => a + b, 0);
        let needed = maxVal - currentSum;

        // Sort by remainder desc
        remainders.sort((a, b) => b.rem - a.rem);

        // Distribute remaining
        for (let i = 0; i < needed; i++) {
            if (i < remainders.length) {
                baseCounts[remainders[i].idx]++;
            }
        }

        // 3. Build Ranges
        let start = 1;
        this.rows.forEach((r, i) => {
            let count = baseCounts[i];

            if (count <= 0) {
                r.rangeMin = -1;
                r.rangeMax = -1;
                r.rangeStr = '-';
            } else {
                r.rangeMin = start;
                r.rangeMax = start + count - 1;

                // FORCE: Last row ends at maxVal (wrap)
                // Only if it's consistently the last valid range
                if (i === this.rows.length - 1) {
                    // Ensure it closes up to maxVal if sum is 1.0
                    // With LBM it should sum to maxVal exactly anyway.
                }

                start = r.rangeMax + 1;

                // Format String
                let minStr = this.formatDigit(r.rangeMin);
                let maxStr = this.formatDigit(r.rangeMax);

                // Special display logic if min==max
                if (r.rangeMin === r.rangeMax) {
                    r.rangeStr = `${minStr}`;
                } else {
                    r.rangeStr = `${minStr}-${maxStr}`;
                }
            }
        });

        this.updateTable();
        if (this.onChangeCallback) this.onChangeCallback();
    }

    formatDigit(val) {
        const maxVal = Math.pow(10, this.digitType);
        if (val === 0 || val === maxVal) {
            // Wrap Display
            if (this.digitType === 1) return '0';
            if (this.digitType === 2) return '00';
            if (this.digitType === 3) return '000';
        }
        return String(val).padStart(this.digitType, '0');
    }

    lookup(rdStr) {
        // rdStr is like "05", "00", "99"
        if (!rdStr || rdStr.trim() === '-' || rdStr.trim() === '') return null;

        // 1. Parse string to check for wrapper "000", "00", "0"
        let val = parseInt(rdStr, 10);
        const maxVal = Math.pow(10, this.digitType);

        // If user typed "0" or "00" or "000", parseInt handles it as 0. 
        // We act as if 0 => maxVal for range checking purposes.
        if (val === 0) val = maxVal;

        // 2. Find Range
        for (let r of this.rows) {
            if (r.rangeMin !== -1 && val >= r.rangeMin && val <= r.rangeMax) {
                return r.value;
            }
        }
        return null;
    }

    updateTable() {
        this.tbody.innerHTML = '';
        this.rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="number" class="dist-input val" value="${row.value}" onchange="updateDistRow('${this.tableElement.id}', ${index}, 'value', this.value)"></td>
                <td><input type="number" step="0.01" class="dist-input prob" value="${row.prob}" onchange="updateDistRow('${this.tableElement.id}', ${index}, 'prob', this.value)"></td>
                <td>${row.cumProb.toFixed(2)}</td>
                <td style="font-family:'JetBrains Mono'; color:var(--accent-cyan);">${row.rangeStr}</td>
                <td><button onclick="deleteDistRow('${this.tableElement.id}', ${index})" style="color:red; background:none; border:none; cursor:pointer;">×</button></td>
            `;
            this.tbody.appendChild(tr);
        });
    }
}

// Global Store for instances
const distTables = {};

function addDistRow(prefix, val, prob) {
    if (distTables[prefix]) distTables[prefix].addRow(val, prob);
}

function deleteDistRow(tableId, index) {
    // Reverse lookup
    const prefix = Object.keys(distTables).find(key => distTables[key].tableElement.id === tableId);
    if (prefix) distTables[prefix].deleteRow(index);
}

function updateDistRow(tableId, index, field, val) {
    const prefix = Object.keys(distTables).find(key => distTables[key].tableElement.id === tableId);
    if (prefix) {
        const table = distTables[prefix];
        if (field === 'prob') table.rows[index].prob = parseFloat(val);
        if (field === 'value') table.rows[index].value = parseInt(val);
        table.recalculate();
    }
}

class RandomDigitStream {
    constructor(inputStr) {
        // Clean tokens: space, comma, newline
        this.rawTokens = inputStr.trim().split(/[\s,]+/);
        this.currentIndex = 0;
    }

    get count() {
        if (this.rawTokens.length === 1 && this.rawTokens[0] === '') return 0;
        return this.rawTokens.length;
    }

    next() {
        if (this.currentIndex < this.rawTokens.length) {
            return this.rawTokens[this.currentIndex++];
        }
        return null;
    }

    reset() {
        this.currentIndex = 0;
    }
}
