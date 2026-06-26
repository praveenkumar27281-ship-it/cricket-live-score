/**
 * SoundEngine - Cybernetic Dynamic Audio Synthesizer (Year 2035 AI OS Theme)
 * Dynamically synthesizes futuristic HUD sound effects using browser's Web Audio API.
 * Integrates Web Speech API for TV broadcast commentator announcements.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.5;
        this.muted = false;
        this.masterGain = null;
        
        // Crowd ambience source and filter nodes for continuous loop control
        this.ambienceSource = null;
        this.ambienceGain = null;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Create Master Gain node for volume/mute control
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.muted ? 0.0 : this.volume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // Start continuous stadium crowd ambience loop
            this.createCrowdAmbience();
        } catch (e) {
            console.warn("Web Audio API is not supported in this browser.", e);
            this.enabled = false;
        }
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, parseFloat(val)));
        if (!this.enabled) return;
        this.resume();
        if (this.masterGain && !this.muted) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
        // Adjust background ambience volume accordingly
        if (this.ambienceGain) {
            this.ambienceGain.gain.setValueAtTime(this.volume * 0.08, this.ctx.currentTime);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (!this.enabled) return this.muted;
        this.resume();
        if (this.masterGain) {
            const targetVol = this.muted ? 0.0 : this.volume;
            this.masterGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
        }
        return this.muted;
    }

    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 2.5; // 2.5 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // Creates a continuous running stadium crowd ambience hum (noise + LFO modulation)
    createCrowdAmbience() {
        if (!this.ctx || !this.enabled) return;
        try {
            // Generate a 4-second noise buffer for looping
            const bufferSize = this.ctx.sampleRate * 4;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);

            // Generate pink noise-like filter inside data
            let b0, b1, b2, b3, b4, b5, b6;
            b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                data[i] *= 0.07; // scale
                b6 = white * 0.115926;
            }

            this.ambienceSource = this.ctx.createBufferSource();
            this.ambienceSource.buffer = buffer;
            this.ambienceSource.loop = true;

            // Stadium high-cut lowpass filter to create distant drone
            const lowpass = this.ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(320, this.ctx.currentTime);

            // LFO gain sweep to simulate organic waves of spectator talk
            const lfo = this.ctx.createOscillator();
            const lfoGainNode = this.ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 0.15; // 0.15 Hz sweep speed (very slow)
            lfoGainNode.gain.value = 0.015; // modulation depth

            this.ambienceGain = this.ctx.createGain();
            this.ambienceGain.gain.setValueAtTime(this.muted ? 0.0 : this.volume * 0.08, this.ctx.currentTime);

            // Hook up LFO to modulate volume
            lfo.connect(lfoGainNode);
            lfoGainNode.connect(this.ambienceGain.gain);

            this.ambienceSource.connect(lowpass);
            lowpass.connect(this.ambienceGain);
            this.ambienceGain.connect(this.masterGain);

            lfo.start();
            this.ambienceSource.start(0);
        } catch (e) {
            console.error("Failed to start crowd ambience: ", e);
        }
    }

    // Text to Speech live TV commentator system
    speakCommentary(text) {
        if (!this.enabled || this.muted) return;
        if ('speechSynthesis' in window) {
            try {
                // Cancel ongoing commentator dialogues to keep pace with interactive inputs
                window.speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.volume = this.volume;
                utterance.rate = 1.15; // quick excited sports tempo
                utterance.pitch = 0.95; // slightly deeper broadcast register
                
                // Select a suitable English speaking voice
                const voices = window.speechSynthesis.getVoices();
                const englishVoice = voices.find(v => v.lang.startsWith('en') && 
                    (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('Microsoft')));
                if (englishVoice) {
                    utterance.voice = englishVoice;
                }
                
                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.warn("Speech Synthesis issue: ", err);
            }
        }
    }

    // Soft click for setup screen inputs
    playHover() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.02);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1500, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.02);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.02);
    }

    // Holographic pop select click
    playClick() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, this.ctx.currentTime); 
        osc1.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.06); 

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.08);
        osc2.stop(this.ctx.currentTime + 0.08);
    }

    // Metallic ring of a spinning coin
    playCoinFlip() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = 1.2;

        const osc = this.ctx.createOscillator();
        const fmOsc = this.ctx.createOscillator();
        const fmGain = this.ctx.createGain();
        const mainGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); 

        fmOsc.type = 'sine';
        fmOsc.frequency.setValueAtTime(15, now); 
        fmGain.gain.setValueAtTime(120, now); 

        fmOsc.connect(fmGain);
        fmGain.connect(osc.frequency);

        osc.connect(mainGain);
        mainGain.connect(this.masterGain || this.ctx.destination);

        fmOsc.frequency.exponentialRampToValueAtTime(25, now + duration);

        mainGain.gain.setValueAtTime(0.0, now);
        mainGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
        mainGain.gain.exponentialRampToValueAtTime(0.02, now + duration);

        fmOsc.start(now);
        osc.start(now);

        fmOsc.stop(now + duration);
        osc.stop(now + duration);
    }

    // Coin landing ding
    playCoinLand() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1580, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);
    }

    // Laser bat hit woody snap
    playBatHit() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1400, now);
        noiseFilter.Q.setValueAtTime(3.5, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        const baseRes = this.ctx.createOscillator();
        baseRes.type = 'sine';
        baseRes.frequency.setValueAtTime(280, now);
        baseRes.frequency.exponentialRampToValueAtTime(90, now + 0.06);

        const baseGain = this.ctx.createGain();
        baseGain.gain.setValueAtTime(0.4, now);
        baseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain || this.ctx.destination);

        baseRes.connect(baseGain);
        baseGain.connect(this.masterGain || this.ctx.destination);

        noise.start(now);
        baseRes.start(now);

        noise.stop(now + 0.1);
        baseRes.stop(now + 0.1);
    }

    // Synthesize realistic soft hand clapping for single runs
    playSoftClap() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Spawn 4 quick successive clap hits to sound like a couple people
        for (let i = 0; i < 4; i++) {
            const hitTime = now + i * 0.08 + Math.random() * 0.02;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer();
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, hitTime);
            filter.Q.setValueAtTime(2.0, hitTime);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.0, hitTime);
            gain.gain.linearRampToValueAtTime(0.12, hitTime + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.0001, hitTime + 0.04);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);
            
            noise.start(hitTime);
            noise.stop(hitTime + 0.05);
        }
    }

    // Synthesize dense crowd applause for doubles
    playApplause() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Play 12 random claps overlayed across 1 second
        for (let i = 0; i < 15; i++) {
            const hitTime = now + Math.random() * 0.8;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer();
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800 + Math.random() * 500, hitTime);
            filter.Q.setValueAtTime(1.5, hitTime);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.0, hitTime);
            gain.gain.linearRampToValueAtTime(0.15, hitTime + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.0001, hitTime + 0.06);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);
            
            noise.start(hitTime);
            noise.stop(hitTime + 0.08);
        }
        this.playCrowdCheer(false);
    }

    // Crowd excitement swell for 3 runs
    playExcitementSwell() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, now);
        filter.Q.setValueAtTime(0.8, now);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        
        filter.frequency.exponentialRampToValueAtTime(850, now + 0.5);
        filter.frequency.exponentialRampToValueAtTime(500, now + 1.8);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + 1.9);
        this.playApplause();
    }

    // Heavy bass boom for 6 runs
    playSubBassSix() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();

        sub.type = 'sine';
        sub.frequency.setValueAtTime(130, now);
        sub.frequency.exponentialRampToValueAtTime(25, now + 0.9);

        subGain.gain.setValueAtTime(0.85, now);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

        sub.connect(subGain);
        subGain.connect(this.masterGain || this.ctx.destination);

        sub.start(now);
        sub.stop(now + 1.0);
    }

    // Brassy Stadium Horn Chord for boundary events
    playStadiumHorn() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const baseFreqs = [196.00, 246.94, 293.66, 392.00]; // G3, B3, D4, G4 major chord
        
        baseFreqs.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const vibrato = this.ctx.createOscillator();
            const vibratoGain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            vibrato.frequency.value = 7.5; // 7.5 Hz wobble
            vibratoGain.gain.value = freq * 0.015; // 1.5% frequency drift

            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);

            osc.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);

            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

            vibrato.start(now);
            osc.start(now);
            vibrato.stop(now + 1.8);
            osc.stop(now + 1.8);
        });
    }

    // Fireworks explosion + crackles
    playFireworks() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Bass blast
        const blast = this.ctx.createOscillator();
        const blastGain = this.ctx.createGain();
        blast.type = 'sine';
        blast.frequency.setValueAtTime(90, now);
        blast.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        
        blastGain.gain.setValueAtTime(0.5, now);
        blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        blast.connect(blastGain);
        blastGain.connect(this.masterGain || this.ctx.destination);
        blast.start(now);
        blast.stop(now + 0.4);

        // 2. High snap noise bursts (crackling sky stars)
        for (let i = 0; i < 7; i++) {
            const delay = 0.08 + Math.random() * 0.5;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer();
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(2500 + Math.random() * 2000, now + delay);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.08, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);

            noise.start(now + delay);
            noise.stop(now + delay + 0.065);
        }
    }

    // Stumps breaking woody smash + metallic bails ring
    playStumpsShatter() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Low heavy impact wood crack (noise + sweep oscillator)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(220, now);
        filter.Q.value = 1.8;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain || this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.2);

        // 2. High metal ringing chime (represents bails jumping)
        const chime = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(1800, now);
        chime.frequency.linearRampToValueAtTime(1200, now + 0.25);
        
        chimeGain.gain.setValueAtTime(0.25, now);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        chime.connect(chimeGain);
        chimeGain.connect(this.masterGain || this.ctx.destination);
        chime.start(now);
        chime.stop(now + 0.3);
    }

    // Dual-tone Warning siren for wicket dismissals
    playWicketSiren() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(520, now);
        // Toggle siren frequencies
        osc.frequency.setValueAtTime(520, now + 0.15);
        osc.frequency.setValueAtTime(380, now + 0.3);
        osc.frequency.setValueAtTime(520, now + 0.45);
        osc.frequency.setValueAtTime(380, now + 0.6);

        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);
    }

    // Glitch alert for wickets
    playWicketCrash() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        
        // 1. Play wood stumps breaking ring
        this.playStumpsShatter();

        // 2. Play warning red siren
        this.playWicketSiren();

        // 3. Play crowd gasp disappointment
        setTimeout(() => this.playCrowdGasp(), 180);
    }

    // Crowd cheer (broad noise filtered and swelled)
    playCrowdCheer(isHuge = false) {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = isHuge ? 4.2 : 2.2;

        const cheerSource = this.ctx.createBufferSource();
        cheerSource.buffer = this.createNoiseBuffer();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.Q.setValueAtTime(0.8, now);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.0, now);

        gainNode.gain.linearRampToValueAtTime(isHuge ? 0.38 : 0.18, now + 0.5);
        gainNode.gain.linearRampToValueAtTime(isHuge ? 0.28 : 0.14, now + 1.2);
        gainNode.gain.linearRampToValueAtTime(isHuge ? 0.34 : 0.16, now + 1.8);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filter.frequency.exponentialRampToValueAtTime(880, now + 0.5);
        filter.frequency.exponentialRampToValueAtTime(580, now + duration);

        cheerSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain || this.ctx.destination);

        cheerSource.start(now);
        cheerSource.stop(now + duration);
    }

    // Crowd gasp/disappointment (low tone + quick breathy drop)
    playCrowdGasp() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = 2.0;

        const gaspSource = this.ctx.createBufferSource();
        gaspSource.buffer = this.createNoiseBuffer();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(650, now);
        filter.Q.setValueAtTime(1.1, now);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.0, now);

        gainNode.gain.linearRampToValueAtTime(0.18, now + 0.12);
        gainNode.gain.exponentialRampToValueAtTime(0.03, now + 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filter.frequency.exponentialRampToValueAtTime(280, now + 0.6);

        gaspSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain || this.ctx.destination);

        gaspSource.start(now);
        gaspSource.stop(now + duration);
    }

    // Boundary fanfare (arpeggio sweep)
    playBoundaryFanfare() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [392.00, 493.88, 587.33, 783.99, 987.77, 1174.66, 1567.98]; // G major arpeggio
        const noteDur = 0.07;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * noteDur);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1800, now + idx * noteDur);
            filter.frequency.exponentialRampToValueAtTime(700, now + idx * noteDur + 0.12);

            gain.gain.setValueAtTime(0.0, now + idx * noteDur);
            gain.gain.linearRampToValueAtTime(0.05, now + idx * noteDur + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * noteDur + 0.18);

            osc.start(now + idx * noteDur);
            osc.stop(now + idx * noteDur + 0.22);
        });

        // Play brassy stadium horn chord as support
        this.playStadiumHorn();
        // Trigger crowd cheer
        this.playCrowdCheer(true);
    }

    // Heavy Sub-Bass sixer boom
    playSixBoom() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Deep sub bass
        this.playSubBassSix();

        // Fireworks snaps
        this.playFireworks();

        // High laser sweeps
        const notes = [587.33, 880.00, 1174.66]; // D5, A5, D6
        notes.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 0.45);

            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

            osc.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.45);
        });

        // Deep crowd cheer
        this.playCrowdCheer(true);
    }

    // Key press simulation sound for commentary text typing
    playTyping() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400 + Math.random() * 900, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.008, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.012);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.012);
    }

    // Match Start Music (Retro Synth Fanfare)
    playMatchStartMusic() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Small triumphant arpeggio sequence
        const melody = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, G4, C5, E5, G5
        const timing = [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.88];

        melody.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + timing[idx]);
            
            gain.gain.setValueAtTime(0.0, now + timing[idx]);
            gain.gain.linearRampToValueAtTime(0.06, now + timing[idx] + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + timing[idx] + 0.4);

            osc.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);
            
            osc.start(now + timing[idx]);
            osc.stop(now + timing[idx] + 0.45);
        });

        this.playCrowdCheer(false);
    }

    // Match Winning Celebratory Fanfare (Triumphant brass chords & high bell chimes)
    playMatchWinSiren() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        this.playCrowdCheer(true);
        this.playFireworks();

        // 3 major chords ascending
        const chords = [
            [261.63, 329.63, 392.00], // C major
            [349.23, 440.00, 523.25], // F major
            [392.00, 493.88, 587.33, 783.99] // G major chord with octave G
        ];

        chords.forEach((notes, chordIdx) => {
            const chordDelay = chordIdx * 0.32;
            notes.forEach((freq) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.connect(gain);
                gain.connect(this.masterGain || this.ctx.destination);

                osc.type = chordIdx === 2 ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(freq, now + chordDelay);

                gain.gain.setValueAtTime(0.0, now + chordDelay);
                gain.gain.linearRampToValueAtTime(0.08, now + chordDelay + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, now + chordDelay + 0.6);

                osc.start(now + chordDelay);
                osc.stop(now + chordDelay + 0.65);
            });
        });

        // High frequency trophy bell ding
        const ding = this.ctx.createOscillator();
        const dingGain = this.ctx.createGain();
        ding.type = 'sine';
        ding.frequency.setValueAtTime(2200, now + 1.0);
        dingGain.gain.setValueAtTime(0.0, now + 1.0);
        dingGain.gain.linearRampToValueAtTime(0.18, now + 1.02);
        dingGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

        ding.connect(dingGain);
        dingGain.connect(this.masterGain || this.ctx.destination);
        ding.start(now + 1.0);
        ding.stop(now + 2.0);
    }
}

// Global Sound Instance
const Sound = new SoundEngine();
