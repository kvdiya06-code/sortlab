let masterArr = [];
let engines = {};
let isPlaying = false;
let clock = null;
let currentN = 50;

const Metadata = {
    quick: { t: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
    merge: { t: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
    insertion: { t: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    selection: { t: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    bubble: { t: 'O(n²)', worst: 'O(n²)', space: 'O(1)' }
};

const Algos = {
    bubble: (arr, push, stats) => {
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr.length - i - 1; j++) {
                stats.ops++;
                if (arr[j] > arr[j + 1]) {
                    [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                    stats.swaps++; 
                    push([], [j, j + 1]); // Visualize Swap
                } else {
                    push([j, j + 1], []); // Visualize Comparison
                }
            }
        }
    },
    selection: (arr, push, stats) => {
        for (let i = 0; i < arr.length; i++) {
            let m = i;
            for (let j = i + 1; j < arr.length; j++) {
                stats.ops++;
                push([j, m], []); // Visualizing the search for minimum
                if (arr[j] < arr[m]) m = j;
            }
            if (m !== i) {
                [arr[i], arr[m]] = [arr[m], arr[i]];
                stats.swaps++;
                push([], [i, m]); // Visualizing the final swap for this pass
            }
        }
    },
    insertion: (arr, push, stats) => {
        for (let i = 1; i < arr.length; i++) {
            let k = arr[i], j = i - 1;
            push([i], []); // Current element being inserted
            while (j >= 0 && arr[j] > k) {
                stats.ops++;
                arr[j + 1] = arr[j];
                stats.swaps++;
                push([j], [j, j + 1]); // Show the shift
                j--;
            }
            arr[j + 1] = k;
            push([], [j + 1]); // Place key in correct spot
        }
    },
    quick: (arr, push, stats) => {
        const sort = (l, h) => {
            if (l < h) {
                let p = arr[h], i = l;
                for (let j = l; j < h; j++) {
                    stats.ops++;
                    push([j, h], []);
                    if (arr[j] < p) {
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                        stats.swaps++;
                        push([], [i, j]);
                        i++;
                    }
                }
                [arr[i], arr[h]] = [arr[h], arr[i]];
                stats.swaps++;
                push([], [i, h]);
                sort(l, i - 1);
                sort(i + 1, h);
            }
        };
        sort(0, arr.length - 1);
    },
    merge: (arr, push, stats) => {
        const mSort = (start, end) => {
            if (end - start <= 1) return;
            let mid = Math.floor((start + end) / 2);
            mSort(start, mid);
            mSort(mid, end);
            let left = arr.slice(start, mid), right = arr.slice(mid, end);
            let i = 0, j = 0, k = start;
            while (i < left.length && j < right.length) {
                stats.ops++;
                if (left[i] <= right[j]) {
                    arr[k] = left[i++];
                } else {
                    arr[k] = right[j++];
                }
                stats.swaps++;
                push([k], [k]); // Merge sort 'swaps' are overwrites
                k++;
            }
            while (i < left.length) arr[k++] = left[i++];
            while (j < right.length) arr[k++] = right[j++];
        };
        mSort(0, arr.length);
    }
};

// --- CORE UI LOGIC (Updated for performance) ---

function genScenario(type) {
    document.querySelectorAll('.scen-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');

    let arr = [];
    if (type === 'best') arr = Array.from({length: currentN}, (_, i) => i + 5);
    else if (type === 'worst') arr = Array.from({length: currentN}, (_, i) => (currentN - i) + 5);
    else arr = Array.from({length: currentN}, () => Math.floor(Math.random() * 100) + 5);

    masterArr = arr;
    resetBenchmark();
}


function resetBenchmark() {
    isPlaying = false;
    clearTimeout(clock);
    document.getElementById('winnerToast').style.display = 'none';
    
    const grid = document.getElementById('matrixGrid');
    const selected = Array.from(document.querySelectorAll('.checklist input:checked')).map(i => i.value);
    
    grid.innerHTML = '';
    engines = {};
    
    // Better responsive grid
    const cols = selected.length > 3 ? 3 : selected.length;
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    selected.forEach(algo => {
        const panel = document.createElement('div');
        panel.className = 'engine-panel';
        // Update this part inside your selected.forEach loop in resetBenchmark()
panel.innerHTML = `
    <div class="panel-info">
        <div class="algo-title">${algo}</div>
        <div class="comp-badge">${Metadata[algo].t}</div>
    </div>
    <div class="metrics">
        <div class="m-card">Steps <b id="ops-${algo}">0</b></div>
        <div class="m-card">Swaps <b id="swaps-${algo}">0</b></div>
        <div class="m-card">Worst <b>${Metadata[algo].worst}</b></div>
    </div>
    <div class="viz" id="viz-${algo}"></div>
`;
        grid.appendChild(panel);
        
        engines[algo] = { frames: [], idx: 0, stats: { ops: 0, swaps: 0 } };
        const tempArr = [...masterArr];
        
        const push = (comp, swap) => {
            engines[algo].frames.push({ 
                data: [...tempArr], 
                comp, 
                swap, 
                done: [], 
                stats: { ...engines[algo].stats } 
            });
        };
        
        Algos[algo](tempArr, push, engines[algo].stats);
        
        // Final "Done" frame
        engines[algo].frames.push({ 
            data: [...tempArr], 
            comp: [], 
            swap: [], 
            done: Array.from(tempArr.keys()), 
            stats: { ...engines[algo].stats } 
        });
        
        render(algo, 0);
    });
}
function setCustomData() {
    const inputVal = document.getElementById('customInput').value;
    
    // 1. Split by comma, 2. Convert to numbers, 3. Filter out NaN (invalid inputs)
    const customArr = inputVal.split(',')
        .map(num => parseInt(num.trim()))
        .filter(num => !isNaN(num));

    if (customArr.length < 2) {
        alert("Please enter at least 2 numbers separated by commas.");
        return;
    }

    // Update global state
    currentN = customArr.length;
    masterArr = customArr;
    
    // Stop any current animation and reset the grid
    isPlaying = false;
    clearTimeout(clock);
    resetBenchmark();
}
function render(algo, fIdx) {
    const f = engines[algo].frames[fIdx];
    const box = document.getElementById(`viz-${algo}`);
    if (!box) return;

    const max = Math.max(...masterArr);
    
    // Using DocumentFragment for smoother rendering
    const fragment = document.createDocumentFragment();
    f.data.forEach((v, i) => {
        const b = document.createElement('div');
        b.className = 'bar';
        b.style.height = `${(v / max) * 100}%`;
        if (f.swap.includes(i)) b.style.backgroundColor = 'var(--swap)';
        else if (f.comp.includes(i)) b.style.backgroundColor = 'var(--compare)';
        else if (f.done.includes(i)) b.style.backgroundColor = 'var(--done)';
        fragment.appendChild(b);
    });
    
    box.innerHTML = '';
    box.appendChild(fragment);
    
    document.getElementById(`ops-${algo}`).innerText = f.stats.ops;
    document.getElementById(`swaps-${algo}`).innerText = f.stats.swaps;
}

function loop() {
    if (!isPlaying) return;
    let finishedCount = 0;
    const activeAlgos = Object.keys(engines);

    activeAlgos.forEach(a => {
        if (engines[a].idx < engines[a].frames.length - 1) {
            engines[a].idx++;
            render(a, engines[a].idx);
        } else {
            finishedCount++;
        }
    });

    if (finishedCount === activeAlgos.length) {
        isPlaying = false;
        showWinner();
        return;
    }
    
    // Inverting the range input so higher value = faster
    const speed = 201 - document.getElementById('speed').value;
    clock = setTimeout(loop, speed);
}

function showWinner() {
    const active = Object.keys(engines);
    // Sort algorithms by frame count (efficiency)
    const ranked = active.sort((a, b) => engines[a].frames.length - engines[b].frames.length);
    const winner = ranked[0];

    const overlay = document.getElementById('comparisonOverlay');
    const details = document.getElementById('comparisonDetails');
    overlay.style.display = 'flex';

    let html = `<p class="winner-announcement">🏆 <b>${winner.toUpperCase()}</b> is the most efficient!</p>`;
    html += `<table class="comp-table">
                <thead>
                    <tr>
                        <th>Algorithm</th>
                        <th>Total Steps</th>
                        <th>Efficiency Gap</th>
                    </tr>
                </thead>
                <tbody>`;

    ranked.forEach(algo => {
        const steps = engines[algo].frames.length;
        // Calculate how much worse this algo was than the winner
        const gap = (steps / engines[winner].frames.length).toFixed(1);
        const gapText = algo === winner ? "Winner" : `${gap}x slower`;
        
        html += `
            <tr class="${algo === winner ? 'row-winner' : ''}">
                <td>${algo.toUpperCase()}</td>
                <td>${steps.toLocaleString()}</td>
                <td>${gapText}</td>
            </tr>`;
    });

    html += `</tbody></table>`;
    html += `<p class="insight-text">${getInsight(winner, active)}</p>`;
    details.innerHTML = html;
}

// Logic to explain the "Why"
function getInsight(winner, active) {
    if (winner === 'quick' || winner === 'merge') {
        return "<b>Why it won:</b> Divide & Conquer. By splitting the array into smaller chunks, it avoids checking every pair, reducing work from $O(n^2)$ to $O(n \log n)$.";
    }
    if (winner === 'insertion') {
        return "<b>Why it won:</b> Adaptive Logic. Since the data was already mostly sorted, Insertion Sort only had to verify the order rather than moving everything.";
    }
    return "The winner used fewer operations to achieve the same result.";
}

function setN(n) { 
    currentN = n; 
    genScenario('avg'); 
}

document.getElementById('playBtn').onclick = () => { 
    isPlaying = true; 
    loop(); 
};

document.getElementById('resetBtn').onclick = () => genScenario('avg');

document.querySelectorAll('.checklist input').forEach(i => {
    i.onchange = () => resetBenchmark();
});

// Start
genScenario('avg');