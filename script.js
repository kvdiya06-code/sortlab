let masterArr = [];
let engines = {};
let isPlaying = false;
let clock = null;
let currentN = 50;

const Metadata = {
    quick: { t: 'O(n log n)', worst: 'O(n²)' },
    merge: { t: 'O(n log n)', worst: 'O(n log n)' },
    insertion: { t: 'O(n²)', worst: 'O(n²)' },
    selection: { t: 'O(n²)', worst: 'O(n²)' },
    bubble: { t: 'O(n²)', worst: 'O(n²)' }
};

const Algos = {
    bubble: (arr, push, stats) => {
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr.length - i - 1; j++) {
                stats.ops++;
                if (arr[j] > arr[j + 1]) {
                    [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                    stats.swaps++; push([], [j, j + 1]);
                } else push([j, j + 1], []);
            }
        }
    },
    selection: (arr, push, stats) => {
        for (let i = 0; i < arr.length; i++) {
            let m = i;
            for (let j = i + 1; j < arr.length; j++) {
                stats.ops++; push([j, m], []);
                if (arr[j] < arr[m]) m = j;
            }
            [arr[i], arr[m]] = [arr[m], arr[i]]; stats.swaps++; push([], [i, m]);
        }
    },
    insertion: (arr, push, stats) => {
        for (let i = 1; i < arr.length; i++) {
            let k = arr[i], j = i - 1;
            while (j >= 0 && arr[j] > k) {
                stats.ops++; arr[j + 1] = arr[j]; stats.swaps++;
                push([j], [j, j + 1]); j--;
            }
            arr[j + 1] = k; push([], [j + 1]);
        }
    },
    quick: (arr, push, stats) => {
        const sort = (l, h) => {
            if (l < h) {
                let p = arr[h], i = l;
                for (let j = l; j < h; j++) {
                    stats.ops++; push([j, h], []);
                    if (arr[j] < p) {
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                        stats.swaps++; push([], [i, j]); i++;
                    }
                }
                [arr[i], arr[h]] = [arr[h], arr[i]]; stats.swaps++; push([], [i, h]);
                sort(l, i - 1); sort(i + 1, h);
            }
        };
        sort(0, arr.length - 1);
    },
    merge: (arr, push, stats) => {
        const mSort = (start, end) => {
            if (end - start <= 1) return;
            let mid = Math.floor((start + end) / 2);
            mSort(start, mid); mSort(mid, end);
            let left = arr.slice(start, mid), right = arr.slice(mid, end);
            let i = 0, j = 0, k = start;
            while (i < left.length && j < right.length) {
                stats.ops++;
                if (left[i] <= right[j]) arr[k] = left[i++];
                else arr[k] = right[j++];
                stats.swaps++; push([k], [k]); k++;
            }
            while (i < left.length) arr[k++] = left[i++];
            while (j < right.length) arr[k++] = right[j++];
        };
        mSort(0, arr.length);
    }
};

function genScenario(type) {
    document.querySelectorAll('.scen-btn').forEach(b => b.classList.remove('active'));
    if(event) event.target.classList.add('active');
    let arr = [];
    if (type === 'best') arr = Array.from({length: currentN}, (_, i) => i + 5);
    else if (type === 'worst') arr = Array.from({length: currentN}, (_, i) => (currentN - i) + 5);
    else arr = Array.from({length: currentN}, () => Math.floor(Math.random() * 100) + 5);
    masterArr = arr;
    resetBenchmark();
}

function setCustomData() {
    const val = document.getElementById('customInput').value;
    if (!val) return;
    const arr = val.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (arr.length > 1) { masterArr = arr; currentN = arr.length; resetBenchmark(); }
}

function togglePause() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('pauseBtn');
    btn.innerText = isPlaying ? "Pause" : "Resume";
    if (isPlaying) loop();
}

function stepForward() {
    isPlaying = false;
    document.getElementById('pauseBtn').innerText = "Resume";
    Object.keys(engines).forEach(a => {
        if (engines[a].idx < engines[a].frames.length - 1) { engines[a].idx++; render(a, engines[a].idx); }
    });
}

function stepBack() {
    isPlaying = false;
    document.getElementById('pauseBtn').innerText = "Resume";
    Object.keys(engines).forEach(a => {
        if (engines[a].idx > 0) { engines[a].idx--; render(a, engines[a].idx); }
    });
}

function resetBenchmark() {
    isPlaying = false; clearTimeout(clock);
    document.getElementById('comparisonOverlay').style.display = 'none';
    document.getElementById('pauseBtn').innerText = "Pause";
    const grid = document.getElementById('matrixGrid');
    const selected = Array.from(document.querySelectorAll('.checklist input:checked')).map(i => i.value);
    grid.innerHTML = ''; engines = {};
    grid.style.gridTemplateColumns = `repeat(${selected.length > 3 ? 3 : selected.length}, 1fr)`;

    selected.forEach(algo => {
        const panel = document.createElement('div');
        panel.className = 'engine-panel';
        panel.innerHTML = `<div class="panel-info"><div class="algo-title">${algo}</div><div class="comp-badge">${Metadata[algo].t}</div></div>
            <div class="metrics"><div class="m-card">Steps <b id="ops-${algo}">0</b></div><div class="m-card">Swaps <b id="swaps-${algo}">0</b></div><div class="m-card">Worst <b>${Metadata[algo].worst}</b></div></div>
            <div class="viz" id="viz-${algo}"></div>`;
        grid.appendChild(panel);
        engines[algo] = { frames: [], idx: 0, stats: { ops: 0, swaps: 0 } };
        const temp = [...masterArr];
        const push = (c, s) => engines[algo].frames.push({ data: [...temp], comp: c, swap: s, done: [], stats: {...engines[algo].stats} });
        Algos[algo](temp, push, engines[algo].stats);
        engines[algo].frames.push({ data: [...temp], comp: [], swap: [], done: Array.from(temp.keys()), stats: {...engines[algo].stats} });
        render(algo, 0);
    });
}

function render(algo, fIdx) {
    const f = engines[algo].frames[fIdx];
    const box = document.getElementById(`viz-${algo}`);
    const max = Math.max(...masterArr);
    box.innerHTML = '';
    f.data.forEach((v, i) => {
        const b = document.createElement('div'); b.className = 'bar'; b.style.height = `${(v / max) * 100}%`;
        if (f.swap.includes(i)) b.style.backgroundColor = 'var(--swap)';
        else if (f.comp.includes(i)) b.style.backgroundColor = 'var(--compare)';
        else if (f.done.includes(i)) b.style.backgroundColor = 'var(--done)';
        box.appendChild(b);
    });
    document.getElementById(`ops-${algo}`).innerText = f.stats.ops;
    document.getElementById(`swaps-${algo}`).innerText = f.stats.swaps;
}

function loop() {
    if (!isPlaying) return;
    let fin = 0;
    Object.keys(engines).forEach(a => {
        if (engines[a].idx < engines[a].frames.length - 1) { engines[a].idx++; render(a, engines[a].idx); }
        else fin++;
    });
    if (fin === Object.keys(engines).length) { isPlaying = false; showAnalysis(); return; }
    clock = setTimeout(loop, 201 - document.getElementById('speed').value);
}

function showAnalysis() {
    const ranked = Object.keys(engines).sort((a, b) => engines[a].frames.length - engines[b].frames.length);
    const winner = ranked[0];
    const details = document.getElementById('comparisonDetails');
    document.getElementById('comparisonOverlay').style.display = 'flex';

    // We removed the trophy and changed "WINNER" to "Fastest" or simply "1.0x"
    let html = `<table class="comp-table"><tr><th>Algorithm</th><th>Steps</th><th>Ratio</th></tr>`;
    ranked.forEach(a => {
        const gap = (engines[a].frames.length / engines[winner].frames.length).toFixed(1);
        html += `<tr class="${a === winner ? 'row-winner' : ''}">
                    <td>${a.toUpperCase()}</td>
                    <td>${engines[a].frames.length}</td>
                    <td>${a === winner ? 'Optimal' : gap + 'x'}</td>
                 </tr>`;
    });
    html += `</table>`;
    
    // Updated insight text to be more clinical
    html += `<div class="insight-text"><b>Analysis:</b> ${winner.toUpperCase()} achieved the target state with the lowest computational overhead in this scenario.</div>`;
    
    details.innerHTML = html;
}

function setN(n) { currentN = n; genScenario('avg'); }
document.getElementById('playBtn').onclick = () => { isPlaying = true; loop(); };
document.getElementById('resetBtn').onclick = () => genScenario('avg');
document.querySelectorAll('.checklist input').forEach(i => i.onchange = () => resetBenchmark());
genScenario('avg');
