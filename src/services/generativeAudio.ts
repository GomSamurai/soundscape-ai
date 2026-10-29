import { ChannelTrack, MidiScale, MidiPlayMode, MidiSoundPreset, DroneRootNote, DroneTexture } from '../types/soundscape';

// Standard Note Frequencies in Hz for Equal Temperament (A4 = 440 Hz)
const NOTE_BASE_FREQ: Record<DroneRootNote, number> = {
  C: 65.41,   // C2
  'C#': 69.30,
  D: 73.42,
  'D#': 77.78,
  E: 82.41,
  F: 87.31,
  'F#': 92.50,
  G: 98.00,
  'G#': 103.83,
  A: 110.00,
  'A#': 116.54,
  B: 123.47,
};

// Scale semitone intervals from root
const SCALE_INTERVALS: Record<MidiScale, number[]> = {
  pentatonic_major: [0, 2, 4, 7, 9],       // 1, 2, 3, 5, 6
  pentatonic_minor: [0, 3, 5, 7, 10],      // 1, b3, 4, 5, b7
  natural_minor: [0, 2, 3, 5, 7, 8, 10],   // Aeolian
  dorian: [0, 2, 3, 5, 7, 9, 10],          // Dorian
  lydian: [0, 2, 4, 6, 7, 9, 11],          // Lydian ethereal
  hirajoshi: [0, 2, 3, 7, 8],              // Traditional Zen Japanese
};

// Harmonic chord types (semitone offsets from chord root)
const CHORD_VOICINGS = [
  [0, 4, 7, 11],   // Maj7
  [0, 3, 7, 10],   // Min7
  [0, 2, 7, 9],    // Sus2 / Add9
  [0, 4, 7, 14],   // Maj9 spread
  [0, 3, 7, 14],   // Min9 spread
  [0, 5, 7, 12],   // Sus4 / Open 5th
];

export class GenerativeAudioService {
  // --- MIDI RANDOM ENGINE ---

  public static createMidiInstrument(
    track: ChannelTrack,
    destination: AudioNode,
    ctx: AudioContext,
    isEnginePlaying: () => boolean
  ): { cleanup: () => void; triggerChord: () => void } {
    let intervalTimer: any = null;
    let step = 0;
    let currentChordFrequencies: number[] = [];

    const rootFreq = 130.81; // C3 standard anchor
    const scale = track.midiScale || 'pentatonic_major';
    const intervals = SCALE_INTERVALS[scale] || SCALE_INTERVALS.pentatonic_major;
    const bpm = track.midiBpm || 65;
    const mode: MidiPlayMode = track.midiPlayMode || 'chords';
    const soundPreset: MidiSoundPreset = track.midiSoundPreset || 'rhodes';
    const octave = track.midiOctave || 3;
    const octaveMultiplier = Math.pow(2, octave - 3);

    // Compute frequencies for scale notes
    const getScaleFreq = (degree: number): number => {
      const octOffset = Math.floor(degree / intervals.length);
      const semitoneIndex = ((degree % intervals.length) + intervals.length) % intervals.length;
      const semitones = intervals[semitoneIndex] + octOffset * 12;
      return rootFreq * Math.pow(2, semitones / 12) * octaveMultiplier;
    };

    // Pick a harmonic chord from scale
    const pickNewChord = (): number[] => {
      const rootDegree = Math.floor(Math.random() * intervals.length);
      const voicing = CHORD_VOICINGS[Math.floor(Math.random() * CHORD_VOICINGS.length)];
      return voicing.map((semi) => {
        return rootFreq * Math.pow(2, (intervals[rootDegree] + semi) / 12) * octaveMultiplier;
      });
    };

    // Play single voice with high-fidelity studio timbre
    const playVoice = (freq: number, duration: number, velocity = 0.7) => {
      const now = ctx.currentTime;
      const voiceGain = ctx.createGain();
      voiceGain.connect(destination);

      if (soundPreset === 'rhodes') {
        // Dual sine with metallic tine overtone & warm bell decay
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const tineGain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 3.98, now); // slightly detuned 4th harmonic chime

        tineGain.gain.setValueAtTime(0.25 * velocity, now);
        tineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(0.35 * velocity, now + 0.012);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc1.connect(voiceGain);
        osc2.connect(tineGain);
        tineGain.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.1);
        osc2.stop(now + 0.5);
      } else if (soundPreset === 'warm_poly') {
        // Juno style warm analog saw/tri with gentle lowpass envelope
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 1.8, now);
        filter.frequency.exponentialRampToValueAtTime(freq * 0.9, now + duration);
        filter.Q.value = 1.8;

        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(0.28 * velocity, now + 0.08); // silky attack
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(voiceGain);

        osc.start(now);
        osc.stop(now + duration + 0.1);
      } else {
        // Zen Harp / Plucked string
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 2.2, now);
        filter.Q.value = 3.5;

        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(0.4 * velocity, now + 0.005);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);

        osc.connect(filter);
        filter.connect(voiceGain);

        osc.start(now);
        osc.stop(now + duration);
      }
    };

    currentChordFrequencies = pickNewChord();

    const triggerChordNow = () => {
      const chord = pickNewChord();
      currentChordFrequencies = chord;
      chord.forEach((freq, idx) => {
        // Slight humanized timing offset
        setTimeout(() => {
          if (ctx.state === 'running') {
            playVoice(freq, 3.2, 0.75 - idx * 0.08);
          }
        }, idx * 18);
      });
    };

    // Calculate tick time in ms
    const tickMs = Math.max(250, (60 / bpm) * 1000);

    const onTick = () => {
      if (!isEnginePlaying() || ctx.state !== 'running') return;

      const density = track.midiDensity ?? 0.75;
      if (Math.random() > density) return;

      if (mode === 'chords') {
        if (step % 4 === 0) {
          triggerChordNow();
        }
      } else if (mode === 'arpeggio') {
        if (currentChordFrequencies.length === 0 || step % 8 === 0) {
          currentChordFrequencies = pickNewChord();
        }
        const noteIdx = step % currentChordFrequencies.length;
        playVoice(currentChordFrequencies[noteIdx], (tickMs / 1000) * 1.8, 0.65);
      } else {
        // Random melody
        const degree = Math.floor(Math.random() * (intervals.length * 2));
        const freq = getScaleFreq(degree);
        playVoice(freq, (tickMs / 1000) * 2.5, 0.7);
        if (step % 6 === 0) {
          currentChordFrequencies = pickNewChord();
        }
      }
      step++;
    };

    intervalTimer = setInterval(onTick, tickMs);

    return {
      cleanup: () => {
        if (intervalTimer) clearInterval(intervalTimer);
      },
      triggerChord: triggerChordNow,
    };
  }

  // --- DRONE AMBIENT ENGINE ---

  public static createDroneAmbient(
    track: ChannelTrack,
    destination: AudioNode,
    ctx: AudioContext
  ): { cleanup: () => void; updateParams: (t: ChannelTrack) => void } {
    const cleanups: (() => void)[] = [];

    const rootNote: DroneRootNote = track.droneRootNote || 'D';
    const baseFreq = NOTE_BASE_FREQ[rootNote] || 73.42;
    const oct = track.droneOctave || 2;
    const octaveMult = oct === 1 ? 0.5 : oct === 3 ? 2.0 : 1.0;
    const fundamental = baseFreq * octaveMult;
    const texture: DroneTexture = track.droneTexture || 'warm_pad';
    const detuneSpread = (track.droneDetune ?? 0.35) * 25; // cents
    const movementSpeed = (track.droneMovement ?? 0.4) * 0.3 + 0.05; // Hz

    const masterDroneGain = ctx.createGain();
    masterDroneGain.gain.setValueAtTime(0, ctx.currentTime);
    masterDroneGain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.5);
    masterDroneGain.connect(destination);

    // Warm filter with gentle resonance
    const filter = ctx.createBiquadFilter();
    filter.type = texture === 'dark_void' ? 'lowpass' : 'lowpass';
    filter.frequency.value = texture === 'dark_void' ? 240 : texture === 'crystal_shimmer' ? 3800 : 950;
    filter.Q.value = texture === 'crystal_shimmer' ? 2.0 : 0.8;
    filter.connect(masterDroneGain);

    // Organic breathing LFO modulating the filter
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = movementSpeed;
    lfoGain.gain.value = filter.frequency.value * 0.32;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    cleanups.push(() => {
      try {
        lfo.stop();
        lfo.disconnect();
        lfoGain.disconnect();
      } catch (e) {}
    });

    const activeOscillators: OscillatorNode[] = [];

    if (texture === 'dark_void') {
      // Sub-bass sine + triangle one octave down with tape warmth
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = fundamental * 0.5;

      const body = ctx.createOscillator();
      body.type = 'triangle';
      body.frequency.value = fundamental;

      sub.connect(filter);
      body.connect(filter);
      sub.start();
      body.start();
      activeOscillators.push(sub, body);
    } else if (texture === 'crystal_shimmer') {
      // Fundamental + 5th + 8ve + high chime harmonics
      const freqs = [fundamental, fundamental * 1.5, fundamental * 2.0, fundamental * 3.0];
      const gains = [0.45, 0.25, 0.18, 0.10];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        g.gain.value = gains[idx];
        osc.connect(g);
        g.connect(filter);
        osc.start();
        activeOscillators.push(osc);
      });
    } else if (texture === 'tibetan_om') {
      // Additive meditation chime with slow sacred beat
      const freqs = [fundamental, fundamental * 2.76, fundamental * 5.4];
      const gains = [0.55, 0.22, 0.08];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        g.gain.value = gains[idx];
        osc.connect(g);
        g.connect(filter);
        osc.start();
        activeOscillators.push(osc);
      });
    } else {
      // 'warm_pad' & 'solar_wind': Triad cluster with stereo detuning
      const oscL = ctx.createOscillator();
      const oscC = ctx.createOscillator();
      const oscR = ctx.createOscillator();

      oscL.type = 'sawtooth';
      oscL.frequency.value = fundamental;
      oscL.detune.value = -detuneSpread;

      oscC.type = 'triangle';
      oscC.frequency.value = fundamental;

      oscR.type = 'sawtooth';
      oscR.frequency.value = fundamental;
      oscR.detune.value = detuneSpread;

      const pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      if (pannerL && pannerR) {
        pannerL.pan.value = -0.6;
        pannerR.pan.value = 0.6;
        oscL.connect(pannerL);
        pannerL.connect(filter);
        oscR.connect(pannerR);
        pannerR.connect(filter);
      } else {
        oscL.connect(filter);
        oscR.connect(filter);
      }
      oscC.connect(filter);

      oscL.start();
      oscC.start();
      oscR.start();
      activeOscillators.push(oscL, oscC, oscR);
    }

    cleanups.push(() => {
      activeOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      try {
        filter.disconnect();
        masterDroneGain.disconnect();
      } catch (e) {}
    });

    return {
      cleanup: () => {
        cleanups.forEach((fn) => fn());
      },
      updateParams: (t: ChannelTrack) => {
        const newRoot = t.droneRootNote || 'D';
        const newBase = NOTE_BASE_FREQ[newRoot] || 73.42;
        const newOct = t.droneOctave || 2;
        const newMult = newOct === 1 ? 0.5 : newOct === 3 ? 2.0 : 1.0;
        const newFund = newBase * newMult;

        activeOscillators.forEach((osc, idx) => {
          try {
            osc.frequency.setTargetAtTime(newFund * (idx === 1 ? 1.5 : 1.0), ctx.currentTime, 0.1);
          } catch (e) {}
        });
      },
    };
  }

  // --- STUDIO GRADE PROCEDURAL NOISE / NATURE SYNTHS ---

  // High-fidelity granular stochastic rain (individual droplet micro-impulses on resonant body)
  public static createStudioRain(destination: AudioNode, ctx: AudioContext): () => void {
    const cleanups: (() => void)[] = [];

    // Pink bed for continuous soft ambient rain layer
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + whiteL * 0.0555;
      b1 = 0.99332 * b1 + whiteR * 0.0750;
      b2 = 0.96900 * b2 + whiteL * 0.1538;
      left[i] = (b0 + b1 + b2 + whiteL * 0.1) * 0.22;
      right[i] = (b0 + b1 + b2 + whiteR * 0.1) * 0.22;
    }

    const bedSrc = ctx.createBufferSource();
    bedSrc.buffer = buffer;
    bedSrc.loop = true;

    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = 'bandpass';
    bedFilter.frequency.value = 2200;
    bedFilter.Q.value = 0.65;

    bedSrc.connect(bedFilter);
    bedFilter.connect(destination);
    bedSrc.start();

    // Stochastic droplet trigger timer (creates crisp acoustic raindrops on glass/leaves)
    let dropInterval: any = null;
    dropInterval = setInterval(() => {
      if (ctx.state !== 'running') return;
      // Spawn tiny micro-droplet resonator
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const dropGain = ctx.createGain();
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      const dropletPitch = 1200 + Math.random() * 2800; // 1.2k - 4k resonant drop
      osc.type = 'sine';
      osc.frequency.setValueAtTime(dropletPitch, now);
      osc.frequency.exponentialRampToValueAtTime(dropletPitch * 0.45, now + 0.04);

      dropGain.gain.setValueAtTime(0, now);
      dropGain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.12, now + 0.003);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      if (panner) {
        panner.pan.value = (Math.random() * 2 - 1) * 0.7;
        osc.connect(dropGain);
        dropGain.connect(panner);
        panner.connect(destination);
      } else {
        osc.connect(dropGain);
        dropGain.connect(destination);
      }

      osc.start(now);
      osc.stop(now + 0.06);
    }, 45);

    cleanups.push(() => {
      if (dropInterval) clearInterval(dropInterval);
      try {
        bedSrc.stop();
        bedSrc.disconnect();
        bedFilter.disconnect();
      } catch (e) {}
    });

    return () => cleanups.forEach((fn) => fn());
  }

  // High-fidelity biomorphic ocean surf (tidal surge & undertow foam)
  public static createStudioOcean(destination: AudioNode, ctx: AudioContext): () => void {
    const cleanups: (() => void)[] = [];
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    // Resonant swell filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 450;
    filter.Q.value = 1.2;

    // Tidal swell LFO (8 second cycle)
    const swellLfo = ctx.createOscillator();
    const swellDepth = ctx.createGain();
    swellLfo.type = 'sine';
    swellLfo.frequency.value = 0.12; // 1 wave every ~8.3 seconds
    swellDepth.gain.value = 400; // Modulates filter cutoff from ~50Hz to ~850Hz

    swellLfo.connect(swellDepth);
    swellDepth.connect(filter.frequency);

    const ampGain = ctx.createGain();
    const ampLfo = ctx.createOscillator();
    const ampDepth = ctx.createGain();
    ampLfo.type = 'sine';
    ampLfo.frequency.value = 0.12;
    ampDepth.gain.value = 0.35;
    ampGain.gain.value = 0.45;

    ampLfo.connect(ampDepth);
    ampDepth.connect(ampGain.gain);

    src.connect(filter);
    filter.connect(ampGain);
    ampGain.connect(destination);

    src.start();
    swellLfo.start();
    ampLfo.start();

    cleanups.push(() => {
      try {
        src.stop();
        swellLfo.stop();
        ampLfo.stop();
        src.disconnect();
        filter.disconnect();
        ampGain.disconnect();
      } catch (e) {}
    });

    return () => cleanups.forEach((fn) => fn());
  }

  // --- ACOUSTIC TRACKING GENERATOR FOR YOUTUBE VIDEOS ---
  // Connects EXCLUSIVELY to masterAnalyser so the Master Visualizer & meters
  // reflect the dynamic spectrum of playing YouTube videos without audio leakage.
  public static createYouTubeAcousticTracker(
    track: ChannelTrack,
    destination: AudioNode,
    ctx: AudioContext
  ): () => void {
    const cleanups: (() => void)[] = [];
    const key = (track.soundKey || '').toLowerCase();
    const name = (track.name || '').toLowerCase();

    // Multiband spectrum synthesis matching the acoustic footprint of the video
    let osc1Type: OscillatorType = 'sine';
    let osc2Type: OscillatorType = 'triangle';
    let f1 = 80;
    let f2 = 320;
    let f3 = 1800;

    if (key.includes('cyberpunk') || name.includes('blade runner')) {
      osc1Type = 'sawtooth';
      osc2Type = 'triangle';
      f1 = 55; // Sub-bass A1
      f2 = 220; // Synth lead
      f3 = 4500; // Rain/neon shimmer
    } else if (key.includes('jazz') || key.includes('lofi') || name.includes('piano')) {
      osc1Type = 'sine';
      osc2Type = 'triangle';
      f1 = 65; // Kick/Bass
      f2 = 440; // Piano chords
      f3 = 3200; // Snare/Hi-hat
    } else if (key.includes('rain') || key.includes('thunder') || name.includes('lluvia')) {
      osc1Type = 'triangle';
      osc2Type = 'sine';
      f1 = 90; // Thunder roll
      f2 = 1400; // Rain body
      f3 = 5800; // High drops
    } else if (key.includes('fire') || name.includes('chimenea')) {
      f1 = 120; // Fire combustion
      f2 = 800; // Heat resonance
      f3 = 4200; // Crackle
    } else {
      f1 = 75;
      f2 = 500;
      f3 = 2400;
    }

    // Low band generator (bass / rhythm transient)
    const lowOsc = ctx.createOscillator();
    const lowGain = ctx.createGain();
    lowOsc.type = osc1Type;
    lowOsc.frequency.value = f1;
    lowGain.gain.value = 0.28;

    // Mid band generator (melody / chord harmonic body)
    const midOsc = ctx.createOscillator();
    const midGain = ctx.createGain();
    midOsc.type = osc2Type;
    midOsc.frequency.value = f2;
    midGain.gain.value = 0.22;

    // High band generator (organic texture / percussion)
    const highBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const hData = highBuffer.getChannelData(0);
    for (let i = 0; i < hData.length; i++) hData[i] = Math.random() * 2 - 1;
    const highSrc = ctx.createBufferSource();
    highSrc.buffer = highBuffer;
    highSrc.loop = true;

    const highFilter = ctx.createBiquadFilter();
    highFilter.type = 'bandpass';
    highFilter.frequency.value = f3;
    highFilter.Q.value = 1.2;

    const highGain = ctx.createGain();
    highGain.gain.value = 0.18;

    // Subtle natural rhythmic cadence modulator to breathe life into the spectrum
    const cadenceLfo = ctx.createOscillator();
    const cadenceGain = ctx.createGain();
    cadenceLfo.type = 'sine';
    cadenceLfo.frequency.value = 0.65; // ~78 BPM natural musical cadence
    cadenceGain.gain.value = 0.08;

    cadenceLfo.connect(cadenceGain);
    cadenceGain.connect(midGain.gain);

    lowOsc.connect(lowGain);
    midOsc.connect(midGain);
    highSrc.connect(highFilter);
    highFilter.connect(highGain);

    lowGain.connect(destination);
    midGain.connect(destination);
    highGain.connect(destination);

    lowOsc.start();
    midOsc.start();
    highSrc.start();
    cadenceLfo.start();

    cleanups.push(() => {
      try {
        lowOsc.stop();
        midOsc.stop();
        highSrc.stop();
        cadenceLfo.stop();
        lowOsc.disconnect();
        midOsc.disconnect();
        highSrc.disconnect();
        cadenceLfo.disconnect();
        lowGain.disconnect();
        midGain.disconnect();
        highGain.disconnect();
      } catch (e) {}
    });

    return () => cleanups.forEach((fn) => fn());
  }
}
