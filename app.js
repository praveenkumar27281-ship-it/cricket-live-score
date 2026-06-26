/**
 * CricPulse AI OS v4.8 - State Engine & UI Telemetry Controller
 * Year 2035 Interactive HUD Cricket Scoreboard
 */

// --- INITIAL STATE ---
let match = {
    config: {
        teamA: "India",
        teamB: "Australia",
        captainA: "Rohit Sharma",
        captainB: "Pat Cummins",
        oversLimit: 5,
        tossWinner: "",
        tossDecision: "" // "Bat" or "Bowl"
    },
    currentInnings: 1, // 1 or 2
    innings: [], // Innings arrays
    undoHistory: [], // Stack for Undo
    redoHistory: []  // Stack for Redo
};

function getActiveInnings() {
    return match.innings[match.currentInnings - 1];
}

function createInningsState(battingTeam, bowlingTeam) {
    return {
        battingTeam: battingTeam,
        bowlingTeam: bowlingTeam,
        runs: 0,
        wickets: 0,
        balls: 0,
        extras: { wide: 0, noball: 0, bye: 0, legbye: 0, total: 0 },
        batsmen: [],
        bowlers: [],
        strikerIndex: -1,
        nonStrikerIndex: -1,
        currentBowlerIndex: -1,
        thisOverDeliveries: [],
        thisOverLegalBalls: 0,
        fallOfWickets: [],
        isCompleted: false
    };
}

// Deep clone state for history
function saveHistoryState() {
    const clone = JSON.parse(JSON.stringify({
        config: match.config,
        currentInnings: match.currentInnings,
        innings: match.innings
    }));
    match.undoHistory.push(clone);
    match.redoHistory = []; // Clear redo stack on new action
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initThemeSwapper();
    initSetupScreen();
    initMatchScoring();
    initGameOverScreen();
    initCanvasStadium();
    initVoiceWaveform();
    initMouseParallax();
    initSoundControls();
    bindPremiumButtonEffects();
});

// Update top nav time display
function initClock() {
    const timeBadge = document.getElementById('system-time');
    setInterval(() => {
        const d = new Date();
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        const secs = String(d.getSeconds()).padStart(2, '0');
        timeBadge.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);
}

// Theme swapper handler
function initThemeSwapper() {
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            Sound.playClick();
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const themeName = btn.getAttribute('data-theme');
            document.body.setAttribute('data-theme', themeName);
            
            // Log theme swap in AI commentator
            printAICommentary(`Theme identity recalibrated to ${themeName.toUpperCase()}.`, "sys");
        });
    });
}

// --- SETUP SCREEN MACHINE ---

function initSetupScreen() {
    const coinWrapper = document.getElementById('coin-wrapper');
    const coin = document.getElementById('toss-coin');
    const tossWinnerDisplay = document.getElementById('toss-winner-display');
    const tossWinnerCard = document.getElementById('toss-winner-card');
    const tossDecisionDisplay = document.getElementById('toss-decision-display');
    const tossDecisionCard = document.getElementById('toss-decision-card');
    const startMatchBtn = document.getElementById('btn-start-match');
    const oversInput = document.getElementById('overs-input');

    let tossFlipped = false;

    // Coin Toss Flip trigger
    coinWrapper.addEventListener('click', () => {
        if (tossFlipped) return;
        tossFlipped = true;

        Sound.playCoinFlip();
        coin.className = 'coin';

        const isHeads = Math.random() < 0.5;
        const resultClass = isHeads ? 'flip-heads' : 'flip-tails';

        setTimeout(() => {
            coin.classList.add(resultClass);
        }, 10);

        setTimeout(() => {
            Sound.playCoinLand();
            const teamA = document.getElementById('team-a-input').value.trim() || "India";
            const teamB = document.getElementById('team-b-input').value.trim() || "Australia";
            
            const winner = isHeads ? teamA : teamB;
            match.config.tossWinner = winner;

            tossWinnerDisplay.textContent = winner.substring(0, 8).toUpperCase();
            tossWinnerCard.classList.add('selected');
            
            showTossDecisionPrompt(winner);
            tossFlipped = false;
        }, 1200);
    });

    function showTossDecisionPrompt(winner) {
        const instructions = document.getElementById('toss-instructions');
        instructions.innerHTML = `
            <span style="color:var(--text-main); font-weight:700;">${winner.toUpperCase()} WON TOSS. CHOOSE ACTION:</span>
            <div style="display:flex; justify-content:center; gap:10px; margin-top:8px;">
                <button type="button" class="btn-preset" id="toss-dec-bat" style="padding:4px 16px;">BAT</button>
                <button type="button" class="btn-preset" id="toss-dec-bowl" style="padding:4px 16px;">BOWL</button>
            </div>
        `;

        document.getElementById('toss-dec-bat').addEventListener('click', (e) => {
            e.stopPropagation();
            selectDecision("Bat");
        });
        document.getElementById('toss-dec-bowl').addEventListener('click', (e) => {
            e.stopPropagation();
            selectDecision("Bowl");
        });
    }

    function selectDecision(decision) {
        Sound.playClick();
        match.config.tossDecision = decision;
        tossDecisionDisplay.textContent = decision.toUpperCase();
        tossDecisionCard.classList.add('selected');
        
        document.getElementById('toss-instructions').innerHTML = `
            TOSS MATRIX LOCKED. READY FOR CORE INTERFACE INITIALIZATION.
        `;
        
        validateSetupState();
    }

    function validateSetupState() {
        if (match.config.tossWinner && match.config.tossDecision) {
            startMatchBtn.removeAttribute('disabled');
        } else {
            startMatchBtn.setAttribute('disabled', 'true');
        }
    }

    startMatchBtn.addEventListener('click', () => {
        Sound.playClick();
        
        match.config.teamA = document.getElementById('team-a-input').value.trim() || "India";
        match.config.teamB = document.getElementById('team-b-input').value.trim() || "Australia";
        match.config.captainA = document.getElementById('captain-a-input').value.trim() || "Rohit Sharma";
        match.config.captainB = document.getElementById('captain-b-input').value.trim() || "Pat Cummins";
        match.config.oversLimit = parseInt(oversInput.value) || 5;

        let battingTeam = "";
        let bowlingTeam = "";

        if (match.config.tossWinner === match.config.teamA) {
            if (match.config.tossDecision === "Bat") {
                battingTeam = match.config.teamA;
                bowlingTeam = match.config.teamB;
            } else {
                battingTeam = match.config.teamB;
                bowlingTeam = match.config.teamA;
            }
        } else {
            if (match.config.tossDecision === "Bat") {
                battingTeam = match.config.teamB;
                bowlingTeam = match.config.teamA;
            } else {
                battingTeam = match.config.teamA;
                bowlingTeam = match.config.teamB;
            }
        }

        match.currentInnings = 1;
        match.innings = [
            createInningsState(battingTeam, bowlingTeam)
        ];

        showOpenersModal();
    });
}

function showOpenersModal() {
    const modal = document.getElementById('openers-modal');
    modal.classList.add('active');

    // Set opener defaults
    document.getElementById('opener-striker-input').value = "Batter 1";
    document.getElementById('opener-nonstriker-input').value = "Batter 2";
    document.getElementById('opener-bowler-input').value = "Bowler 1";

    const confirmBtn = document.getElementById('btn-confirm-openers');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        Sound.playClick();
        
        const strikerName = document.getElementById('opener-striker-input').value.trim() || "Batter 1";
        const nonstrikerName = document.getElementById('opener-nonstriker-input').value.trim() || "Batter 2";
        const bowlerName = document.getElementById('opener-bowler-input').value.trim() || "Bowler 1";

        if (strikerName === nonstrikerName) {
            alert("BATTER CONFLICT: Striker and Non-striker must have unique IDs.");
            return;
        }

        const inn = getActiveInnings();
        inn.batsmen.push({ name: strikerName, runs: 0, balls: 0, fours: 0, sixes: 0, status: "not out", outDesc: "" });
        inn.batsmen.push({ name: nonstrikerName, runs: 0, balls: 0, fours: 0, sixes: 0, status: "not out", outDesc: "" });
        inn.bowlers.push({ name: bowlerName, balls: 0, maidens: 0, runs: 0, wickets: 0, runsAtStartOfOver: 0 });

        inn.strikerIndex = 0;
        inn.nonStrikerIndex = 1;
        inn.currentBowlerIndex = 0;

        modal.classList.remove('active');
        document.getElementById('setup-screen').classList.remove('active');
        document.getElementById('match-screen').classList.add('active');

        // Play Match Start Music
        Sound.playMatchStartMusic();

        // Initial rendering & AI greeting
        updateHUDTeamNames();
        renderDashboard();
        renderTeamLogos();
        printAICommentary(`Session initialized. ${inn.battingTeam.toUpperCase()} batting, opening bowlers assigned.`, "ai");
    });
}

function updateHUDTeamNames() {
    const inn = getActiveInnings();
    document.getElementById('center-team-a').textContent = match.config.teamA.toUpperCase();
    document.getElementById('center-team-b').textContent = match.config.teamB.toUpperCase();
}

// --- SCORING ACTION HANDLERS ---

function initMatchScoring() {
    const scoreBtns = document.querySelectorAll('.hud-bottom-action-panel button[data-run]');
    scoreBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const runVal = parseInt(btn.getAttribute('data-run'));
            handleBallScored(runVal);
        });
    });

    const extraBtns = document.querySelectorAll('.hud-bottom-action-panel button[data-extra]');
    extraBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const extraType = btn.getAttribute('data-extra');
            if (extraType === 'Wd' || extraType === 'Nb') {
                handleExtraScored(extraType);
            } else if (extraType === 'By' || extraType === 'Lb') {
                showByesSelector(extraType);
            }
        });
    });

    document.getElementById('btn-wicket-trigger').addEventListener('click', () => {
        Sound.playClick();
        showWicketModal();
    });

    document.getElementById('btn-undo-trigger').addEventListener('click', () => {
        handleUndo();
    });

    document.getElementById('btn-redo-trigger').addEventListener('click', () => {
        handleRedo();
    });

    // Profile rename binds
    document.getElementById('striker-row').addEventListener('click', () => triggerPlayerRename('striker'));
    document.getElementById('nonstriker-row').addEventListener('click', () => triggerPlayerRename('non-striker'));
    document.getElementById('bowler-row').addEventListener('click', () => triggerPlayerRename('bowler'));
}

function handleBallScored(runs) {
    saveHistoryState();
    
    const inn = getActiveInnings();
    const striker = inn.batsmen[inn.strikerIndex];
    const bowler = inn.bowlers[inn.currentBowlerIndex];

    inn.runs += runs;
    striker.runs += runs;
    striker.balls++;
    bowler.runs += runs;
    bowler.balls++;
    inn.balls++;

    inn.thisOverDeliveries.push(runs === 4 ? "4" : (runs === 6 ? "6" : runs.toString()));
    inn.thisOverLegalBalls++;

    if (runs === 0) {
        Sound.playBatHit();
    } else if (runs === 1) {
        Sound.playBatHit();
        setTimeout(() => Sound.playSoftClap(), 80);
    } else if (runs === 2) {
        Sound.playBatHit();
        setTimeout(() => Sound.playApplause(), 80);
    } else if (runs === 3) {
        Sound.playBatHit();
        setTimeout(() => Sound.playExcitementSwell(), 80);
    } else if (runs === 4) {
        striker.fours++;
        triggerBoundaryEffects("FOUR");
    } else if (runs === 6) {
        striker.sixes++;
        triggerBoundaryEffects("SIX");
    }

    if (runs % 2 === 1) {
        rotateStrike(inn);
    }

    // AI comments logic
    let comment = `Single recorded by ${striker.name}.`;
    if (runs === 0) comment = `Dot ball recorded. Good line and length from ${bowler.name}.`;
    if (runs === 1) comment = `👏 Excellent Running Between The Wickets. Single taken by ${striker.name}.`;
    if (runs === 2) comment = `Excellent Running! ${striker.name} picks up two runs.`;
    if (runs === 3) comment = `Fantastic running! They push hard for three runs.`;
    if (runs === 4) comment = `🔥 WHAT A SHOT! 🏏 FOUR!! ${striker.name} crushes it through the off-side!`;
    if (runs === 6) comment = `💥 MASSIVE SIX!! ${striker.name} hammers it over the roof!`;
    printAICommentary(comment, "ai");

    postBallProcesses();
}

function rotateStrike(inn) {
    const temp = inn.strikerIndex;
    inn.strikerIndex = inn.nonStrikerIndex;
    inn.nonStrikerIndex = temp;
}

function handleExtraScored(extraType) {
    saveHistoryState();
    Sound.playClick();

    const inn = getActiveInnings();
    const bowler = inn.bowlers[inn.currentBowlerIndex];
    const striker = inn.batsmen[inn.strikerIndex];

    if (extraType === 'Wd') {
        inn.runs += 1;
        inn.extras.wide += 1;
        inn.extras.total += 1;
        bowler.runs += 1;
        inn.thisOverDeliveries.push("Wd");
        printAICommentary(`Wide delivery parsed. Extras incremented.`, "ai");
    } else if (extraType === 'Nb') {
        inn.runs += 1;
        inn.extras.noball += 1;
        inn.extras.total += 1;
        bowler.runs += 1;
        striker.balls++;
        inn.thisOverDeliveries.push("Nb");
        printAICommentary(`WARNING: No Ball detected. Free hit signal processed.`, "ai");
    }

    postBallProcesses();
}

function showByesSelector(byeType) {
    Sound.playClick();
    
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-overlay active';
    wrapper.id = 'byes-quick-selector';
    
    wrapper.innerHTML = `
        <div class="glass-panel modal-content hud-panel" style="max-width:300px;">
            <div class="laser-scanner-line"></div>
            <h2 class="modal-title">SELECT EXTRAS (${byeType.toUpperCase()})</h2>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-top:16px;">
                <button type="button" class="btn-preset" data-val="1">1</button>
                <button type="button" class="btn-preset" data-val="2">2</button>
                <button type="button" class="btn-preset" data-val="3">3</button>
                <button type="button" class="btn-preset" data-val="4">4</button>
            </div>
            <button type="button" class="btn-preset" id="byes-cancel" style="margin-top:12px; width:100%;">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(wrapper);

    wrapper.querySelectorAll('button[data-val]').forEach(btn => {
        btn.addEventListener('click', () => {
            const count = parseInt(btn.getAttribute('data-val'));
            wrapper.remove();
            applyByes(byeType, count);
        });
    });

    document.getElementById('byes-cancel').addEventListener('click', () => {
        Sound.playClick();
        wrapper.remove();
    });
}

function applyByes(byeType, count) {
    saveHistoryState();
    Sound.playBatHit();

    const inn = getActiveInnings();
    const striker = inn.batsmen[inn.strikerIndex];
    const bowler = inn.bowlers[inn.currentBowlerIndex];

    inn.runs += count;
    inn.balls++;
    bowler.balls++;
    striker.balls++;
    inn.thisOverLegalBalls++;

    if (byeType === 'By') {
        inn.extras.bye += count;
        inn.extras.total += count;
        inn.thisOverDeliveries.push(`${count}B`);
        printAICommentary(`${count} Byes registered. Ball passed batter.`, "ai");
    } else {
        inn.extras.legbye += count;
        inn.extras.total += count;
        inn.thisOverDeliveries.push(`${count}LB`);
        printAICommentary(`${count} Leg Byes registered. Contact on leg guard.`, "ai");
    }

    if (count % 2 === 1) {
        rotateStrike(inn);
    }

    postBallProcesses();
}

// --- WICKET MODAL SELECTION DECK ---

let selectedWicketType = "Bowled";

function showWicketModal() {
    const modal = document.getElementById('wicket-modal');
    const options = modal.querySelectorAll('.select-option-btn');
    const nextNameInput = document.getElementById('new-batsman-name');
    const runoutBlock = document.getElementById('runout-dismissal-block');
    const btnConfirm = document.getElementById('btn-confirm-wicket');

    modal.classList.add('active');

    const inn = getActiveInnings();
    const nextNum = inn.batsmen.length + 1;
    nextNameInput.value = `Batter ${nextNum}`;
    selectedWicketType = "Bowled";

    options.forEach(opt => {
        opt.classList.remove('selected');
        if (opt.getAttribute('data-type') === 'Bowled') opt.classList.add('selected');

        opt.onclick = (e) => {
            e.stopPropagation();
            Sound.playClick();
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedWicketType = opt.getAttribute('data-type');

            if (selectedWicketType === 'Run Out') {
                runoutBlock.style.display = 'block';
            } else {
                runoutBlock.style.display = 'none';
            }
        };
    });

    let runOutTarget = "striker";
    const roStriker = document.getElementById('btn-ro-striker');
    const roNonStriker = document.getElementById('btn-ro-nonstriker');

    roStriker.onclick = () => {
        Sound.playClick();
        roStriker.classList.add('active');
        roNonStriker.classList.remove('active');
        runOutTarget = "striker";
    };

    roNonStriker.onclick = () => {
        Sound.playClick();
        roNonStriker.classList.add('active');
        roStriker.classList.remove('active');
        runOutTarget = "non-striker";
    };

    const newConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newConfirm, btnConfirm);

    newConfirm.addEventListener('click', () => {
        const nextName = nextNameInput.value.trim() || `Batter ${nextNum}`;
        modal.classList.remove('active');
        runoutBlock.style.display = 'none';
        applyWicket(selectedWicketType, nextName, runOutTarget);
    });
}

function applyWicket(type, newBatterName, runOutTarget) {
    saveHistoryState();
    triggerWicketEffects(type);

    const inn = getActiveInnings();
    const striker = inn.batsmen[inn.strikerIndex];
    const nonstriker = inn.batsmen[inn.nonStrikerIndex];
    const bowler = inn.bowlers[inn.currentBowlerIndex];

    inn.wickets++;
    inn.balls++;
    inn.thisOverLegalBalls++;
    bowler.balls++;
    inn.thisOverDeliveries.push("W");

    let dismissedIndex = -1;
    let outDesc = "";

    if (type === 'Run Out') {
        dismissedIndex = (runOutTarget === 'striker') ? inn.strikerIndex : inn.nonStrikerIndex;
        outDesc = `run out`;
    } else {
        dismissedIndex = inn.strikerIndex;
        outDesc = `${type.toLowerCase()} b ${bowler.name}`;
        bowler.wickets++;
    }

    const dismissedBatter = inn.batsmen[dismissedIndex];
    dismissedBatter.status = "out";
    dismissedBatter.outDesc = outDesc;
    striker.balls++; // Striker faced wicket ball

    inn.fallOfWickets.push({
        wicketNum: inn.wickets,
        score: inn.runs,
        overs: formatOvers(inn.balls)
    });

    // Check if Innings / Match ends (all out)
    if (inn.wickets >= 10) {
        inn.isCompleted = true;
        postBallProcesses();
        printAICommentary(`ALL OUT. Innings dataset locked.`, "sys");
        return;
    }

    // Insert new batsman
    inn.batsmen.push({
        name: newBatterName,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        status: "not out",
        outDesc: ""
    });

    const newIndex = inn.batsmen.length - 1;
    if (dismissedIndex === inn.strikerIndex) {
        inn.strikerIndex = newIndex;
    } else {
        inn.nonStrikerIndex = newIndex;
    }

    printAICommentary(`WICKET DETECTED: ${dismissedBatter.name} dismissed. ${type.toUpperCase()}! New batter ${newBatterName} deploying to crease.`, "ai");

    postBallProcesses();
}

// --- OVER MANAGEMENT & INNINGS SHIFTS ---

function postBallProcesses() {
    const inn = getActiveInnings();

    if (match.currentInnings === 2) {
        const target = match.innings[0].runs + 1;
        if (inn.runs >= target) {
            inn.isCompleted = true;
            triggerMatchGameOver();
            return;
        }
    }

    const maxBalls = match.config.oversLimit * 6;
    if (inn.balls >= maxBalls || inn.wickets >= 10) {
        inn.isCompleted = true;
    }

    if (inn.isCompleted) {
        if (match.currentInnings === 1) {
            triggerInningsTransition();
        } else {
            triggerMatchGameOver();
        }
        return;
    }

    if (inn.thisOverLegalBalls >= 6) {
        handleOverCompleted();
    } else {
        renderDashboard();
    }
}

function handleOverCompleted() {
    const inn = getActiveInnings();
    const bowler = inn.bowlers[inn.currentBowlerIndex];

    rotateStrike(inn);

    // Maiden calculation
    const runsInOver = bowler.runs - bowler.runsAtStartOfOver;
    if (runsInOver === 0) {
        bowler.maidens++;
        printAICommentary(`MAIDEN OVER completed by ${bowler.name}. Subsystem efficiency maximum!`, "ai");
    }

    inn.thisOverLegalBalls = 0;
    inn.thisOverDeliveries = [];

    showBowlerSelectionModal();
}

function showBowlerSelectionModal() {
    const inn = getActiveInnings();
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-overlay active';
    wrapper.id = 'bowler-selection-overlay';

    let listHTML = "";
    inn.bowlers.forEach((b, idx) => {
        const isConsecutive = (idx === inn.currentBowlerIndex && inn.bowlers.length > 1);
        listHTML += `
            <button type="button" class="select-option-btn" data-idx="${idx}" ${isConsecutive ? 'disabled style="opacity:0.25; cursor:not-allowed;"' : ''}>
                ${b.name.toUpperCase()} (Overs: ${formatOvers(b.balls)}, Wkts: ${b.wickets})
            </button>
        `;
    });

    wrapper.innerHTML = `
        <div class="glass-panel modal-content hud-panel">
            <div class="laser-scanner-line"></div>
            <h2 class="modal-title">NEXT BOWLER <span>OVER ${Math.floor(inn.balls/6) + 1}</span></h2>
            <p class="input-label" style="font-size:0.7rem; margin-bottom:12px;">Assign active bowler index</p>
            
            <div class="select-options-list" style="max-height: 180px; overflow-y:auto; gap:8px;">
                ${listHTML}
            </div>

            <div class="input-group" style="margin-top:12px;">
                <label class="input-label">OR REGISTER NEW BOWLER ID</label>
                <input type="text" id="new-bowler-name-input" class="input-field" placeholder="Bowler ${inn.bowlers.length + 1}" autocomplete="off">
            </div>

            <button type="button" class="btn-primary-hud" id="btn-confirm-bowler" style="margin-top:16px; width:100%;">
                <span class="btn-hud-glow"></span>
                <span class="btn-hud-content">LOCK BOWLER INDEX</span>
            </button>
        </div>
    `;

    document.body.appendChild(wrapper);

    wrapper.querySelectorAll('.select-option-btn').forEach(btn => {
        if (btn.hasAttribute('disabled')) return;
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            wrapper.remove();
            setNextBowler(idx);
        });
    });

    document.getElementById('btn-confirm-bowler').addEventListener('click', () => {
        const inputName = document.getElementById('new-bowler-name-input').value.trim();
        wrapper.remove();
        
        if (inputName) {
            inn.bowlers.push({
                name: inputName,
                balls: 0,
                maidens: 0,
                runs: 0,
                wickets: 0,
                runsAtStartOfOver: 0
            });
            setNextBowler(inn.bowlers.length - 1);
        } else {
            const defaultName = `Bowler ${inn.bowlers.length + 1}`;
            inn.bowlers.push({
                name: defaultName,
                balls: 0,
                maidens: 0,
                runs: 0,
                wickets: 0,
                runsAtStartOfOver: 0
            });
            setNextBowler(inn.bowlers.length - 1);
        }
    });
}

function setNextBowler(index) {
    Sound.playClick();
    const inn = getActiveInnings();
    inn.currentBowlerIndex = index;
    
    const bowler = inn.bowlers[index];
    bowler.runsAtStartOfOver = bowler.runs;

    printAICommentary(`Bowler profile switched. ${bowler.name.toUpperCase()} taking run-up.`, "ai");
    renderDashboard();
}

// --- UNDO / REDO CONTROLLERS ---

function handleUndo() {
    if (match.undoHistory.length === 0) return;

    Sound.playClick();
    
    // Save current to redo stack
    const currentClone = JSON.parse(JSON.stringify({
        config: match.config,
        currentInnings: match.currentInnings,
        innings: match.innings
    }));
    match.redoHistory.push(currentClone);

    // Revert state
    const prev = match.undoHistory.pop();
    match.config = prev.config;
    match.currentInnings = prev.currentInnings;
    match.innings = prev.innings;

    printAICommentary(`SYS_UNDO: Last ball transaction rolled back.`, "sys");
    renderDashboard();
}

function handleRedo() {
    if (match.redoHistory.length === 0) return;

    Sound.playClick();

    // Save current to undo stack
    const currentClone = JSON.parse(JSON.stringify({
        config: match.config,
        currentInnings: match.currentInnings,
        innings: match.innings
    }));
    match.undoHistory.push(currentClone);

    // Apply redo state
    const next = match.redoHistory.pop();
    match.config = next.config;
    match.currentInnings = next.currentInnings;
    match.innings = next.innings;

    printAICommentary(`SYS_REDO: Re-applying reverted ball transaction.`, "sys");
    renderDashboard();
}

// --- TELEMETRY UI RENDERING ---

function renderDashboard() {
    const inn = getActiveInnings();
    if (!inn) return;

    // Refresh logos
    renderTeamLogos();

    // 1. Digital score & wickets
    document.getElementById('holo-team-batting').textContent = inn.battingTeam.toUpperCase();
    updateScoreboardTextWithAnim('holo-score', inn.runs);
    updateScoreboardTextWithAnim('holo-wickets', inn.wickets);

    // 2. Overs
    updateScoreboardTextWithAnim('holo-overs', formatOvers(inn.balls));
    document.getElementById('holo-max-overs').textContent = match.config.oversLimit;

    // 3. Telemetry values CRR
    const crrVal = calculateRunRate(inn.runs, inn.balls);
    document.getElementById('tele-crr').textContent = crrVal;
    
    // Adjust CRR circle progress bar gauge
    const crrCircle = document.getElementById('gauge-crr-progress');
    // Map crr up to 15 runs an over
    const crrPercent = Math.min(100, (parseFloat(crrVal) / 15) * 100);
    const crrOffset = 251.2 - (251.2 * crrPercent) / 100;
    crrCircle.style.strokeDashoffset = crrOffset;

    // 4. Target panels (Innings 2 specific)
    const targetAlert = document.getElementById('holo-target-alert');
    const rrrGaugeCard = document.getElementById('rrr-gauge-card');
    
    if (match.currentInnings === 2) {
        const target = match.innings[0].runs + 1;
        const runsNeeded = target - inn.runs;
        const maxBalls = match.config.oversLimit * 6;
        const ballsLeft = maxBalls - inn.balls;

        targetAlert.classList.add('active');
        document.getElementById('holo-target-val').textContent = target;
        document.getElementById('holo-runs-needed').textContent = runsNeeded;
        document.getElementById('holo-balls-remaining').textContent = Math.max(0, ballsLeft);

        rrrGaugeCard.style.opacity = '1';
        const rrrVal = calculateRunRate(Math.max(0, runsNeeded), Math.max(1, ballsLeft));
        document.getElementById('tele-rrr').textContent = rrrVal;

        const rrrCircle = document.getElementById('gauge-rrr-progress');
        const rrrPercent = Math.min(100, (parseFloat(rrrVal) / 15) * 100);
        const rrrOffset = 251.2 - (251.2 * rrrPercent) / 100;
        rrrCircle.style.strokeDashoffset = rrrOffset;
    } else {
        targetAlert.classList.remove('active');
        rrrGaugeCard.style.opacity = '0.3';
        document.getElementById('tele-rrr').textContent = "0.00";
        document.getElementById('gauge-rrr-progress').style.strokeDashoffset = 251.2;
    }

    // 5. Batter Telemetry cards
    const striker = inn.batsmen[inn.strikerIndex];
    const nonstriker = inn.batsmen[inn.nonStrikerIndex];

    if (striker) {
        document.getElementById('striker-name').textContent = striker.name.toUpperCase();
        document.getElementById('striker-score-tele').textContent = striker.runs;
        document.getElementById('striker-balls').textContent = striker.balls;
        document.getElementById('striker-fours').textContent = striker.fours;
        document.getElementById('striker-sixes').textContent = striker.sixes;
        document.getElementById('striker-sr').textContent = calculateStrikeRate(striker.runs, striker.balls);
        
        // Progress bar mapping based on runs (e.g. 50 runs is max width)
        const strikerBarWidth = Math.min(100, (striker.runs / 50) * 100);
        document.getElementById('striker-bar-fill').style.width = `${strikerBarWidth}%`;
    }
    if (nonstriker) {
        document.getElementById('nonstriker-name').textContent = nonstriker.name.toUpperCase();
        document.getElementById('nonstriker-score-tele').textContent = nonstriker.runs;
        document.getElementById('nonstriker-balls').textContent = nonstriker.balls;
        document.getElementById('nonstriker-fours').textContent = nonstriker.fours;
        document.getElementById('nonstriker-sixes').textContent = nonstriker.sixes;
        document.getElementById('nonstriker-sr').textContent = calculateStrikeRate(nonstriker.runs, nonstriker.balls);

        const nonstrikerBarWidth = Math.min(100, (nonstriker.runs / 50) * 100);
        document.getElementById('nonstriker-bar-fill').style.width = `${nonstrikerBarWidth}%`;
    }

    // 6. Partnership Calculation
    let partRuns = 0;
    let partBalls = 0;
    // Iterate from last wicket to active balls
    const lastWicketIndex = inn.fallOfWickets.length > 0 ? inn.fallOfWickets.length : 0;
    
    // Simplification: partnership is runs scored by the active two batters
    if (striker && nonstriker) {
        partRuns = striker.runs + nonstriker.runs;
        partBalls = striker.balls + nonstriker.balls;
    }
    
    document.getElementById('tele-partnership-runs').textContent = `${partRuns} runs`;
    document.getElementById('tele-partnership-balls').textContent = partBalls;
    
    // Bar width (e.g. 100 runs is full bar)
    const partPercent = Math.min(100, (partRuns / 100) * 100);
    document.getElementById('partnership-bar-fill').style.width = `${partPercent}%`;

    // Contribution division
    let sCont = 0;
    let nsCont = 0;
    if (partRuns > 0) {
        sCont = Math.round((striker.runs / partRuns) * 100);
        nsCont = Math.round((nonstriker.runs / partRuns) * 100);
    }
    document.getElementById('tele-partnership-contrib').textContent = `${sCont}% / ${nsCont}%`;

    // 7. Bowler HUD
    const bowler = inn.bowlers[inn.currentBowlerIndex];
    if (bowler) {
        document.getElementById('bowler-name').textContent = bowler.name.toUpperCase();
        document.getElementById('bowler-overs').textContent = formatOvers(bowler.balls);
        document.getElementById('bowler-maidens').textContent = bowler.maidens;
        document.getElementById('bowler-runs').textContent = bowler.runs;
        document.getElementById('bowler-wickets').textContent = bowler.wickets;
        document.getElementById('bowler-econ').textContent = calculateEconomy(bowler.runs, bowler.balls);
    }

    // 8. Timeline bubbles
    const timelineContainer = document.getElementById('timeline-balls-container');
    const overTitle = document.getElementById('timeline-over-counter');
    overTitle.textContent = `OVER ${Math.floor(inn.balls / 6) + 1}`;

    timelineContainer.innerHTML = '';
    if (inn.thisOverDeliveries.length === 0) {
        timelineContainer.innerHTML = `<span class="text-muted" style="font-size:0.7rem;">Awaiting next ball stream...</span>`;
    } else {
        inn.thisOverDeliveries.forEach(ball => {
            const bubble = document.createElement('span');
            bubble.className = `ball-bubble`;
            bubble.textContent = ball;

            if (ball === "0") bubble.classList.add('run-0');
            else if (ball === "4") bubble.classList.add('run-boundary-4');
            else if (ball === "6") bubble.classList.add('run-boundary-6');
            else if (ball.includes("Wd") || ball.includes("Nb")) bubble.classList.add('extra-ball');
            else if (ball === "W") bubble.classList.add('wicket-ball');
            
            timelineContainer.appendChild(bubble);
        });
    }

    // 9. Extras widgets
    document.getElementById('extra-wd-val').textContent = inn.extras.wide;
    document.getElementById('extra-nb-val').textContent = inn.extras.noball;
    document.getElementById('extra-by-val').textContent = inn.extras.bye;
    document.getElementById('extra-lb-val').textContent = inn.extras.legbye;
    document.getElementById('extra-total-val').textContent = inn.extras.total;

    // 10. Enable/disable Undo & Redo buttons
    document.getElementById('btn-undo-trigger').style.opacity = match.undoHistory.length > 0 ? "1" : "0.3";
    document.getElementById('btn-redo-trigger').style.opacity = match.redoHistory.length > 0 ? "1" : "0.3";
}

// --- PLAYER PROFILE RENAME DECK ---

function triggerPlayerRename(role) {
    Sound.playClick();
    
    const inn = getActiveInnings();
    const modal = document.getElementById('rename-modal');
    const input = document.getElementById('rename-player-name');
    const titleRole = document.getElementById('rename-title-role');

    titleRole.textContent = role.toUpperCase();
    
    let target = null;
    if (role === 'striker') target = inn.batsmen[inn.strikerIndex];
    if (role === 'non-striker') target = inn.batsmen[inn.nonStrikerIndex];
    if (role === 'bowler') target = inn.bowlers[inn.currentBowlerIndex];

    if (!target) return;

    modal.classList.add('active');
    input.value = target.name;
    input.focus();

    const saveBtn = document.getElementById('btn-save-rename');
    const cancelBtn = document.getElementById('btn-cancel-rename');

    const newSave = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSave, saveBtn);

    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newSave.addEventListener('click', () => {
        Sound.playClick();
        const newName = input.value.trim();
        if (newName) {
            target.name = newName;
            modal.classList.remove('active');
            printAICommentary(`PROFILE UPDATED: ID renamed to ${newName.toUpperCase()}.`, "sys");
            renderDashboard();
        }
    });

    newCancel.addEventListener('click', () => {
        Sound.playClick();
        modal.classList.remove('active');
    });
}

// --- INNINGS TRANSITIONS & GAME OVER ---

function triggerInningsTransition() {
    Sound.playCrowdCheer(false);
    
    const inn1 = match.innings[0];
    const target = inn1.runs + 1;
    const overs = formatOvers(inn1.balls);

    const modal = document.getElementById('innings-transition-modal');
    modal.classList.add('active');

    document.getElementById('trans-team-name').textContent = inn1.battingTeam.toUpperCase();
    document.getElementById('trans-score').textContent = `${inn1.runs}/${inn1.wickets}`;
    document.getElementById('trans-overs').textContent = overs;

    document.getElementById('trans-chase-msg').textContent = `
        ${inn1.bowlingTeam.toUpperCase()} TARGET CRITICAL: ${target} runs off ${match.config.oversLimit * 6} deliveries (Req RRR: ${calculateRunRate(target, match.config.oversLimit * 6)})
    `;

    document.getElementById('innings2-striker').value = "Batter 1";
    document.getElementById('innings2-nonstriker').value = "Batter 2";
    document.getElementById('innings2-bowler').value = "Bowler 1";

    const startBtn = document.getElementById('btn-start-innings2');
    const newStartBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newStartBtn, startBtn);

    newStartBtn.addEventListener('click', () => {
        Sound.playClick();
        
        const strName = document.getElementById('innings2-striker').value.trim() || "Batter 1";
        const nonstrName = document.getElementById('innings2-nonstriker').value.trim() || "Batter 2";
        const bowlName = document.getElementById('innings2-bowler').value.trim() || "Bowler 1";

        if (strName === nonstrName) {
            alert("BATTER CONFLICT: Striker and Non-striker must have unique IDs.");
            return;
        }

        match.currentInnings = 2;
        const inn2 = createInningsState(inn1.bowlingTeam, inn1.battingTeam);
        
        inn2.batsmen.push({ name: strName, runs: 0, balls: 0, fours: 0, sixes: 0, status: "not out", outDesc: "" });
        inn2.batsmen.push({ name: nonstrName, runs: 0, balls: 0, fours: 0, sixes: 0, status: "not out", outDesc: "" });
        inn2.bowlers.push({ name: bowlName, balls: 0, maidens: 0, runs: 0, wickets: 0, runsAtStartOfOver: 0 });

        inn2.strikerIndex = 0;
        inn2.nonStrikerIndex = 1;
        inn2.currentBowlerIndex = 0;

        match.innings.push(inn2);
        
        // Reset undos across innings to prevent cross-contamination
        match.undoHistory = [];
        match.redoHistory = [];

        modal.classList.remove('active');
        updateHUDTeamNames();
        renderDashboard();
        renderTeamLogos();
        printAICommentary(`Innings 2 telemetry initialized. Run chase active.`, "ai");
    });
}

function triggerMatchGameOver() {
    Sound.playMatchWinSiren();
    triggerBoundaryEffects("SIX"); // Golden fireworks

    setTimeout(() => {
        document.getElementById('match-screen').classList.remove('active');
        document.getElementById('game-over-screen').classList.add('active');

        const inn1 = match.innings[0];
        const inn2 = match.innings[1] || createInningsState(inn1.bowlingTeam, inn1.battingTeam);

        let winnerName = "";
        let winMargin = "";
        const target = inn1.runs + 1;

        if (inn2.runs >= target) {
            winnerName = `${inn2.battingTeam.toUpperCase()} WINS!`;
            const wicketsLeft = 10 - inn2.wickets;
            const ballsLeft = (match.config.oversLimit * 6) - inn2.balls;
            winMargin = `CHASE DECISIVE: Won by ${wicketsLeft} wickets (${ballsLeft} balls remaining)`;
        } else if (inn2.runs < target - 1) {
            winnerName = `${inn1.battingTeam.toUpperCase()} WINS!`;
            const marginRuns = inn1.runs - inn2.runs;
            winMargin = `DEFENCE ABSOLUTE: Won by ${marginRuns} runs`;
        } else {
            winnerName = "MATCH TIED!";
            winMargin = `Both teams matched score at ${inn1.runs} runs`;
        }

        document.getElementById('winner-team-name').textContent = winnerName;
        document.getElementById('winner-margin-msg').textContent = winMargin;

        renderScorecardTab(1);
    }, 1500);
}

function initGameOverScreen() {
    const tab1 = document.getElementById('tab-innings-1');
    const tab2 = document.getElementById('tab-innings-2');

    tab1.addEventListener('click', () => {
        Sound.playClick();
        tab1.classList.add('active');
        tab2.classList.remove('active');
        renderScorecardTab(1);
    });

    tab2.addEventListener('click', () => {
        Sound.playClick();
        tab2.classList.add('active');
        tab1.classList.remove('active');
        renderScorecardTab(2);
    });

    document.getElementById('btn-restart-game').addEventListener('click', () => {
        Sound.playClick();
        document.getElementById('game-over-screen').classList.remove('active');
        document.getElementById('setup-screen').classList.add('active');
        resetSetupForm();
    });
}

function resetSetupForm() {
    document.getElementById('toss-winner-display').textContent = "-";
    document.getElementById('toss-winner-card').classList.remove('selected');
    document.getElementById('toss-decision-display').textContent = "-";
    document.getElementById('toss-decision-card').classList.remove('selected');
    document.getElementById('btn-start-match').setAttribute('disabled', 'true');
    document.getElementById('toss-instructions').innerHTML = `
        Hover and Click coin to generate quantum toss outcome
    `;
    const coin = document.getElementById('toss-coin');
    coin.className = 'coin';

    match = {
        config: {
            teamA: "India",
            teamB: "Australia",
            captainA: "Rohit Sharma",
            captainB: "Pat Cummins",
            oversLimit: 5,
            tossWinner: "",
            tossDecision: ""
        },
        currentInnings: 1,
        innings: [],
        undoHistory: [],
        redoHistory: []
    };
}

function renderScorecardTab(inningsNum) {
    const inn = match.innings[inningsNum - 1];
    
    if (!inn) {
        document.getElementById('summary-innings-title').textContent = "Innings 2 Data Locked";
        document.getElementById('summary-batting-table').querySelector('tbody').innerHTML = `
            <tr><td colspan="6" style="text-align:center;" class="text-muted">No telemetry loaded</td></tr>
        `;
        document.getElementById('summary-bowling-table').querySelector('tbody').innerHTML = `
            <tr><td colspan="6" style="text-align:center;" class="text-muted">No telemetry loaded</td></tr>
        `;
        return;
    }

    document.getElementById('summary-innings-title').textContent = `${inn.battingTeam.toUpperCase()} BATTING`;

    let battingHTML = "";
    inn.batsmen.forEach(b => {
        const sr = calculateStrikeRate(b.runs, b.balls);
        const statusText = b.status === "not out" ? "not out" : b.outDesc;
        battingHTML += `
            <tr>
                <td>
                    <span class="text-bold">${b.name.toUpperCase()}</span><br>
                    <span class="batsman-status-text">${statusText.toUpperCase()}</span>
                </td>
                <td class="num text-bold">${b.runs}</td>
                <td class="num">${b.balls}</td>
                <td class="num">${b.fours}</td>
                <td class="num">${b.sixes}</td>
                <td class="num sr">${sr}</td>
            </tr>
        `;
    });
    document.getElementById('summary-batting-table').querySelector('tbody').innerHTML = battingHTML;

    let bowlingHTML = "";
    inn.bowlers.forEach(b => {
        const econ = calculateEconomy(b.runs, b.balls);
        bowlingHTML += `
            <tr>
                <td class="text-bold">${b.name.toUpperCase()}</td>
                <td class="num">${formatOvers(b.balls)}</td>
                <td class="num">${b.maidens}</td>
                <td class="num">${b.runs}</td>
                <td class="num text-bold">${b.wickets}</td>
                <td class="num">${econ}</td>
            </tr>
        `;
    });
    document.getElementById('summary-bowling-table').querySelector('tbody').innerHTML = bowlingHTML;

    const ex = inn.extras;
    document.getElementById('summary-extras').textContent = `
        ${ex.total} (w ${ex.wide}, nb ${ex.noball}, b ${ex.bye}, lb ${ex.legbye})
    `;
    document.getElementById('summary-total-score').textContent = `
        ${inn.runs}/${inn.wickets} (${formatOvers(inn.balls)} overs)
    `;
}

// --- UTILITY RUN CALCULATORS ---

function formatOvers(balls) {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function calculateStrikeRate(runs, balls) {
    if (balls === 0) return "0.0";
    return ((runs / balls) * 100).toFixed(1);
}

function calculateEconomy(runs, balls) {
    if (balls === 0) return "0.00";
    return ((runs * 6) / balls).toFixed(2);
}

function calculateRunRate(runs, balls) {
    if (balls === 0) return "0.00";
    return ((runs * 6) / balls).toFixed(2);
}

// --- SPECIAL EFFECTS (FOUR, SIX, WICKET GRAPHICS) ---

function triggerBoundaryEffects(type) {
    const effectsCanvas = document.getElementById('effects-canvas');
    if (effectsCanvas) {
        effectsCanvas.width = window.innerWidth;
        effectsCanvas.height = window.innerHeight;
    }

    if (type === "FOUR") {
        Sound.playBoundaryFanfare();
        document.body.classList.remove('flash-green');
        void document.body.offsetWidth;
        document.body.classList.add('flash-green');
        setTimeout(() => document.body.classList.remove('flash-green'), 600);

        // Scoreboard LED board & sky alert
        if (stadium) {
            stadium.event = "FOUR";
            stadium.eventTimer = 160; 
            stadium.crowdExcitement = 4.0;
            stadium.lightsColor = "rgba(0, 255, 196, 0.45)";
            stadium.camera.targetZoom = 1.15;
            
            // Trigger ball path animation
            stadium.ball.active = true;
            stadium.ball.x = 0; 
            stadium.ball.y = 30;
            stadium.ball.z = 0;
            let angle = -Math.PI / 2 + (Math.random() * 0.8 - 0.4);
            let speed = 4.5;
            stadium.ball.vx = Math.cos(angle) * speed;
            stadium.ball.vy = Math.sin(angle) * speed;
            stadium.ball.vz = 0;
            stadium.ball.trail = [];
        }

        // Show Broadcast Overlay Ribbon
        showBroadcastRibbon("🏏 FOUR!!", "four", "★ BOUNDARY STREAM LOCKED ★");
        
        // Commentator speech
        const quotes = [
            "FOUR!! What a cracking shot!",
            "Four runs, races away to the boundary fence!",
            "Shot! Pierces the field for a boundary!"
        ];
        Sound.speakCommentary(quotes[Math.floor(Math.random() * quotes.length)]);

    } else if (type === "SIX") {
        Sound.playSixBoom();
        document.body.classList.remove('flash-gold', 'shake');
        void document.body.offsetWidth;
        document.body.classList.add('flash-gold', 'shake');
        setTimeout(() => document.body.classList.remove('flash-gold', 'shake'), 600);

        // Scoreboard LED board & sky alert
        if (stadium) {
            stadium.event = "SIX";
            stadium.eventTimer = 180;
            stadium.crowdExcitement = 5.0;
            stadium.lightsColor = "rgba(255, 215, 0, 0.45)";
            stadium.camera.targetZoom = 1.3;
            
            // Trigger high flying ball path
            stadium.ball.active = true;
            stadium.ball.x = 0;
            stadium.ball.y = 30;
            stadium.ball.z = 0;
            let angle = -Math.PI / 2 + (Math.random() * 0.6 - 0.3);
            let speed = 3.5;
            stadium.ball.vx = Math.cos(angle) * speed;
            stadium.ball.vy = Math.sin(angle) * speed - 1.0; 
            stadium.ball.vz = 8.5; 
            stadium.ball.trail = [];
        }

        // Show Broadcast Overlay Ribbon
        showBroadcastRibbon("💥 MASSIVE SIX!!", "six", "★ MAXIMUM HIT LOCKED ★");
        
        // Commentator speech
        const quotes = [
            "MASSIVE SIX!! Over the fence and out of the park!",
            "THAT'S A HUGE SIX! Absolute maximum hit!",
            "Boom! Sent miles back into the stands!"
        ];
        Sound.speakCommentary(quotes[Math.floor(Math.random() * quotes.length)]);
    }
}

function triggerWicketEffects(dismissalType) {
    Sound.playWicketCrash();
    
    document.body.classList.remove('flash-red', 'shake');
    void document.body.offsetWidth;
    document.body.classList.add('flash-red', 'shake');
    setTimeout(() => document.body.classList.remove('flash-red', 'shake'), 650);

    // Glitch overlay effect
    const overlay = document.getElementById('glitch-overlay');
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 500);
    }

    if (stadium) {
        stadium.event = "WICKET";
        stadium.eventTimer = 150;
        stadium.crowdExcitement = 0.2; 
        stadium.lightsColor = "rgba(255, 51, 102, 0.45)";
        stadium.camera.shake = 18;
        stadium.camera.targetZoom = 1.25;

        // Reset stumps to fly out
        stadium.stumps.forEach(s => {
            s.x = 0; s.y = 0; s.angle = 0;
            s.vx = Math.random() * 6 - 3;
            s.vy = -Math.random() * 8 - 4;
            s.va = Math.random() * 0.4 - 0.2;
        });
        stadium.bails.forEach(b => {
            b.x = 0; b.y = 0; b.angle = 0;
            b.vx = Math.random() * 8 - 4;
            b.vy = -Math.random() * 12 - 6;
            b.va = Math.random() * 0.6 - 0.3;
        });

        // Spawn stumps smoke particles
        stadium.smoke = [];
        for (let i = 0; i < 15; i++) {
            stadium.smoke.push({
                x: 0,
                y: 30,
                vx: Math.random() * 3 - 1.5,
                vy: -Math.random() * 2,
                r: 5 + Math.random() * 15,
                alpha: 0.7
            });
        }
    }

    // Show Broadcast Overlay Ribbon
    showBroadcastRibbon("🚨 WICKET!! OUT", "wicket", `★ DISMISSAL TYPE: ${dismissalType ? dismissalType.toUpperCase() : "DISMISSED"} ★`);

    // Speech Commentary
    let q = "OUT! Stumps shattered, he's gone!";
    if (dismissalType === "Caught") {
        q = "Caught! Simple catch taken in the deep, wicket down!";
    } else if (dismissalType === "LBW") {
        q = "LBW! Plumb in front, the finger goes up!";
    } else if (dismissalType === "Run Out") {
        q = "Run out! Direct hit, he is miles short of his crease!";
    } else if (dismissalType === "Stumped") {
        q = "Stumped! Fast hands, out of the crease and gone!";
    } else if (dismissalType === "Bowled") {
        q = "Bowled him! Cleaned him up, absolute peach of a delivery!";
    }
    Sound.speakCommentary(q);
}

function showBroadcastRibbon(text, type, subtitle) {
    const container = document.getElementById("broadcast-ribbon-container");
    if (!container) return;
    
    const ribbon = document.createElement("div");
    ribbon.className = `broadcast-ribbon ${type}`;
    ribbon.innerHTML = `
        <div class="broadcast-ribbon-content">
            <span class="broadcast-ribbon-text">${text}</span>
            <span class="broadcast-ribbon-team">${subtitle || ""}</span>
        </div>
    `;
    
    container.appendChild(ribbon);
    
    // Trigger slide in
    setTimeout(() => ribbon.classList.add("active"), 10);
    
    // Slide out and remove
    setTimeout(() => {
        ribbon.classList.remove("active");
        setTimeout(() => ribbon.remove(), 500);
    }, 2300);
}

function showFullscreenSplashText(text, type) {
    // Dynamic absolute overlay elements
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100vw';
    div.style.height = '100vh';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.zIndex = '98';
    div.style.pointerEvents = 'none';

    const inner = document.createElement('div');
    inner.textContent = text;
    inner.style.fontSize = '5rem';
    inner.style.fontWeight = '950';
    inner.style.letterSpacing = '10px';
    inner.style.fontFamily = 'var(--font-sans)';
    
    // Holographic neon styling
    if (type === 'four') {
        inner.style.color = '#00ffc4';
        inner.style.textShadow = '0 0 30px #00ffc4, 0 0 60px #00ffc4';
    } else if (type === 'six') {
        inner.style.color = '#ffd700';
        inner.style.textShadow = '0 0 30px #ffd700, 0 0 60px #ffd700';
    } else {
        inner.style.color = '#ff3366';
        inner.style.textShadow = '0 0 30px #ff3366, 0 0 60px #ff3366';
    }

    inner.style.transform = 'scale(0.5)';
    inner.style.opacity = '0';
    inner.style.transition = 'all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';

    div.appendChild(inner);
    document.body.appendChild(div);

    // Trigger transition scale up
    setTimeout(() => {
        inner.style.transform = 'scale(1)';
        inner.style.opacity = '1';
    }, 10);

    // Fade out and cleanup
    setTimeout(() => {
        inner.style.transform = 'scale(1.3)';
        inner.style.opacity = '0';
        inner.style.transition = 'all 0.3s ease';
    }, 900);

    setTimeout(() => div.remove(), 1250);
}

function createExplodingParticles(x, y, color, count) {
    const canvas = document.getElementById('effects-canvas');
    const ctx = canvas.getContext('2d');
    const particles = [];

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 3 + Math.random() * 8;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            alpha: 1,
            size: 2 + Math.random() * 5
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;

        particles.forEach(p => {
            if (p.alpha > 0) {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.025;
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                active = true;
            }
        });

        if (active) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    animate();
}

// --- AI COMMENTARY PRINTING FEED ---

function printAICommentary(msg, sender) {
    const feed = document.getElementById('terminal-feed-messages');
    if (!feed) return;

    const p = document.createElement('p');
    p.className = sender === 'sys' ? 'sys-msg' : 'ai-comment';
    p.textContent = sender === 'sys' ? `> ${msg}` : `[AI_OS]: `;
    feed.appendChild(p);
    
    // Auto-scroll
    feed.parentElement.scrollTop = feed.parentElement.scrollHeight;

    if (sender === 'sys') return;

    // Typing speed & waveform triggers
    let idx = 0;
    isWaveformActive = true; // Trigger dynamic voice waves
    
    function type() {
        if (idx < msg.length) {
            p.textContent += msg.charAt(idx);
            idx++;
            Sound.playTyping();
            setTimeout(type, 15 + Math.random() * 25);
        } else {
            isWaveformActive = false; // Back to flat waves
        }
    }
    type();
}

// --- CANVAS 3D BACKGROUND STADIUM PHYSICS ---

let isWaveformActive = false;

let stadium = {
    time: 0,
    crowdExcitement: 1.0,
    lightsColor: "rgba(0, 242, 254, 0.05)",
    event: null, // "FOUR", "SIX", "WICKET" or null
    eventTimer: 0,
    ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, trail: [], active: false },
    stumps: [
        { id: 1, ox: -8, oy: 0, x: 0, y: 0, angle: 0, vx: 0, vy: 0, va: 0 },
        { id: 2, ox: 0, oy: 0, x: 0, y: 0, angle: 0, vx: 0, vy: 0, va: 0 },
        { id: 3, ox: 8, oy: 0, x: 0, y: 0, angle: 0, vx: 0, vy: 0, va: 0 }
    ],
    bails: [
        { id: 1, ox: -4, oy: -20, x: 0, y: 0, angle: 0, vx: 0, vy: 0, va: 0 },
        { id: 2, ox: 4, oy: -20, x: 0, y: 0, angle: 0, vx: 0, vy: 0, va: 0 }
    ],
    smoke: [],
    fireworks: [],
    camera: { x: 0, y: 0, zoom: 1.0, targetX: 0, targetY: 0, targetZoom: 1.0, shake: 0 },
    stars: [],
    adText: "★ CRICPULSE AI OS ★ DEEP SPACE LIVE BROADCASTING ★ IPL TELEMETRY COMMAND CENTER ★",
    adOffset: 0
};

function initCanvasStadium() {
    const canvas = document.getElementById('bg-stadium-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Handle screen resize
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Generate stars
    stadium.stars = [];
    for (let i = 0; i < 50; i++) {
        stadium.stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * (window.innerHeight * 0.5),
            r: 0.8 + Math.random() * 1.6,
            baseAlpha: 0.3 + Math.random() * 0.7,
            speed: 0.02 + Math.random() * 0.04
        });
    }

    // Flying Drones representation
    const drones = [
        { x: 120, y: 140, targetX: 280, targetY: 170, speed: 0.005, t: 0, state: 'left', color: '#00f2fe' },
        { x: window.innerWidth - 220, y: 160, targetX: window.innerWidth - 420, targetY: 130, speed: 0.004, t: 0.5, state: 'right', color: '#fd2678' }
    ];

    function render() {
        stadium.time++;

        // 1. Twilight Night Sky Gradient
        let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.65);
        skyGrad.addColorStop(0, "#030611");
        skyGrad.addColorStop(0.5, "#071122");
        skyGrad.addColorStop(1, "#0d1a38");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Twinkling Stars
        ctx.fillStyle = "#ffffff";
        stadium.stars.forEach(s => {
            let alpha = s.baseAlpha * (0.5 + 0.5 * Math.sin(stadium.time * s.speed));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 3. Draw crescent moon
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#ffebad";
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(canvas.width - 150, 100, 20, 0, Math.PI * 2);
        ctx.fill();
        // subtract shadow
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(canvas.width - 138, 92, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 4. Update camera
        if (stadium.eventTimer > 0) {
            stadium.eventTimer--;
            if (stadium.eventTimer === 0) {
                // Reset camera and event
                stadium.event = null;
                stadium.camera.targetZoom = 1.0;
                stadium.camera.targetX = 0;
                stadium.camera.targetY = 0;
                stadium.lightsColor = "rgba(0, 242, 254, 0.05)";
            }
        }

        stadium.camera.zoom += (stadium.camera.targetZoom - stadium.camera.zoom) * 0.08;
        stadium.camera.x += (stadium.camera.targetX - stadium.camera.x) * 0.08;
        stadium.camera.y += (stadium.camera.targetY - stadium.camera.y) * 0.08;

        // Apply camera zooms and shakes
        ctx.save();
        if (stadium.camera.shake > 0) {
            let dx = (Math.random() * 2 - 1) * stadium.camera.shake;
            let dy = (Math.random() * 2 - 1) * stadium.camera.shake;
            ctx.translate(dx, dy);
            stadium.camera.shake *= 0.88;
            if (stadium.camera.shake < 0.2) stadium.camera.shake = 0;
        }

        // Center on stadium play area
        const pitchX = canvas.width / 2;
        const pitchY = canvas.height * 0.72;

        ctx.translate(pitchX, pitchY);
        ctx.scale(stadium.camera.zoom, stadium.camera.zoom);
        ctx.translate(-pitchX, -pitchY);

        // 5. Draw steel lattice towers for floodlights (background)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.lineWidth = 2;
        const drawTower = (tx, ty, height) => {
            ctx.beginPath();
            ctx.moveTo(tx - 15, ty);
            ctx.lineTo(tx, ty - height);
            ctx.lineTo(tx + 15, ty);
            ctx.stroke();
            // cross lattices
            ctx.beginPath();
            ctx.moveTo(tx - 15, ty);
            ctx.lineTo(tx + 15, ty - height / 2);
            ctx.moveTo(tx + 15, ty);
            ctx.lineTo(tx - 15, ty - height / 2);
            ctx.stroke();
        };
        drawTower(200, pitchY - 60, 160);
        drawTower(canvas.width - 200, pitchY - 60, 160);

        // 6. Draw Stadium Seating Stands & Crowd Waving
        const standsY = pitchY - 80;
        const rx = canvas.width * 0.55;
        const ry = canvas.height * 0.35;

        // Draw 3 tiers of stands
        for (let t = 0; t < 3; t++) {
            let tierRx = rx + t * 45;
            let tierRy = ry + t * 25;
            ctx.strokeStyle = `rgba(14, 25, 48, ${0.9 - t * 0.15})`;
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.ellipse(pitchX, pitchY, tierRx, tierRy, 0, Math.PI * 1.05, Math.PI * 1.95);
            ctx.stroke();

            // Draw glowing spectators and waves
            if (stadium.crowdExcitement > 1.0) stadium.crowdExcitement -= 0.015;
            else if (stadium.crowdExcitement < 1.0) stadium.crowdExcitement += 0.005;

            ctx.save();
            for (let angle = Math.PI * 1.05; angle < Math.PI * 1.95; angle += 0.015) {
                // Wave is a sine wave function based on time and angle
                let wave = Math.sin(stadium.time * 0.12 + angle * 12) * 3 * stadium.crowdExcitement;
                let sx = pitchX + Math.cos(angle) * tierRx;
                let sy = pitchY + Math.sin(angle) * tierRy - wave;

                // Pick crowd colors
                let colorSeed = Math.abs(Math.sin(angle * 100));
                ctx.fillStyle = colorSeed < 0.33 ? "var(--primary-cyan)" : (colorSeed < 0.66 ? "var(--primary-magenta)" : "var(--accent-gold)");
                ctx.globalAlpha = 0.5 + 0.5 * Math.sin(stadium.time * 0.05 + angle);
                ctx.beginPath();
                ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 7. Draw Grass Outfield
        // Concentric ellipse lawns
        for (let r = 1.0; r > 0.05; r -= 0.08) {
            ctx.fillStyle = Math.round(r * 12) % 2 === 0 ? "#0d2613" : "#0a200e";
            ctx.beginPath();
            ctx.ellipse(pitchX, pitchY, rx * r, ry * r, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw radial turf lines for realistic ground pattern
        ctx.strokeStyle = "rgba(255,255,255,0.012)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 18; i++) {
            let rad = (i * Math.PI) / 9;
            ctx.beginPath();
            ctx.moveTo(pitchX, pitchY);
            ctx.lineTo(pitchX + Math.cos(rad) * rx, pitchY + Math.sin(rad) * ry);
            ctx.stroke();
        }

        // 8. Draw Boundary LED Advertising Board
        ctx.strokeStyle = "#040812";
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.ellipse(pitchX, pitchY, rx * 0.95, ry * 0.95, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 9. Draw Pitch
        ctx.fillStyle = "#cfab7e"; // brown clay pitch
        ctx.beginPath();
        ctx.moveTo(pitchX - 18, pitchY - 30);
        ctx.lineTo(pitchX + 18, pitchY - 30);
        ctx.lineTo(pitchX + 28, pitchY + 30);
        ctx.lineTo(pitchX - 28, pitchY + 30);
        ctx.closePath();
        ctx.fill();
        // Pitch crease lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pitchX - 24, pitchY + 18);
        ctx.lineTo(pitchX + 24, pitchY + 18);
        ctx.moveTo(pitchX - 16, pitchY - 18);
        ctx.lineTo(pitchX + 16, pitchY - 18);
        ctx.stroke();

        // 10. Draw Horizontal Electronic LED Scoreboard in background stands
        let ledW = 400;
        let ledH = 22;
        let ledX = pitchX - ledW / 2;
        let ledY = standsY - 70;
        ctx.fillStyle = "#01040a";
        ctx.fillRect(ledX, ledY, ledW, ledH);
        ctx.strokeStyle = "rgba(0, 242, 254, 0.2)";
        ctx.strokeRect(ledX, ledY, ledW, ledH);
        
        ctx.save();
        ctx.rect(ledX, ledY, ledW, ledH);
        ctx.clip();
        
        // Scrolling Text
        let activeColor = stadium.event === "WICKET" ? "#ff3366" : (stadium.event === "FOUR" ? "#00ffc4" : (stadium.event === "SIX" ? "#ffd700" : "var(--primary-cyan)"));
        ctx.fillStyle = activeColor;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 8;
        ctx.font = "900 11px var(--font-mono)";
        let scrollMsg = stadium.event ? `★★ ${stadium.event}! SHOT LOCK! ${stadium.event}! ★★` : stadium.adText;
        stadium.adOffset -= 1.2;
        if (stadium.adOffset < -700) stadium.adOffset = 0;
        ctx.fillText(scrollMsg, ledX + ledW + stadium.adOffset, ledY + 15);
        ctx.restore();

        // 11. Draw Volumetric Floodlights (foreground overlay)
        let swivel = Math.sin(stadium.time * 0.006) * 120;
        let beamX = pitchX + swivel;
        let beamY = pitchY + 40;

        const drawVolCone = (lx, ly) => {
            let cone = ctx.createRadialGradient(lx, ly, 10, beamX, beamY, Math.max(canvas.width, canvas.height));
            cone.addColorStop(0, stadium.lightsColor);
            cone.addColorStop(0.3, stadium.lightsColor);
            cone.addColorStop(1, "transparent");
            ctx.fillStyle = cone;
            ctx.beginPath();
            ctx.moveTo(lx - 25, ly);
            ctx.lineTo(beamX - 100, beamY);
            ctx.lineTo(beamX + 100, beamY);
            ctx.lineTo(lx + 25, ly);
            ctx.closePath();
            ctx.fill();

            // Draw bulbs glow
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(lx, ly, 12, 0, Math.PI * 2);
            ctx.fill();
        };
        drawVolCone(200, pitchY - 220);
        drawVolCone(canvas.width - 200, pitchY - 220);

        // 12. Draw Stumps, Bails, Smoke, and Ball Animations
        const stumpsBaseX = pitchX;
        const stumpsBaseY = pitchY + 20;

        if (stadium.event === "WICKET") {
            // Draw flying stumps
            stadium.stumps.forEach(s => {
                s.x += s.vx;
                s.y += s.vy;
                s.angle += s.va;
                s.vy += 0.35; // gravity

                ctx.save();
                ctx.translate(stumpsBaseX + s.ox + s.x, stumpsBaseY + s.oy + s.y);
                ctx.rotate(s.angle);
                ctx.fillStyle = "#b45309"; // wood color
                ctx.fillRect(-2, -22, 4, 22);
                ctx.restore();
            });

            // Draw flying bails
            stadium.bails.forEach(b => {
                b.x += b.vx;
                b.y += b.vy;
                b.angle += b.va;
                b.vy += 0.35;

                ctx.save();
                ctx.translate(stumpsBaseX + b.ox + b.x, stumpsBaseY + b.oy + b.y);
                ctx.rotate(b.angle);
                ctx.fillStyle = "#d97706";
                ctx.fillRect(-4, -2, 8, 3);
                ctx.restore();
            });

            // Update smoke particles
            ctx.save();
            stadium.smoke.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.012;
                ctx.fillStyle = `rgba(180, 180, 180, ${p.alpha})`;
                ctx.beginPath();
                ctx.arc(stumpsBaseX + p.x, stumpsBaseY - 10 + p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            });
            stadium.smoke = stadium.smoke.filter(p => p.alpha > 0);
            ctx.restore();

        } else {
            // Static stumps
            ctx.fillStyle = "#d97706"; // stumps
            // Off stump
            ctx.fillRect(stumpsBaseX - 6, stumpsBaseY - 22, 2.5, 22);
            // Middle stump
            ctx.fillRect(stumpsBaseX - 1.25, stumpsBaseY - 22, 2.5, 22);
            // Leg stump
            ctx.fillRect(stumpsBaseX + 3.5, stumpsBaseY - 22, 2.5, 22);
            
            // Bails
            ctx.fillStyle = "#b45309";
            ctx.fillRect(stumpsBaseX - 7.5, stumpsBaseY - 24, 6.5, 2);
            ctx.fillRect(stumpsBaseX + 1, stumpsBaseY - 24, 6.5, 2);
        }

        // Draw animated flying ball
        if (stadium.ball.active) {
            stadium.ball.x += stadium.ball.vx;
            stadium.ball.y += stadium.ball.vy;
            stadium.ball.z += stadium.ball.vz;

            // Apply gravity
            stadium.ball.vz -= 0.15;

            // Record trail
            stadium.ball.trail.push({ x: stadium.ball.x, y: stadium.ball.y - stadium.ball.z });
            if (stadium.ball.trail.length > 12) stadium.ball.trail.shift();

            // Draw trail
            ctx.save();
            stadium.ball.trail.forEach((t, i) => {
                ctx.globalAlpha = i / stadium.ball.trail.length;
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.beginPath();
                ctx.arc(stumpsBaseX + t.x, stumpsBaseY - 10 + t.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            // Ball shadow
            ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
            ctx.beginPath();
            ctx.arc(stumpsBaseX + stadium.ball.x, stumpsBaseY - 10 + stadium.ball.y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Ball itself
            let ballSize = Math.max(1.8, 3.2 + stadium.ball.z * 0.3); // size scales with z height
            ctx.fillStyle = "#ef4444"; // cricket red
            ctx.shadowColor = "#ef4444";
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(stumpsBaseX + stadium.ball.x, stumpsBaseY - 10 + stadium.ball.y - stadium.ball.z, ballSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset

            // Boundary collision check
            let dist = Math.sqrt(stadium.ball.x * stadium.ball.x + (stadium.ball.y * 2) * (stadium.ball.y * 2));
            if (stadium.ball.vz < 0 && stadium.ball.z <= 0) {
                // Bounce on grass
                stadium.ball.z = 0;
                stadium.ball.vz = -stadium.ball.vz * 0.4; // lose energy
            }

            if (stadium.event === "FOUR" && dist >= rx * 0.95) {
                // Hits LED boards
                stadium.ball.active = false;
                createExplodingParticles(stumpsBaseX + stadium.ball.x, stumpsBaseY - 10 + stadium.ball.y, "#00ffc4", 35);
            } else if (stadium.event === "SIX" && stadium.ball.y <= -ry && stadium.ball.z <= 0) {
                // Lands in stands
                stadium.ball.active = false;
                // Trigger fireworks at landing spot
                stadium.fireworks.push({
                    x: stumpsBaseX + stadium.ball.x,
                    y: stumpsBaseY - 10 + stadium.ball.y,
                    timer: 45,
                    particles: []
                });
                Sound.playFireworks();
            }
        }

        // Render fireworks
        stadium.fireworks.forEach(f => {
            if (f.particles.length === 0) {
                // Initialize firework particles
                for (let i = 0; i < 40; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = 2 + Math.random() * 5;
                    f.particles.push({
                        x: f.x,
                        y: f.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        alpha: 1.0,
                        color: `hsl(${Math.random() * 360}, 100%, 65%)`
                    });
                }
            }

            f.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.08; // gravity
                p.alpha -= 0.022;

                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            f.particles = f.particles.filter(p => p.alpha > 0);
            f.timer--;
        });
        stadium.fireworks = stadium.fireworks.filter(f => f.timer > 0);

        // 13. Draw floating sci-fi drones
        drones.forEach(d => {
            d.t += d.speed;
            if (d.t >= 1) {
                d.t = 0;
                // Swap coords
                const oldX = d.x;
                const oldY = d.y;
                d.x = d.targetX;
                d.y = d.targetY;
                d.targetX = d.state === 'left' ? 100 + Math.random() * 150 : canvas.width - 250 - Math.random() * 150;
                d.targetY = 80 + Math.random() * 120;
            }

            // Lerp coordinates
            const currX = d.x + (d.targetX - d.x) * d.t;
            const currY = d.y + (d.targetY - d.y) * d.t;

            ctx.save();
            ctx.fillStyle = "rgba(10, 15, 30, 0.55)";
            ctx.strokeStyle = d.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(currX - 10, currY - 5, 20, 10);
            ctx.fill();
            ctx.stroke();

            // Blinking lights
            ctx.fillStyle = Math.sin(stadium.time * 0.12) > 0 ? d.color : "#ef4444";
            ctx.beginPath();
            ctx.arc(currX - 7, currY - 5, 1.8, 0, Math.PI * 2);
            ctx.arc(currX + 7, currY - 5, 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 14. Floating atmosphere dust particles
        ctx.fillStyle = "rgba(0, 242, 254, 0.12)";
        stadium.stars.forEach(p => {
            // Move drifting particles slightly
            p.x += Math.sin(stadium.time * 0.01 + p.y) * 0.08;
            p.y += 0.15;
            if (p.y > canvas.height) {
                p.y = 0;
                p.x = Math.random() * canvas.width;
            }
        });

        ctx.restore(); // Restore camera transformation

        requestAnimationFrame(render);
    }
    render();
}

// --- VOICE WAVEFORM CONTROLLER ---
function initVoiceWaveform() {
    const canvas = document.getElementById('waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.clientWidth;

    let offset = 0;

    function renderWave() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = isWaveformActive ? "var(--primary-cyan)" : "var(--text-muted)";
        ctx.lineWidth = 2;
        ctx.beginPath();

        offset += 0.15;
        const amp = isWaveformActive ? 12 : 2.5; // taller waves when speaking
        const freq = isWaveformActive ? 0.08 : 0.02;

        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + Math.sin(x * freq + offset) * amp * Math.sin(x * 0.005);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        requestAnimationFrame(renderWave);
    }
    renderWave();
}

// --- PERSPECTIVE MOUSE PARALLAX TILT ---
function initMouseParallax() {
    window.addEventListener('mousemove', (e) => {
        // Calculate offsets relative to viewport center
        const xOffset = (window.innerWidth / 2 - e.clientX) / 45;
        const yOffset = (window.innerHeight / 2 - e.clientY) / 45;

        // Apply 3D matrix shifts to holographic card
        const card = document.getElementById('hologram-card');
        if (card) {
            card.style.transform = `perspective(1000px) rotateX(${5 + yOffset}deg) rotateY(${-1 - xOffset}deg) translateZ(10px)`;
        }

        // Apply subtle parallax slide on HUD grid overlay background
        const grid = document.querySelector('.hud-grid-overlay');
        if (grid) {
            grid.style.transform = `translate(${xOffset * 0.35}px, ${yOffset * 0.35}px)`;
        }
    });
}

// --- MASTER VOLUME DECK AND PREMIUM BUTTON ANIMATIONS ---
function initSoundControls() {
    const soundToggle = document.getElementById("btn-sound-toggle");
    const soundIcon = document.getElementById("sound-icon");
    const volumeSlider = document.getElementById("sound-volume-slider");
    
    if (soundToggle) {
        soundToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            Sound.resume();
            const isMuted = Sound.toggleMute();
            soundIcon.textContent = isMuted ? "🔇" : "🔊";
            printAICommentary(`Master Audio channels ${isMuted ? 'muted' : 'unmuted'}.`, "sys");
        });
    }
    if (volumeSlider) {
        volumeSlider.addEventListener("input", (e) => {
            Sound.resume();
            const vol = parseFloat(e.target.value);
            Sound.setVolume(vol);
        });
    }
}

function bindPremiumButtonEffects() {
    const buttons = document.querySelectorAll(".btn-score-circle, .btn-primary-hud, .btn-preset, .select-option-btn, .theme-btn");
    buttons.forEach(btn => {
        // Magnetic Hover pull
        btn.addEventListener("mousemove", (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.classList.add("magnetic-active");
            btn.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px) scale(1.08)`;
        });
        
        btn.addEventListener("mouseleave", () => {
            btn.classList.remove("magnetic-active");
            btn.style.transform = "";
        });
        
        // Ripple & Click Particle Burst
        btn.addEventListener("click", (e) => {
            // Click vibration
            btn.classList.remove("vibrate-click");
            void btn.offsetWidth; // trigger reflow
            btn.classList.add("vibrate-click");
            setTimeout(() => btn.classList.remove("vibrate-click"), 150);

            // Ripple Circle overlay
            const circle = document.createElement("span");
            const diameter = Math.max(btn.clientWidth, btn.clientHeight);
            const radius = diameter / 2;
            const rect = btn.getBoundingClientRect();
            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - rect.left - radius}px`;
            circle.style.top = `${e.clientY - rect.top - radius}px`;
            circle.classList.add("ripple");
            
            const prev = btn.querySelector(".ripple");
            if (prev) prev.remove();
            btn.appendChild(circle);

            // Particle color
            let color = "var(--primary-cyan)";
            if (btn.classList.contains("btn-hud-gold") || btn.getAttribute("data-run") === "6") color = "var(--accent-gold)";
            else if (btn.classList.contains("btn-hud-red") || btn.id === "btn-wicket-trigger") color = "var(--accent-crimson)";
            else if (btn.classList.contains("btn-hud-cyan") || btn.getAttribute("data-run") === "4") color = "var(--accent-emerald)";
            
            // Spawn explosions
            spawnButtonParticles(e, color);
        });
    });
}

function spawnButtonParticles(e, color) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2;
    const clickY = rect.top + rect.height / 2;
    createExplodingParticles(clickX, clickY, color || "#00f2fe", 15);
}

// --- DYNAMIC LOGO GENERATOR AND SCORE POP ---
function renderTeamLogos() {
    const inn = getActiveInnings();
    if (!inn) return;
    
    const logoA = document.getElementById('logo-team-a');
    const logoB = document.getElementById('logo-team-b');
    const logoBatting = document.getElementById('logo-team-batting');
    
    if (logoA) logoA.innerHTML = getTeamLogoSVG(match.config.teamA);
    if (logoB) logoB.innerHTML = getTeamLogoSVG(match.config.teamB);
    if (logoBatting) logoBatting.innerHTML = getTeamLogoSVG(inn.battingTeam);
}

function getTeamLogoSVG(teamName) {
    const code = (teamName || "AAA").substring(0, 3).toUpperCase();
    
    let primaryColor = "var(--primary-cyan)";
    let accentColor = "var(--primary-magenta)";
    let symbol = "★"; 
    
    if (code === "IND" || teamName.toLowerCase().includes("india")) {
        primaryColor = "#ff9933";
        accentColor = "#00ff95";
        symbol = "⚡";
    } else if (code === "AUS" || teamName.toLowerCase().includes("austral")) {
        primaryColor = "#FFD700";
        accentColor = "#00ff95";
        symbol = "👑";
    } else if (code === "ENG" || teamName.toLowerCase().includes("england")) {
        primaryColor = "#00E5FF";
        accentColor = "#ff3b5c";
        symbol = "🦁";
    } else if (code === "PAK" || teamName.toLowerCase().includes("pakist")) {
        primaryColor = "#00FF95";
        accentColor = "#ffffff";
        symbol = "🌙";
    } else if (code === "NZ" || code === "NZL" || teamName.toLowerCase().includes("zealand")) {
        primaryColor = "#ffffff";
        accentColor = "#FFD700";
        symbol = "🌿";
    } else if (code === "SA" || code === "RSA" || teamName.toLowerCase().includes("africa")) {
        primaryColor = "#00FF95";
        accentColor = "#ffd700";
        symbol = "🛡️";
    }
    
    return `
        <svg viewBox="0 0 40 40" style="width: 100%; height: 100%;">
            <defs>
                <filter id="neon-glow-${code}" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <path d="M 20 4 L 32 10 L 30 26 L 20 36 L 10 26 L 8 10 Z" fill="rgba(7, 17, 31, 0.75)" stroke="${primaryColor}" stroke-width="1.8" filter="url(#neon-glow-${code})" />
            <text x="20" y="19" font-size="12" font-family="var(--font-sans)" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${symbol}</text>
            <text x="20" y="30" font-size="7" font-family="var(--font-mono)" font-weight="800" fill="${accentColor}" text-anchor="middle" dominant-baseline="middle">${code}</text>
        </svg>
    `;
}

function updateScoreboardTextWithAnim(elementId, newText) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (el.textContent !== String(newText)) {
        el.textContent = newText;
        el.classList.remove("score-pop");
        void el.offsetWidth; // trigger reflow
        el.classList.add("score-pop");
        setTimeout(() => el.classList.remove("score-pop"), 300);
    }
}
