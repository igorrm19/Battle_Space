export class AudioManager {
    constructor() {
        // Safe fallback for test environments without Web Audio API
        const AudioCtor = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
        if (AudioCtor) {
            this.ctx = new AudioCtor();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = 0.3;

            this.bgmStarted = false;
        } else {
            // Minimal no-op stub so tests can run headlessly
            this.ctx = {
                currentTime: 0,
                state: 'running',
                sampleRate: 44100,
                destination: {},
                createGain: () => ({ gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
                createOscillator: () => ({ type: 'sine', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, start() {}, stop() {}, connect() {} }),
                createBiquadFilter: () => ({ type: 'lowpass', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
                createBuffer: () => ({}),
                createBufferSource: () => ({ buffer: null, start() {}, stop() {}, connect() {} }),
            };
            this.masterGain = { connect() {}, gain: { value: 0.3 } };
            this.bgmStarted = true; // skip starting BGM in non-audio env
        }
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (!this.bgmStarted) {
            this.startBGM();
            this.bgmStarted = true;
        }
    }

    startBGM() {
        // Melancholic Space Drone
        const createDrone = (freq, vol) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            lfo.type = 'sine';
            lfo.frequency.value = 0.1; // Very slow
            lfoGain.gain.value = 0.05;

            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            gain.gain.value = vol;

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start();
            lfo.start();
        };

        createDrone(40, 0.1);  // Deep bass
        createDrone(60, 0.08); // Mid bass
        createDrone(110, 0.05); // Low mid

        // Random "Space Pings"
        setInterval(() => {
            if (Math.random() > 0.7) {
                this.playPing();
            }
        }, 3000);
    }

    playPing() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const freq = 400 + Math.random() * 1000;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 5);
    }

    playStart() {
        const now = this.ctx.currentTime;
        [220, 330, 440, 660].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(f, now + i * 0.1);
            gain.gain.setValueAtTime(0.2, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.5);
        });
    }

    playHit() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playSkill() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playFire() {
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
    }

    playLightning() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, this.ctx.currentTime);
        osc.frequency.randomize = () => {
            osc.frequency.value = 1000 + Math.random() * 3000;
        };
        const interval = setInterval(osc.frequency.randomize, 20);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
        setTimeout(() => clearInterval(interval), 100);
    }

    playGravity() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playLevelUp() {
        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.2, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    }
}

export const audioManager = new AudioManager();
