'use strict';

/* =====================================================================
   SORTLAB – an interactive sorting playground
   Modes:  Learn (one algorithm, explained step by step)
           Race  (several algorithms on identical data)
           Scale (how operation counts grow with array size)
   ===================================================================== */

const NONE = Object.freeze([]);
const MAX_N = 85;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M'
              : v >= 1e3 ? (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + 'k'
              : String(Math.round(v));

/* ---------------------------------------------------------------------
   Data patterns
   --------------------------------------------------------------------- */
const SCENARIOS = {
    random:   { label: 'Random',        hint: 'A shuffled mix – what typical real-world data looks like.' },
    nearly:   { label: 'Nearly sorted', hint: 'Almost in order, with a few items out of place. Insertion sort loves this.' },
    reversed: { label: 'Reversed',      hint: 'Perfectly backwards – the worst case for bubble, insertion and quick sort (last-item pivot).' },
    sorted:   { label: 'Sorted',        hint: 'Already in order. Bubble and insertion finish fast, but quick sort with a last-item pivot hits its worst case!' },
    few:      { label: 'Few unique',    hint: 'Only four distinct values, so there are many duplicates.' }
};

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
const ramp = n => Array.from({ length: n }, (_, i) => 10 + Math.round(i * 90 / Math.max(1, n - 1)));

function makeData(kind, n) {
    switch (kind) {
        case 'sorted':   return ramp(n);
        case 'reversed': return ramp(n).reverse();
        case 'few':      return Array.from({ length: n }, () => [20, 45, 70, 95][Math.floor(Math.random() * 4)]);
        case 'nearly': {
            const a = ramp(n);
            const swaps = Math.max(1, Math.round(n * 0.06));
            for (let s = 0; s < swaps; s++) {
                const i = Math.floor(Math.random() * n);
                const j = Math.min(n - 1, i + 1 + Math.floor(Math.random() * 3));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }
        default: return shuffle(ramp(n));
    }
}

/* ---------------------------------------------------------------------
   Recorder – every algorithm talks to this. It mutates a working copy of
   the array and (optionally) records a "frame" for every interesting step:
   the data, which bars are being compared / swapped, the pivot, which
   pseudocode line is running and a plain-English message.
   --------------------------------------------------------------------- */
function createRecorder(init, record) {
    const a = init.slice();
    const frames = [];
    const st = { cmp: 0, wr: 0 };
    const sset = new Set();
    let srt = [], piv = [], lo = -1, hi = -1, pre = 0;

    const snap = (line, msg, c, s) => {
        if (!record) return;
        frames.push({ d: a.slice(), c: c || NONE, s: s || NONE, p: piv, srt, lo, hi, pre,
                      line, msg, k: st.cmp, w: st.wr });
    };

    const R = {
        a, frames, stats: st,
        start(msg)            { snap(-1, msg); },
        cmp(i, j, line, msg)  { st.cmp++; snap(line, msg, [i, j]); },
        cmpWrite(k, v, line, msg) { st.cmp++; st.wr++; a[k] = v; snap(line, msg, NONE, [k]); },
        swap(i, j, line, msg) { [a[i], a[j]] = [a[j], a[i]]; st.wr++; snap(line, msg, NONE, [i, j]); },
        write(i, v, line, msg){ a[i] = v; st.wr++; snap(line, msg, NONE, [i]); },
        note(line, msg, c)    { snap(line, msg, c); },
        piv(arr)              { piv = arr; },
        range(l, h)           { lo = l; hi = h; },
        pre(n)                { pre = n; },
        sorted(line, msg, ...idx) { idx.forEach(i => sset.add(i)); srt = [...sset]; snap(line, msg); },
        allSorted() {
            for (let i = 0; i < a.length; i++) sset.add(i);
            srt = [...sset]; piv = []; lo = hi = -1; pre = 0;
            snap(-1, `Sorted! ${st.cmp.toLocaleString()} comparisons and ${st.wr.toLocaleString()} swaps/writes in total.`);
        }
    };
    return R;
}

function runAlgo(key, data, record = true) {
    const R = createRecorder(data, record);
    ALGOS[key].run(R);
    return { frames: R.frames, cmp: R.stats.cmp, wr: R.stats.wr };
}

/* ---------------------------------------------------------------------
   Algorithms + teaching content
   --------------------------------------------------------------------- */
const ALGOS = {
    bubble: {
        name: 'Bubble Sort', color: '#ff2d87',
        best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'Yes', inplace: 'Yes',
        blurb: 'Bubble sort repeatedly walks through the list, swapping neighbours that are in the wrong order. Big values "bubble up" to the end, one per pass.',
        idea: ['Compare each pair of neighbours from left to right.', 'Swap them if the left one is bigger.', 'After every pass, the largest remaining item is locked in at the end.', 'Stop as soon as a full pass makes no swaps.'],
        analogy: 'Bubbles rising in a fizzy drink – the biggest ones reach the surface first.',
        good: 'Very simple, but it does a lot of unnecessary work. Fine for teaching and for tiny or nearly-sorted lists; rarely used in practice.',
        tryIt: 'Set the pattern to "Sorted": the early-exit check ends after a single pass. Then try "Reversed" to see the worst case.',
        pseudo: [
            'for i from 0 to n-2',
            '  swapped = false',
            '  for j from 0 to n-i-2',
            '    if A[j] > A[j+1]',
            '      swap(A[j], A[j+1])',
            '      swapped = true',
            '  A[n-i-1] is now in its final place',
            '  if not swapped: stop'
        ],
        run(R) {
            const a = R.a, n = a.length;
            R.start('Start: compare neighbours and swap them whenever they are out of order.');
            for (let i = 0; i < n - 1; i++) {
                let sw = false;
                for (let j = 0; j < n - i - 1; j++) {
                    const x = a[j], y = a[j + 1];
                    if (x > y) {
                        R.cmp(j, j + 1, 3, `${x} > ${y}: they are out of order, so swap them.`);
                        R.swap(j, j + 1, 4, `Swapped – ${y} now sits before ${x}.`);
                        sw = true;
                    } else {
                        R.cmp(j, j + 1, 3, `${x} ≤ ${y}: already in order, move on.`);
                    }
                }
                R.sorted(6, `${a[n - i - 1]} has bubbled up to its final position.`, n - i - 1);
                if (!sw) { R.note(7, 'No swaps happened in that pass, so the array must be sorted. Stop early!'); break; }
            }
            R.allSorted();
        }
    },

    selection: {
        name: 'Selection Sort', color: '#f5a623',
        best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'No', inplace: 'Yes',
        blurb: 'Selection sort scans the unsorted part to find the smallest item, then swaps it into the next free slot at the front.',
        idea: ['Find the smallest item in the unsorted part.', 'Swap it with the first unsorted item.', 'The sorted part grows by one; repeat.'],
        analogy: 'Picking the shortest person from a crowd to stand first in line, then the next shortest, and so on.',
        good: 'Always does about n²/2 comparisons, but never more than n−1 swaps – useful when writing to memory is expensive.',
        tryIt: 'Compare the comparison count on "Sorted" vs "Random" – it barely changes. Selection sort cannot take advantage of existing order.',
        pseudo: [
            'for i from 0 to n-2',
            '  min = i',
            '  for j from i+1 to n-1',
            '    if A[j] < A[min]',
            '      min = j',
            '  swap(A[i], A[min])',
            '  A[i] is now in its final place'
        ],
        run(R) {
            const a = R.a, n = a.length;
            R.start('Start: repeatedly find the smallest unsorted item and move it to the front.');
            for (let i = 0; i < n - 1; i++) {
                let m = i;
                R.piv([m]);
                R.note(1, `Pass ${i + 1}: assume ${a[m]} (position ${i}) is the smallest so far.`);
                for (let j = i + 1; j < n; j++) {
                    const better = a[j] < a[m];
                    R.cmp(j, m, 3, better
                        ? `${a[j]} < ${a[m]}: found a new minimum!`
                        : `${a[j]} ≥ ${a[m]}: keep ${a[m]} as the minimum.`);
                    if (better) { m = j; R.piv([m]); }
                }
                if (m !== i) R.swap(i, m, 5, `Swap the minimum (${a[m]}) into position ${i}.`);
                else R.note(5, `${a[i]} is already the smallest – no swap needed.`);
                R.piv([]);
                R.sorted(6, `Position ${i} is now final.`, i);
            }
            R.allSorted();
        }
    },

    insertion: {
        name: 'Insertion Sort', color: '#00dfd8',
        best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'Yes', inplace: 'Yes',
        blurb: 'Insertion sort builds a sorted section one item at a time, sliding each new item left until it fits.',
        idea: ['Treat the first item as a sorted list of one.', 'Take the next item and slide it left past any larger items.', 'Repeat until every item has been inserted.'],
        analogy: 'Sorting playing cards in your hand: pick up a card and slide it into the right spot among the cards you already hold.',
        good: 'Excellent for small or nearly-sorted data. Real libraries use it for small sub-arrays inside faster algorithms.',
        tryIt: 'Choose "Nearly sorted" in Race mode and pit it against Merge sort – insertion sort often wins when only a few items are out of place.',
        pseudo: [
            'for i from 1 to n-1',
            '  j = i',
            '  while j > 0 and A[j-1] > A[j]',
            '    swap(A[j-1], A[j])',
            '    j = j - 1'
        ],
        run(R) {
            const a = R.a, n = a.length;
            R.start('Start: the first item alone is a sorted list. Insert the rest one by one.');
            for (let i = 1; i < n; i++) {
                R.pre(i);
                R.piv([i]);
                R.note(1, `Take ${a[i]} and slide it left into the sorted part.`);
                let j = i, broke = false;
                while (j > 0) {
                    const L = a[j - 1], X = a[j];
                    if (L > X) {
                        R.cmp(j - 1, j, 2, `${L} > ${X}: ${X} must move left.`);
                        R.piv([j - 1]);
                        R.swap(j - 1, j, 3, `Swapped – ${X} moves one step left.`);
                        j--;
                    } else {
                        R.cmp(j - 1, j, 2, `${L} ≤ ${X}: ${X} is in the right spot. Stop sliding.`);
                        broke = true; break;
                    }
                }
                if (!broke) R.note(2, `${a[0]} reached the front of the array.`);
                R.piv([]);
            }
            R.allSorted();
        }
    },

    merge: {
        name: 'Merge Sort', color: '#3291ff',
        best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: 'Yes', inplace: 'No',
        blurb: 'Merge sort splits the array in half again and again, then merges the sorted halves back together.',
        idea: ['Split the array in the middle until each piece has 1 item.', 'A single item is already sorted.', 'Merge two sorted pieces by repeatedly taking the smaller front item.', 'Keep merging upwards until one sorted array remains.'],
        analogy: 'Merging two sorted decks of cards: always take whichever top card is smaller.',
        good: 'Predictable speed on any input, so it is used for stable library sorts and linked lists. The price is extra memory for the temporary halves.',
        tryIt: 'Run it on "Reversed" and then "Random": the amount of work barely changes – O(n log n) is guaranteed.',
        pseudo: [
            'mergeSort(lo, hi)',
            '  if hi - lo <= 1: return',
            '  mid = (lo + hi) / 2',
            '  mergeSort(lo, mid)',
            '  mergeSort(mid, hi)',
            '  merge the two sorted halves:',
            '    while both halves have items',
            '      write the smaller front item to A',
            '    copy any leftovers to A'
        ],
        run(R) {
            const a = R.a, n = a.length;
            R.start('Start: split in half, sort each half, then merge.');
            const ms = (lo, hi) => {
                if (hi - lo <= 1) return;
                const mid = (lo + hi) >> 1;
                R.range(lo, hi);
                R.note(2, `Split positions ${lo}–${hi - 1} into [${lo}–${mid - 1}] and [${mid}–${hi - 1}].`);
                ms(lo, mid);
                ms(mid, hi);
                R.range(lo, hi);
                const L = a.slice(lo, mid), Rt = a.slice(mid, hi);
                R.note(5, `Merge the sorted left half (${L.length} items) with the sorted right half (${Rt.length} items).`);
                let i = 0, j = 0, k = lo;
                while (i < L.length && j < Rt.length) {
                    if (L[i] <= Rt[j]) {
                        R.cmpWrite(k, L[i], 7, `${L[i]} ≤ ${Rt[j]}: take ${L[i]} from the left half and write it to position ${k}.`);
                        i++;
                    } else {
                        R.cmpWrite(k, Rt[j], 7, `${L[i]} > ${Rt[j]}: take ${Rt[j]} from the right half and write it to position ${k}.`);
                        j++;
                    }
                    k++;
                }
                while (i < L.length) { R.write(k, L[i], 8, `Left half has leftovers: copy ${L[i]} to position ${k}.`); i++; k++; }
                while (j < Rt.length) { R.write(k, Rt[j], 8, `Right half has leftovers: copy ${Rt[j]} to position ${k}.`); j++; k++; }
            };
            ms(0, n);
            R.allSorted();
        }
    },

    quick: {
        name: 'Quick Sort', color: '#a066ff',
        best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: 'No', inplace: 'Yes',
        blurb: 'Quick sort picks a pivot, moves smaller items to its left and larger ones to its right, then sorts each side the same way.',
        idea: ['Pick a pivot (here: the last item).', 'Partition: move everything smaller than the pivot to the left.', 'Drop the pivot between the two groups – it is now in its final place.', 'Recursively sort the left and right groups.'],
        analogy: 'Sorting people by height using one volunteer as a reference: shorter go left, taller go right, then repeat inside each group.',
        good: 'Usually the fastest in practice thanks to cache-friendly in-place partitioning. A bad pivot (like the last item on sorted data) causes the O(n²) worst case.',
        tryIt: 'Switch to "Sorted" or "Reversed": with a last-item pivot every split is lopsided and it slows to O(n²). Real implementations pick a random or median pivot.',
        pseudo: [
            'quickSort(lo, hi)',
            '  if lo >= hi: return',
            '  pivot = A[hi]',
            '  i = lo',
            '  for j from lo to hi-1',
            '    if A[j] < pivot',
            '      swap(A[i], A[j]); i = i + 1',
            '  swap(A[i], A[hi])   // pivot lands at i',
            '  quickSort(lo, i-1)',
            '  quickSort(i+1, hi)'
        ],
        run(R) {
            const a = R.a, n = a.length;
            R.start('Start: pick a pivot, split the items around it, then repeat on each side.');
            const qs = (lo, hi) => {
                if (lo > hi) return;
                if (lo === hi) { R.sorted(1, `A lone item (${a[lo]}) is already in place.`, lo); return; }
                R.range(lo, hi);
                const p = a[hi];
                R.piv([hi]);
                R.note(2, `Choose the last item, ${p}, as the pivot (positions ${lo}–${hi}).`);
                let i = lo;
                for (let j = lo; j < hi; j++) {
                    if (a[j] < p) {
                        R.cmp(j, hi, 5, `${a[j]} < pivot ${p}: it belongs on the left side.`);
                        if (i !== j) R.swap(i, j, 6, `Swap ${a[i]} and ${a[j]} to grow the "smaller" group.`);
                        i++;
                    } else {
                        R.cmp(j, hi, 5, `${a[j]} ≥ pivot ${p}: leave it on the right side.`);
                    }
                }
                if (i !== hi) R.swap(i, hi, 7, `Move the pivot ${p} into the gap between the smaller and larger groups.`);
                else R.note(7, `Every item was smaller, so the pivot ${p} stays where it is.`);
                R.piv([]);
                R.sorted(7, `Pivot ${p} is now in its final position.`, i);
                if (lo <= i - 1) { R.note(8, `Now sort the left group (positions ${lo}–${i - 1}).`); qs(lo, i - 1); }
                if (i + 1 <= hi) { R.range(i + 1, hi); R.note(9, `Now sort the right group (positions ${i + 1}–${hi}).`); qs(i + 1, hi); }
            };
            qs(0, n - 1);
            R.allSorted();
        }
    },

    heap: {
        name: 'Heap Sort', color: '#7ee787',
        best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', stable: 'No', inplace: 'Yes',
        blurb: 'Heap sort arranges the array into a max-heap (every parent ≥ its children), then repeatedly swaps the biggest item to the end and repairs the heap.',
        idea: ['Build a max-heap so the largest item sits at position 0.', 'Swap the root with the last heap item – it is now final.', 'Shrink the heap and sift the new root down to restore it.', 'Repeat until the heap is empty.'],
        analogy: 'A tournament bracket: the champion (largest) rises to the top. Remove them, replay the bracket, and the next champion emerges.',
        good: 'Guaranteed O(n log n) with no extra memory, but it jumps around memory so it is usually slower than quick sort in practice.',
        tryIt: 'Watch the first phase: building the heap makes the array look chaotic before the sorted section grows from the right.',
        pseudo: [
            'build a max-heap from A',
            'for end from n-1 down to 1',
            '  swap(A[0], A[end])',
            '  A[end] is now in its final place',
            '  siftDown(0, end)',
            '',
            'siftDown(i, size):',
            '  largest = i',
            '  if left child > A[largest]: largest = left',
            '  if right child > A[largest]: largest = right',
            '  if largest != i: swap(A[i], A[largest]), repeat'
        ],
        run(R) {
            const a = R.a, n = a.length;
            R.start('Start: first build a max-heap, then pull the biggest item out repeatedly.');
            const sift = (i, size) => {
                R.range(0, size - 1);
                while (true) {
                    const l = 2 * i + 1, r = l + 1;
                    let big = i;
                    R.piv([i]);
                    if (l < size) {
                        const better = a[l] > a[big];
                        R.cmp(l, big, 8, better ? `Left child ${a[l]} > ${a[big]}: it is the larger so far.` : `Left child ${a[l]} ≤ ${a[big]}.`);
                        if (better) big = l;
                    }
                    if (r < size) {
                        const better = a[r] > a[big];
                        R.cmp(r, big, 9, better ? `Right child ${a[r]} > ${a[big]}: it is the larger so far.` : `Right child ${a[r]} ≤ ${a[big]}.`);
                        if (better) big = r;
                    }
                    if (big === i) break;
                    R.swap(i, big, 10, `Swap ${a[i]} with its larger child ${a[big]} (sift down).`);
                    i = big;
                }
                R.piv([]);
            };
            R.note(0, 'Phase 1: build a max-heap by sifting down every parent, starting from the last one.');
            for (let i = (n >> 1) - 1; i >= 0; i--) sift(i, n);
            R.note(1, 'Phase 2: the largest item is at position 0. Move it to the end, shrink the heap, repair.');
            for (let end = n - 1; end > 0; end--) {
                R.swap(0, end, 2, `Swap the max (${a[0]}) with the last heap item.`);
                R.sorted(3, `${a[end]} is now in its final position.`, end);
                sift(0, end);
            }
            R.allSorted();
        }
    }
};

const ALGO_ORDER = ['bubble', 'selection', 'insertion', 'merge', 'quick', 'heap'];

/* ---------------------------------------------------------------------
   Application state
   --------------------------------------------------------------------- */
const S = {
    mode: 'learn',
    algos: ['bubble'],
    scenario: 'random',
    n: 30,
    data: [], max: 1,
    engines: [],
    tick: 0, maxTick: 0,
    playing: false, timer: null,
    sound: false, labels: true,
    metric: 'cmp', log: false,
    scale: null
};

const MODE_HINTS = {
    learn: 'Step through one algorithm with plain-English explanations and live pseudocode.',
    race: 'Run several algorithms on identical data, side by side, and compare the work they do.',
    scaling: 'See how the number of operations grows as the array gets bigger.'
};

/* ---------------------------------------------------------------------
   Sound
   --------------------------------------------------------------------- */
let actx = null;
function beep(v) {
    if (!S.sound) return;
    try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'triangle';
        o.frequency.value = 180 + (v / S.max) * 900;
        g.gain.value = 0.04;
        o.connect(g); g.connect(actx.destination);
        g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.08);
        o.start(); o.stop(actx.currentTime + 0.09);
    } catch (e) { /* audio not available */ }
}

/* ---------------------------------------------------------------------
   Toast
   --------------------------------------------------------------------- */
let toastTimer = null;
function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------------------------------------------------------------------
   Sidebar UI
   --------------------------------------------------------------------- */
function buildAlgoList() {
    const list = $('#algoList');
    list.innerHTML = '';
    ALGO_ORDER.forEach(k => {
        const A = ALGOS[k];
        const b = document.createElement('button');
        b.className = 'algo-item' + (S.algos.includes(k) ? ' on' : '');
        b.dataset.key = k;
        b.innerHTML = `<i class="dot" style="background:${A.color}"></i><span class="nm">${A.name}</span><span class="tc">${A.avg}</span>`;
        b.onclick = () => onAlgoClick(k);
        list.appendChild(b);
    });
    $('#algoLabel').textContent = S.mode === 'learn' ? 'Algorithm' : 'Algorithms';
}

function onAlgoClick(k) {
    if (S.mode === 'learn') S.algos = [k];
    else {
        const i = S.algos.indexOf(k);
        if (i >= 0) { if (S.algos.length === 1) return; S.algos.splice(i, 1); }
        else S.algos.push(k);
        S.algos.sort((a, b) => ALGO_ORDER.indexOf(a) - ALGO_ORDER.indexOf(b));
    }
    buildAlgoList();
    refresh();
}

function buildScenarioChips() {
    const box = $('#scenList');
    box.innerHTML = '';
    Object.entries(SCENARIOS).forEach(([k, v]) => {
        const b = document.createElement('button');
        b.className = 'chip' + (S.scenario === k ? ' on' : '');
        b.textContent = v.label;
        b.onclick = () => { S.scenario = k; newData(); };
        box.appendChild(b);
    });
    $('#scenHint').textContent = SCENARIOS[S.scenario] ? SCENARIOS[S.scenario].hint : 'Using your own custom sequence.';
}

function setMode(m) {
    pause();
    S.mode = m;
    document.body.dataset.mode = m;
    document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    $('#modeHint').textContent = MODE_HINTS[m];
    if (m === 'learn') S.algos = [S.algos[0] || 'bubble'];
    else if (S.algos.length < 2) S.algos = ['insertion', 'merge', 'quick'];
    buildAlgoList();
    refresh();
}

function refresh() {
    if (S.mode === 'scaling') runScaling();
    else rebuild();
}

function newData() {
    pause();
    if (!SCENARIOS[S.scenario]) S.scenario = 'random';
    S.data = makeData(S.scenario, S.n);
    buildScenarioChips();
    refresh();
}

function applyCustom() {
    const raw = $('#customInput').value;
    let arr = raw.split(/[\s,;]+/).map(Number).filter(v => Number.isFinite(v) && v > 0).map(v => Math.min(999, Math.round(v)));
    if (arr.length < 2) { toast('Enter at least 2 positive numbers, e.g. 40, 10, 30, 20'); return; }
    if (arr.length > MAX_N) { arr = arr.slice(0, MAX_N); toast(`Only the first ${MAX_N} numbers are used.`); }
    pause();
    S.data = arr; S.n = arr.length; S.scenario = 'custom';
    $('#sizeRange').value = Math.min(S.n, MAX_N); $('#nVal').textContent = S.n;
    buildScenarioChips();
    if (S.mode === 'scaling') { S.mode = 'learn'; setMode('learn'); toast('Custom data works in Learn and Race modes.'); }
    else rebuild();
}

/* ---------------------------------------------------------------------
   Panels + rendering
   --------------------------------------------------------------------- */
function buildPanel(key) {
    const A = ALGOS[key];
    const el = document.createElement('div');
    el.className = 'engine-panel';
    el.innerHTML = `
        <div class="panel-info">
            <div class="algo-title"><i class="dot" style="background:${A.color}"></i>${A.name}</div>
            <div class="panel-badges"><span class="done-badge" hidden>✓ Done</span><span class="comp-badge">${A.avg}</span></div>
        </div>
        <div class="metrics">
            <div class="m-card">Comparisons <b class="m-cmp">0</b></div>
            <div class="m-card">Swaps / writes <b class="m-wr">0</b></div>
        </div>
        <div class="viz"></div>
        <div class="panel-msg"></div>`;
    const viz = $('.viz', el);
    const n = S.data.length;
    const bars = [];
    for (let i = 0; i < n; i++) {
        const b = document.createElement('div');
        b.className = 'bar';
        b.appendChild(document.createElement('span')).className = 'val';
        viz.appendChild(b);
        bars.push(b);
    }
    viz.classList.toggle('show-vals', S.labels && n <= 30);
    viz.classList.toggle('tight', n > 40);
    return {
        el, bars,
        cmpEl: $('.m-cmp', el), wrEl: $('.m-wr', el), doneEl: $('.done-badge', el), msgEl: $('.panel-msg', el),
        lastV: new Array(n).fill(-1), lastCls: new Array(n).fill('')
    };
}

function renderEngine(e, idx) {
    const f = e.frames[idx];
    const n = e.bars.length;
    const code = new Uint8Array(n);
    for (let i = 0; i < f.pre && i < n; i++) code[i] = 1;
    for (const i of f.srt) code[i] = 2;
    for (const i of f.p) code[i] = 3;
    for (const i of f.c) code[i] = 4;
    for (const i of f.s) code[i] = 5;
    const ranged = f.lo >= 0;
    for (let i = 0; i < n; i++) {
        const v = f.d[i], b = e.bars[i];
        if (e.lastV[i] !== v) {
            b.style.height = (v / S.max * 100) + '%';
            b.firstChild.textContent = v;
            e.lastV[i] = v;
        }
        const dim = ranged && (i < f.lo || i > f.hi) && code[i] !== 2;
        const cls = 'bar' + (code[i] ? ' s' + code[i] : '') + (dim ? ' dim' : '');
        if (e.lastCls[i] !== cls) { b.className = cls; e.lastCls[i] = cls; }
    }
    e.cmpEl.textContent = f.k.toLocaleString();
    e.wrEl.textContent = f.w.toLocaleString();
    e.doneEl.hidden = idx < e.frames.length - 1;
    e.msgEl.textContent = f.msg;
}

let lastPseudoLine = -2;
function renderAll(withSound) {
    S.engines.forEach(e => renderEngine(e, Math.min(S.tick, e.frames.length - 1)));
    $('#scrub').value = S.tick;
    $('#stepLabel').textContent = `Step ${S.tick.toLocaleString()} / ${S.maxTick.toLocaleString()}`;
    if (S.mode === 'learn' && S.engines[0]) {
        const e = S.engines[0];
        const f = e.frames[Math.min(S.tick, e.frames.length - 1)];
        $('#explain').textContent = f.msg;
        if (f.line !== lastPseudoLine) {
            const lines = document.querySelectorAll('#pseudo .pl');
            lines.forEach(l => l.classList.remove('active'));
            if (f.line >= 0 && lines[f.line]) {
                lines[f.line].classList.add('active');
            }
            lastPseudoLine = f.line;
        }
        if (withSound) {
            const idx = f.s.length ? f.s[0] : f.c.length ? f.c[0] : -1;
            if (idx >= 0) beep(f.d[idx]);
        }
    }
}

function buildLearnSide(key) {
    const A = ALGOS[key];
    $('#pseudo').innerHTML = A.pseudo.map(l => `<div class="pl"><code>${esc(l) || '&nbsp;'}</code></div>`).join('');
    lastPseudoLine = -2;
    $('#aboutBlurb').textContent = A.blurb;
    $('#aboutIdea').innerHTML = A.idea.map(s => `<li>${esc(s)}</li>`).join('');
    $('#aboutAnalogy').textContent = A.analogy;
    $('#aboutGood').textContent = A.good;
    $('#aboutTry').textContent = A.tryIt;
    $('#aboutTable').innerHTML = `
        <tr><th>Best case</th><td>${A.best}</td><th>Space</th><td>${A.space}</td></tr>
        <tr><th>Average</th><td>${A.avg}</td><th>Stable</th><td>${A.stable}</td></tr>
        <tr><th>Worst case</th><td>${A.worst}</td><th>In-place</th><td>${A.inplace}</td></tr>`;
    $('#learnTitle').textContent = A.name;
}

function rebuild(keepTick) {
    const prevTick = S.tick;
    pause();
    closeOverlay();
    S.max = Math.max(...S.data);
    const grid = $('#matrixGrid');
    grid.innerHTML = '';
    S.engines = [];
    S.algos.forEach(k => {
        const r = runAlgo(k, S.data, true);
        const p = buildPanel(k);
        S.engines.push({ key: k, frames: r.frames, cmp: r.cmp, wr: r.wr, ...p });
        grid.appendChild(p.el);
    });
    S.maxTick = Math.max(...S.engines.map(e => e.frames.length - 1));
    S.tick = keepTick ? Math.min(prevTick, S.maxTick) : 0;
    $('#scrub').max = S.maxTick;
    if (S.mode === 'learn') buildLearnSide(S.algos[0]);
    $('#status').textContent = S.mode === 'learn'
        ? `${ALGOS[S.algos[0]].name} · ${S.data.length} items · ${SCENARIOS[S.scenario] ? SCENARIOS[S.scenario].label : 'Custom'}`
        : `Racing ${S.algos.length} algorithms · ${S.data.length} items · ${SCENARIOS[S.scenario] ? SCENARIOS[S.scenario].label : 'Custom'}`;
    renderAll();
}

/* ---------------------------------------------------------------------
   Playback
   --------------------------------------------------------------------- */
const delay = () => Math.max(16, Math.round(700 * Math.pow(0.05, +$('#speed').value / 80)));
const stepsPerTick = () => { const s = +$('#speed').value; return s >= 80 ? 1 + Math.floor((s - 80) / 2.5) : 1; };

function updatePlayBtn() {
    $('#playBtn').textContent = S.playing ? '❚❚ Pause' : (S.tick >= S.maxTick && S.maxTick > 0 ? '↻ Replay' : '▶ Play');
}

function play() {
    if (S.mode === 'scaling') return;
    closeOverlay();
    if (S.tick >= S.maxTick) S.tick = 0;
    S.playing = true;
    updatePlayBtn();
    loop();
}

function pause() {
    S.playing = false;
    clearTimeout(S.timer);
    updatePlayBtn();
}

function togglePlay() { S.playing ? pause() : play(); }

function loop() {
    if (!S.playing) return;
    S.tick = Math.min(S.maxTick, S.tick + stepsPerTick());
    renderAll(true);
    if (S.tick >= S.maxTick) { S.playing = false; updatePlayBtn(); onFinish(); return; }
    S.timer = setTimeout(loop, delay());
}

function step(d) {
    pause();
    S.tick = Math.max(0, Math.min(S.maxTick, S.tick + d));
    renderAll(true);
    updatePlayBtn();
    if (S.tick >= S.maxTick) onFinish();
}

function restart() { pause(); closeOverlay(); S.tick = 0; renderAll(); updatePlayBtn(); }

function onFinish() { if (S.mode === 'race' && S.engines.length > 1) showResults(); }

/* ---------------------------------------------------------------------
   Race results overlay
   --------------------------------------------------------------------- */
function showResults() {
    const ranked = [...S.engines].sort((a, b) => (a.cmp + a.wr) - (b.cmp + b.wr));
    const best = ranked[0], worst = ranked[ranked.length - 1];
    const bt = best.cmp + best.wr;
    let html = `<table class="comp-table"><tr><th>#</th><th>Algorithm</th><th>Comparisons</th><th>Swaps / writes</th><th>Total</th><th>vs best</th></tr>`;
    ranked.forEach((e, i) => {
        const t = e.cmp + e.wr;
        html += `<tr class="${i === 0 ? 'row-winner' : ''}"><td>${i + 1}</td><td><i class="dot" style="background:${ALGOS[e.key].color}"></i>${ALGOS[e.key].name}</td>
            <td>${e.cmp.toLocaleString()}</td><td>${e.wr.toLocaleString()}</td><td>${t.toLocaleString()}</td><td>${i === 0 ? 'Fewest' : (t / bt).toFixed(1) + '×'}</td></tr>`;
    });
    html += '</table>';
    $('#comparisonDetails').innerHTML = html;
    const scen = SCENARIOS[S.scenario] ? SCENARIOS[S.scenario].label.toLowerCase() : 'custom';
    $('#resSub').textContent = `${S.data.length} items · ${scen} data`;
    $('#resInsight').textContent = `${ALGOS[best.key].name} needed the fewest operations. ${ALGOS[worst.key].name} needed ${(( worst.cmp + worst.wr) / bt).toFixed(1)}× as many. Operations are only a proxy for real time – memory access and hardware matter too. Try another data pattern and race again!`;
    $('#comparisonOverlay').style.display = 'flex';
}
function closeOverlay() { $('#comparisonOverlay').style.display = 'none'; }

/* ---------------------------------------------------------------------
   Scaling mode: headless runs for n = 5 … 200, plotted on a canvas
   --------------------------------------------------------------------- */
const CH = { l: 62, r: 20, t: 38, b: 38 };

function runScaling() {
    pause(); closeOverlay();
    const keys = S.algos;
    const ns = []; for (let n = 5; n <= 200; n += 5) ns.push(n);
    const kind = SCENARIOS[S.scenario] ? S.scenario : 'random';
    const reps = (kind === 'random' || kind === 'nearly' || kind === 'few') ? 3 : 1;
    const res = {};
    keys.forEach(k => res[k] = { cmp: [], wr: [] });
    ns.forEach(n => {
        const acc = {}; keys.forEach(k => acc[k] = { c: 0, w: 0 });
        for (let r = 0; r < reps; r++) {
            const d = makeData(kind, n);
            keys.forEach(k => { const o = runAlgo(k, d, false); acc[k].c += o.cmp; acc[k].w += o.wr; });
        }
        keys.forEach(k => { res[k].cmp.push(acc[k].c / reps); res[k].wr.push(acc[k].w / reps); });
    });
    S.scale = { ns, res, kind };
    $('#status').textContent = `Scaling · ${keys.length} algorithms · ${SCENARIOS[kind].label} data`;
    drawChart();
    buildScaleTable();
}

const scaleVal = (k, i) => {
    const r = S.scale.res[k];
    return S.metric === 'cmp' ? r.cmp[i] : S.metric === 'wr' ? r.wr[i] : r.cmp[i] + r.wr[i];
};

function drawChart(hover = -1) {
    if (!S.scale) return;
    const cv = $('#chart'), wrap = cv.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(320, wrap.clientWidth), H = 400;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { ns, res } = S.scale;
    const keys = Object.keys(res);
    const tf = v => S.log ? Math.log10(v + 1) : v;
    let ymax = 0;
    keys.forEach(k => ns.forEach((n, i) => { ymax = Math.max(ymax, tf(scaleVal(k, i))); }));
    ymax = ymax || 1;
    const pw = W - CH.l - CH.r, ph = H - CH.t - CH.b;
    const X = n => CH.l + (n - ns[0]) / (ns[ns.length - 1] - ns[0]) * pw;
    const Y = v => CH.t + ph - (tf(v) / ymax) * ph;

    ctx.font = '11px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#1f1f24'; ctx.fillStyle = '#7a7a85'; ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    if (S.log) {
        for (let e = 0; e <= Math.ceil(ymax); e++) {
            const y = CH.t + ph - (e / ymax) * ph;
            if (y < CH.t - 1) continue;
            ctx.beginPath(); ctx.moveTo(CH.l, y); ctx.lineTo(W - CH.r, y); ctx.stroke();
            ctx.fillText(fmt(Math.pow(10, e) - 1 || 1), CH.l - 8, y);
        }
    } else {
        for (let t = 0; t <= 4; t++) {
            const y = CH.t + ph - (t / 4) * ph;
            ctx.beginPath(); ctx.moveTo(CH.l, y); ctx.lineTo(W - CH.r, y); ctx.stroke();
            ctx.fillText(fmt(ymax * t / 4), CH.l - 8, y);
        }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let n = 40; n <= ns[ns.length - 1]; n += 40) ctx.fillText(n, X(n), H - CH.b + 10);
    ctx.fillText('array size (n)', CH.l + pw / 2, H - 16);

    keys.forEach(k => {
        ctx.strokeStyle = ALGOS[k].color; ctx.lineWidth = 2.2; ctx.beginPath();
        ns.forEach((n, i) => { const x = X(n), y = Y(scaleVal(k, i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
    });

    // legend
    let lx = CH.l; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    keys.forEach(k => {
        ctx.fillStyle = ALGOS[k].color; ctx.beginPath(); ctx.arc(lx + 5, 16, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#d4d4dc'; ctx.fillText(ALGOS[k].name, lx + 15, 16);
        lx += 24 + ctx.measureText(ALGOS[k].name).width + 14;
    });

    // hover guide + tooltip
    if (hover >= 0) {
        const n = ns[hover], x = X(n);
        ctx.strokeStyle = '#444'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, CH.t); ctx.lineTo(x, CH.t + ph); ctx.stroke(); ctx.setLineDash([]);
        const rows = keys.map(k => ({ k, v: scaleVal(k, hover) })).sort((a, b) => b.v - a.v);
        rows.forEach(r => { ctx.fillStyle = ALGOS[r.k].color; ctx.beginPath(); ctx.arc(x, Y(r.v), 4, 0, 7); ctx.fill(); });
        const bw = 190, bh = 22 + rows.length * 18;
        let bx = x + 12; if (bx + bw > W - 6) bx = x - bw - 12;
        const by = CH.t + 6;
        ctx.fillStyle = 'rgba(17,17,19,.96)'; ctx.strokeStyle = '#2a2a30';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 8) : ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#9a9aa5'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`n = ${n}`, bx + 10, by + 13);
        rows.forEach((r, i) => {
            ctx.fillStyle = ALGOS[r.k].color; ctx.fillText('●', bx + 10, by + 32 + i * 18);
            ctx.fillStyle = '#ececf1'; ctx.fillText(ALGOS[r.k].name.replace(' Sort', ''), bx + 26, by + 32 + i * 18);
            ctx.textAlign = 'right'; ctx.fillText(Math.round(r.v).toLocaleString(), bx + bw - 10, by + 32 + i * 18); ctx.textAlign = 'left';
        });
    }
}

function buildScaleTable() {
    const { ns, res } = S.scale;
    const last = ns.length - 1, N = ns[last];
    const keys = Object.keys(res).sort((a, b) => (res[a].cmp[last] + res[a].wr[last]) - (res[b].cmp[last] + res[b].wr[last]));
    let html = `<table class="comp-table"><tr><th>At n = ${N}</th><th>Typical growth</th><th>Comparisons</th><th>Swaps / writes</th><th>Total</th></tr>`;
    keys.forEach((k, i) => {
        html += `<tr class="${i === 0 ? 'row-winner' : ''}"><td><i class="dot" style="background:${ALGOS[k].color}"></i>${ALGOS[k].name}</td><td>${ALGOS[k].avg}</td>
            <td>${Math.round(res[k].cmp[last]).toLocaleString()}</td><td>${Math.round(res[k].wr[last]).toLocaleString()}</td>
            <td>${Math.round(res[k].cmp[last] + res[k].wr[last]).toLocaleString()}</td></tr>`;
    });
    $('#scaleTable').innerHTML = html + '</table>';
    const a = keys[0], z = keys[keys.length - 1];
    const ta = res[a].cmp[last] + res[a].wr[last], tz = res[z].cmp[last] + res[z].wr[last];
    $('#scaleInsight').textContent = keys.length > 1
        ? `At ${N} items, ${ALGOS[z].name} does ${(tz / ta).toFixed(1)}× more work than ${ALGOS[a].name}. Doubling n roughly quadruples the work of an O(n²) algorithm, but only a bit more than doubles an O(n log n) one – that gap keeps widening as data grows.`
        : 'Select two or more algorithms to compare how their growth curves diverge.';
}

/* ---------------------------------------------------------------------
   Wire up the page
   --------------------------------------------------------------------- */
function init() {
    S.data = makeData(S.scenario, S.n);

    document.querySelectorAll('#modeSeg button').forEach(b => b.onclick = () => setMode(b.dataset.mode));
    $('#playBtn').onclick = togglePlay;
    $('#backBtn').onclick = () => step(-1);
    $('#nextBtn').onclick = () => step(1);
    $('#restartBtn').onclick = restart;
    $('#newDataBtn').onclick = () => { if (!SCENARIOS[S.scenario]) S.scenario = 'random'; newData(); };
    $('#scrub').oninput = e => { pause(); S.tick = +e.target.value; renderAll(); updatePlayBtn(); };
    $('#sizeRange').oninput = e => { S.n = +e.target.value; $('#nVal').textContent = S.n; if (!SCENARIOS[S.scenario]) S.scenario = 'random'; newData(); };
    $('#applyCustom').onclick = applyCustom;
    $('#customInput').onkeydown = e => { if (e.key === 'Enter') applyCustom(); };
    $('#soundToggle').onchange = e => { S.sound = e.target.checked; };
    $('#labelToggle').onchange = e => { S.labels = e.target.checked; if (S.mode !== 'scaling') { const t = S.tick; rebuild(true); S.tick = t; renderAll(); } };
    $('#resClose').onclick = closeOverlay;
    $('#resAgain').onclick = () => { closeOverlay(); newData(); play(); };

    document.querySelectorAll('#metricSeg button').forEach(b => b.onclick = () => {
        S.metric = b.dataset.metric;
        document.querySelectorAll('#metricSeg button').forEach(x => x.classList.toggle('on', x === b));
        drawChart(); 
    });
    $('#logToggle').onchange = e => { S.log = e.target.checked; drawChart(); };

    const cv = $('#chart');
    cv.addEventListener('mousemove', e => {
        if (!S.scale) return;
        const rect = cv.getBoundingClientRect();
        const pw = rect.width - CH.l - CH.r;
        const frac = (e.clientX - rect.left - CH.l) / pw;
        const idx = Math.round(frac * (S.scale.ns.length - 1));
        drawChart(idx >= 0 && idx < S.scale.ns.length ? idx : -1);
    });
    cv.addEventListener('mouseleave', () => drawChart(-1));
    window.addEventListener('resize', () => { if (S.mode === 'scaling') drawChart(); });

    document.addEventListener('keydown', e => {
        if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'range') return;
        if (e.key === ' ') { e.preventDefault(); togglePlay(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        else if (e.key === 'r' || e.key === 'R') restart();
        else if (e.key === 'n' || e.key === 'N') newData();
        else if (e.key === 'Escape') closeOverlay();
    });

    buildScenarioChips();
    setMode('learn');
}

init();
