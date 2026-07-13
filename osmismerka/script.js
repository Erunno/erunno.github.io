// ==========================================
// 1. CONFIGURATION
// ==========================================
const GRID_SIZE = 12; 
const WORDS_TO_FIND = 8;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZĚŠČŘŽÝÁÍÉÚŮŤĎŇ"; 
const ACTIVE_DIRECTIONS = [[0, 1], [1, 0], [1, 1]];

// ==========================================
// 2. ENGINE STATE & STORAGE
// ==========================================
let grid = [];
let wordPlacements = {}; 
let remainingWords = [];
let fullDictionary = []; 
let recognition;
let isIntentionalStop = false;
let appState = 'playing'; // 'playing' | 'dashboard'
let gameStartTime = 0; // NOVÉ: Sledování začátku hry

let initialWords = []; // Uchová původní pořadí pro číslování

// Mapa možných tvarů číslovek po odstranění diakritiky
const NUMBER_SYNONYMS = {
    1: ["1", "JEDNA", "JEDNICKU", "JEDNICKA", "PRVNI"],
    2: ["2", "DVA", "DVE", "DVOJKU", "DVOJKA", "DRUHY", "DRUHOU"],
    3: ["3", "TRI", "TROJKU", "TROJKA", "TRETI", "TRETIHO"],
    4: ["4", "CTYRI", "CTYRKU", "CTYRKA", "CTVRTY", "CTVRTOU"],
    5: ["5", "PET", "PETKU", "PETKA", "PATY", "PATOU"],
    6: ["6", "SEST", "SESTKU", "SESTKA", "SASTY", "SESTOU"],
    7: ["7", "SEDM", "SEDMICKU", "SEDMICKA", "SEDMA", "SEDMOU"],
    8: ["8", "OSM", "OSMICKU", "OSMICKA", "OSMA", "OSMOU"]
};

const StorageManager = {
    getKey: () => 'osmHistory_v1',
    load: function() {
        const data = localStorage.getItem(this.getKey());
        return data ? JSON.parse(data) : [];
    },
    saveWin: function(durationMs) { // NOVÉ: Přidán parametr trvání hry
        const history = this.load();
        const todayLocal = new Date().toLocaleDateString('en-CA');
        
        history.push({
            id: Date.now().toString() + '-' + Math.floor(Math.random() * 10000),
            date: todayLocal,
            timestamp: Date.now(),
            duration: durationMs // Uložení času do historie
        });
        
        localStorage.setItem(this.getKey(), JSON.stringify(history));
        return history;
    }
};

// ==========================================
// 3. CORE LOGIC
// ==========================================
function normalizeCzechWord(word) {
    return word.trim().toUpperCase(); // Ponechává diakritiku pro hledání v mřížce
}

// NOVÉ: Striktní ořezání diakritiky pouze pro detekci povelů ("Nová hra")
function normalizeForCommand(word) {
    return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

// NOVÉ: Pomocná funkce pro převod milisekund na čitelný text
function formatTime(ms) {
    if (!ms || ms <= 0) return "--";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} min ${seconds} s`;
}

async function loadDictionary() {
    try {
        const response = await fetch('words.dic');
        if (!response.ok) throw new Error("Chyba čtení");
        const text = await response.text();
        fullDictionary = text.split('\n').map(word => word.trim()).filter(w => w.length > 0);
    } catch (error) {
        console.warn("Načítám záložní slovník.");
        fullDictionary = ["KNIHA", "STROM", "JABLKO", "RODINA", "SLUNCE", "PES", "VODA", "HRAD", "MESTO"];
    }
}

function startNewGameSession() {
    appState = 'playing';
    gameStartTime = Date.now(); 
    document.getElementById("app-content").style.display = "block";
    document.getElementById("dashboard-content").style.display = "none";
    
    const validWords = fullDictionary.filter(w => w.length >= 4 && w.length <= GRID_SIZE);
    remainingWords = [...new Set(validWords.sort(() => 0.5 - Math.random()))].slice(0, WORDS_TO_FIND);
    
    // Uložení původního pořadí pro číslování seznamu
    initialWords = [...remainingWords]; 
    
    initGrid();
    placeWords();
    fillEmptyCells();
    renderUI();
}

function initGrid() {
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
    wordPlacements = {};
}

function placeWords() {
    for (const word of remainingWords) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 500) {
            attempts++;
            const dir = ACTIVE_DIRECTIONS[Math.floor(Math.random() * ACTIVE_DIRECTIONS.length)];
            const startR = Math.floor(Math.random() * GRID_SIZE);
            const startC = Math.floor(Math.random() * GRID_SIZE);

            if (canPlaceWord(word, startR, startC, dir)) {
                let path = [];
                for (let i = 0; i < word.length; i++) {
                    const r = startR + i * dir[0];
                    const c = startC + i * dir[1];
                    grid[r][c] = word[i];
                    path.push({ r, c });
                }
                wordPlacements[word] = path;
                placed = true;
            }
        }
        if (!placed) remainingWords = remainingWords.filter(w => w !== word);
    }
}

function canPlaceWord(word, r, c, dir) {
    for (let i = 0; i < word.length; i++) {
        const nr = r + i * dir[0];
        const nc = c + i * dir[1];
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
        if (grid[nr][nc] !== "" && grid[nr][nc] !== word[i]) return false;
    }
    return true;
}

function fillEmptyCells() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === "") grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        }
    }
}

// ==========================================
// 4. UI & RENDERING
// ==========================================
function renderUI() {
    const gridEl = document.getElementById("grid");
    gridEl.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
    gridEl.innerHTML = "";

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.id = `cell-${r}-${c}`;
            cell.textContent = grid[r][c];
            gridEl.appendChild(cell);
        }
    }

    const listEl = document.getElementById("word-list");
    listEl.innerHTML = "";
    
    // Procházíme initialWords, aby čísla vždy zůstala stejná
    initialWords.forEach((word, index) => {
        const li = document.createElement("li");
        li.id = `word-${word}`;
        li.textContent = `${index + 1}. ${word}`; // Přidá číslo, např. "1. KOČKA"
        
        // Záchranné tlačítko (kliknutí)
        li.onclick = () => {
            if (appState === 'playing' && remainingWords.includes(word)) {
                // Simulace nalezení slova
                markWordAsFound(word);
                remainingWords = remainingWords.filter(w => w !== word);
                checkGameEnd();
            }
        };
        
        listEl.appendChild(li);
    });
}

function renderDashboard(lastDurationMs) {
    const history = StorageManager.load();
    const totalGames = history.length;
    const currentLevel = Math.floor(totalGames / 3) + 1;
    
    document.getElementById("current-level").textContent = `Úroveň ${currentLevel}`;
    document.getElementById("total-games").textContent = `Celkem vyřešeno: ${totalGames}`;

    // NOVÉ: Výpočet průměrného času (ignoruje staré hry z předchozí verze bez času)
    const gamesWithTime = history.filter(g => g.duration);
    let avgTimeMs = 0;
    if (gamesWithTime.length > 0) {
        const totalTime = gamesWithTime.reduce((sum, g) => sum + g.duration, 0);
        avgTimeMs = totalTime / gamesWithTime.length;
    }

    document.getElementById("current-time-display").textContent = formatTime(lastDurationMs);
    document.getElementById("avg-time-display").textContent = formatTime(avgTimeMs);

    const activityMap = {};
    history.forEach(game => {
        activityMap[game.date] = (activityMap[game.date] || 0) + 1;
    });

    const heatmapEl = document.getElementById("heatmap");
    heatmapEl.innerHTML = "";

    const today = new Date();
    for (let i = 83; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA');
        
        const count = activityMap[dateStr] || 0;
        const cell = document.createElement("div");
        cell.className = "heatmap-cell";
        
        if (count === 1) cell.classList.add("color-1");
        else if (count === 2) cell.classList.add("color-2");
        else if (count === 3) cell.classList.add("color-3");
        else if (count >= 4) cell.classList.add("color-4");

        heatmapEl.appendChild(cell);
    }
}

// ==========================================
// 5. SPEECH RECOGNITION
// ==========================================
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Prohlížeč nepodporuje Web Speech API.");

    recognition = new SpeechRecognition();
    recognition.lang = 'cs-CZ';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        if (appState === 'playing') {
            document.getElementById("mic-status").textContent = "Mikrofon naslouchá...";
            document.getElementById("mic-status").className = "status listening";
        }
    };

    recognition.onresult = (event) => {
        const rawTranscript = event.results[0][0].transcript;
        
        document.getElementById("transcript-box").textContent = `Slyším: "${rawTranscript}"`;
        document.getElementById("dash-transcript-box").textContent = `Slyším: "${rawTranscript}"`;
        
        if (appState === 'playing') {
            const normalizedTranscript = normalizeCzechWord(rawTranscript); // Zachová diakritiku pro hledání
            checkTranscriptForGame(normalizedTranscript);
        } else if (appState === 'dashboard') {
            const commandTranscript = normalizeForCommand(rawTranscript); // Ořízne diakritiku pro povely
            if (commandTranscript.includes("NOVA HRA") || commandTranscript.includes("NOVOU HRU") || commandTranscript.includes("DALSI")) {
                startNewGameSession();
            }
        }
    };

    recognition.onend = () => {
        if (!isIntentionalStop) {
            setTimeout(() => { try { recognition.start(); } catch (e) {} }, 250);
        }
    };

    recognition.start();
}

function checkTranscriptForGame(transcript) {
    // Vytvoříme si i verzi transkriptu bez diakritiky pro detekci čísel
    const commandTranscript = normalizeForCommand(transcript);

    for (let i = remainingWords.length - 1; i >= 0; i--) {
        const word = remainingWords[i];
        const wordIndex = initialWords.indexOf(word) + 1; // Získá číslo slova (1-8)
        
        // 1. Kontrola, zda neřekla samotné slovo
        const isWordMatch = transcript.includes(word);
        
        // 2. Kontrola, zda neřekla číslo (jedničku, dvojku...)
        const synonyms = NUMBER_SYNONYMS[wordIndex] || [];
        const isNumberMatch = synonyms.some(syn => commandTranscript.includes(syn));

        if (isWordMatch || isNumberMatch) {
            markWordAsFound(word);
            remainingWords.splice(i, 1);
        }
    }
    checkGameEnd();
}

function checkGameEnd() {
    if (remainingWords.length === 0 && appState === 'playing') {
        document.getElementById("mic-status").textContent = "Výborně!";
        document.getElementById("mic-status").className = "status stopped";
        
        const durationMs = Date.now() - gameStartTime;
        appState = 'dashboard';
        StorageManager.saveWin(durationMs);
        
        setTimeout(() => {
            document.getElementById("app-content").style.display = "none";
            document.getElementById("dashboard-content").style.display = "block";
            renderDashboard(durationMs);
        }, 1500); 
    }
}

function markWordAsFound(word) {
    const li = document.getElementById(`word-${word}`);
    if (li) li.classList.add("found");
    const path = wordPlacements[word];
    if (path) path.forEach(coord => document.getElementById(`cell-${coord.r}-${coord.c}`).classList.add("highlighted"));
}

// ==========================================
// WAKE LOCK API (Zabránění vypnutí obrazovky)
// ==========================================
let wakeLock = null;

async function requestWakeLock() {
    try {
        // Kontrola, zda prohlížeč API podporuje
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Screen Wake Lock aktivován. Obrazovka nezhasne.');
            
            wakeLock.addEventListener('release', () => {
                console.log('Screen Wake Lock byl uvolněn.');
            });
        } else {
            console.warn('Screen Wake Lock API není v tomto prohlížeči podporováno.');
        }
    } catch (err) {
        console.error(`Chyba Wake Lock: ${err.name}, ${err.message}`);
    }
}

// OS automaticky zruší zámek, pokud se přepne tab nebo minimalizuje prohlížeč.
// Tímto zajistíme, že se zámek znovu nahodí, jakmile se babička vrátí na stránku.
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// ==========================================
// 6. BOOT SEQUENCE
// ==========================================
window.onload = async () => {
    await loadDictionary();
    startNewGameSession();
    initSpeechRecognition();
    
    // Zajištění, že obrazovka zůstane svítit
    await requestWakeLock();
};