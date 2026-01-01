// Simple synth for sound effects to avoid external asset dependencies for MVP

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const playTone = (freq, type, duration) => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

export const playCorrect = () => {
    playTone(600, 'sine', 0.1);
    setTimeout(() => playTone(800, 'sine', 0.2), 100);
};

export const playWrong = () => {
    playTone(200, 'sawtooth', 0.5);
    setTimeout(() => playTone(150, 'sawtooth', 0.5), 200);
};

export const playWin = () => {
    // Fanfare-ish
    [400, 500, 600, 800].forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.2), i * 150));
};

export const playTick = () => {
    playTone(800, 'triangle', 0.05);
};
