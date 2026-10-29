import { ChannelTrack, SynthModel, AudioBusGroup } from '../types/soundscape';
import { GenerativeAudioService } from './generativeAudio';

interface ChannelAudioNodes {
  sourceNode?: AudioNode;
  filterNode: BiquadFilterNode;
  tapeShaperNode: WaveShaperNode;
  tapeGainNode: GainNode;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  reverbSendNode: GainNode;
  delaySendNode: GainNode;
  delayNode: DelayNode;
  delayFeedbackNode: GainNode;
  analyserNode: AnalyserNode;
  mediaElement?: HTMLAudioElement | HTMLVideoElement;
  cleanup?: () => void;
  updateParams?: (track: ChannelTrack) => void;
}

function makeSaturationCurve(amount = 25, n_samples = 44100): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(n_samples * 4);
  const curve = new Float32Array(buffer);
  const k = Math.max(1, amount);
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // Sigmoidal soft clipping curve for warm analog tape sound
    curve[i] = Math.tanh(k * x * 0.4) / Math.tanh(k * 0.4);
  }
  return curve as unknown as Float32Array<ArrayBuffer>;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private masterLowEq: BiquadFilterNode | null = null;
  private masterMidEq: BiquadFilterNode | null = null;
  private masterHighEq: BiquadFilterNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbMasterGain: GainNode | null = null;
  private masterReverbSend: GainNode | null = null;
  private masterDelayNode: DelayNode | null = null;
  private masterDelayFeedback: GainNode | null = null;
  private masterDelayGain: GainNode | null = null;
  private masterWarmthShaper: WaveShaperNode | null = null;
  private masterWarmthGain: GainNode | null = null;
  private channels: Map<string, ChannelAudioNodes> = new Map();
  private midiInstruments: Map<string, () => void> = new Map();
  private isPlaying: boolean = false;
  private mediaDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private tabAudioStream: MediaStream | null = null;
  private tabAudioSource: MediaStreamAudioSourceNode | null = null;

  public getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      this.setupMasterChain();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private setupMasterChain() {
    if (!this.ctx) return;

    // Master filter
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 20000;
    this.masterFilter.Q.value = 0.7;

    // 3-Band Parametric Master Equalizer
    this.masterLowEq = this.ctx.createBiquadFilter();
    this.masterLowEq.type = 'lowshelf';
    this.masterLowEq.frequency.value = 100;
    this.masterLowEq.gain.value = 0; // dB

    this.masterMidEq = this.ctx.createBiquadFilter();
    this.masterMidEq.type = 'peaking';
    this.masterMidEq.frequency.value = 1200;
    this.masterMidEq.Q.value = 1.0;
    this.masterMidEq.gain.value = 0; // dB

    this.masterHighEq = this.ctx.createBiquadFilter();
    this.masterHighEq.type = 'highshelf';
    this.masterHighEq.frequency.value = 8000;
    this.masterHighEq.gain.value = 0; // dB

    // Master Delay / Echo Node
    this.masterDelayNode = this.ctx.createDelay(3.0);
    this.masterDelayNode.delayTime.value = 0.35;
    this.masterDelayFeedback = this.ctx.createGain();
    this.masterDelayFeedback.gain.value = 0.35;
    this.masterDelayGain = this.ctx.createGain();
    this.masterDelayGain.gain.value = 0.0; // dry initially

    this.masterDelayNode.connect(this.masterDelayFeedback);
    this.masterDelayFeedback.connect(this.masterDelayNode);
    this.masterDelayNode.connect(this.masterDelayGain);

    // Master Tape Warmth / Analog Saturation Shaper
    this.masterWarmthShaper = this.ctx.createWaveShaper();
    this.masterWarmthShaper.curve = makeSaturationCurve(25);
    this.masterWarmthShaper.oversample = '2x';
    this.masterWarmthGain = this.ctx.createGain();
    this.masterWarmthGain.gain.value = 0.0; // 0 = off

    // Master Limiter / Compressor for transparent acoustic safety
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -3.0;
    this.masterCompressor.knee.value = 6;
    this.masterCompressor.ratio.value = 8;
    this.masterCompressor.attack.value = 0.003;
    this.masterCompressor.release.value = 0.15;

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;

    // Master Analyser (FFT 1024 calibrated to professional studio range -75 dBFS to 0 dBFS)
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 1024;
    this.masterAnalyser.smoothingTimeConstant = 0.82;
    this.masterAnalyser.minDecibels = -75;
    this.masterAnalyser.maxDecibels = 0;

    // Spatial Reverb impulse response generator
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(this.ctx, 2.8, 2.0);
    this.reverbMasterGain = this.ctx.createGain();
    this.reverbMasterGain.gain.value = 0.35;

    // Master Reverb Send from masterFilter
    this.masterReverbSend = this.ctx.createGain();
    this.masterReverbSend.gain.value = 0.25;
    this.masterFilter.connect(this.masterReverbSend);
    this.masterReverbSend.connect(this.reverbNode);

    // Media stream destination for recording mixdowns
    this.mediaDest = this.ctx.createMediaStreamDestination();

    // Wiring master graph:
    // Reverb wet out -> reverbMasterGain -> masterLowEq
    this.reverbNode.connect(this.reverbMasterGain);
    this.reverbMasterGain.connect(this.masterLowEq);

    // Master Delay: input from masterFilter, wet out to masterLowEq
    this.masterFilter.connect(this.masterDelayNode);
    this.masterDelayGain.connect(this.masterLowEq);

    // Direct dry signal: Filter -> LowEq -> MidEq -> HighEq
    this.masterFilter.connect(this.masterLowEq);
    this.masterLowEq.connect(this.masterMidEq);
    this.masterMidEq.connect(this.masterHighEq);

    // HighEq -> Compressor (Dry path)
    this.masterHighEq.connect(this.masterCompressor);

    // HighEq -> Warmth Shaper -> Warmth Gain -> Compressor (Parallel Tape Saturation)
    this.masterHighEq.connect(this.masterWarmthShaper);
    this.masterWarmthShaper.connect(this.masterWarmthGain);
    this.masterWarmthGain.connect(this.masterCompressor);

    this.masterCompressor.connect(this.masterGain);

    // Audible Web Audio output directly to speakers and recording stream
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(this.mediaDest);

    // Pure Web Audio master chain to Analyser (100% authentic physical sound from master output)
    this.masterGain.connect(this.masterAnalyser);
  }

  // Algorithmic high-fidelity room/hall impulse response
  private createImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const env = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  public setMasterVolume(value: number) {
    if (!this.ctx) return;
    const clamped = Math.max(0, Math.min(1.2, value));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  public setMasterReverb(value: number) {
    if (!this.reverbMasterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1.0, value));
    this.reverbMasterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    if (this.masterReverbSend) {
      this.masterReverbSend.gain.setTargetAtTime(clamped * 0.6, this.ctx.currentTime, 0.05);
    }
  }

  public setMasterFilterCutoff(value: number) {
    if (!this.ctx) return;
    const clamped = Math.max(200, Math.min(20000, value));
    if (this.masterFilter) {
      this.masterFilter.frequency.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  public setMasterLowEq(gainDb: number) {
    if (!this.masterLowEq || !this.ctx) return;
    const clamped = Math.max(-12, Math.min(12, gainDb));
    this.masterLowEq.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setMasterMidEq(gainDb: number) {
    if (!this.masterMidEq || !this.ctx) return;
    const clamped = Math.max(-12, Math.min(12, gainDb));
    this.masterMidEq.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setMasterDelay(wet: number, time = 0.35, feedback = 0.35) {
    if (!this.masterDelayGain || !this.masterDelayNode || !this.masterDelayFeedback || !this.ctx) return;
    const clampedWet = Math.max(0, Math.min(1.0, wet));
    const clampedTime = Math.max(0.05, Math.min(2.0, time));
    const clampedFb = Math.max(0, Math.min(0.85, feedback));
    this.masterDelayGain.gain.setTargetAtTime(clampedWet, this.ctx.currentTime, 0.05);
    this.masterDelayNode.delayTime.setTargetAtTime(clampedTime, this.ctx.currentTime, 0.05);
    this.masterDelayFeedback.gain.setTargetAtTime(clampedFb, this.ctx.currentTime, 0.05);
  }

  public setMasterWarmth(amount: number) {
    if (!this.masterWarmthGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1.0, amount));
    this.masterWarmthGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setMasterHighEq(gainDb: number) {
    if (!this.masterHighEq || !this.ctx) return;
    const clamped = Math.max(-12, Math.min(12, gainDb));
    this.masterHighEq.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  // Soft organic Tibetan singing bowl interval chime (for focus timer transitions)
  public playIntervalChime(fundamental = 528) {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(fundamental, now);

    // Harmonic partial
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(fundamental * 2.76, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

    osc.connect(gain);
    osc2.connect(gain2);

    if (this.masterGain) {
      gain.connect(this.masterGain);
      gain2.connect(this.masterGain);
    } else {
      gain.connect(ctx.destination);
      gain2.connect(ctx.destination);
    }

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 3.5);
    osc2.stop(now + 3.5);
  }

  // Harmonic meditation chime / Tibetan bell for Pomodoro intervals and timer alerts
  public playGentleChime(fundamental = 528) {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const partials = [fundamental, fundamental * 1.5, fundamental * 2.76, fundamental * 4.2];
    const gains = [0.22, 0.12, 0.05, 0.02];

    partials.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Organic gong decay envelope
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gains[idx], now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      osc.connect(g);
      if (this.masterGain) {
        g.connect(this.masterGain);
      } else {
        g.connect(ctx.destination);
      }

      osc.start(now);
      osc.stop(now + 4.0);
    });
  }

  public getMasterAnalyser(): AnalyserNode | null {
    return this.masterAnalyser;
  }

  public getChannelAnalyser(channelId: string): AnalyserNode | null {
    return this.channels.get(channelId)?.analyserNode || null;
  }

  public isEnginePlaying(): boolean {
    return this.isPlaying;
  }

  // Live real-time tab/YouTube loopback capture
  // Captures the live mixed audio from this tab (including all YouTube iframes)
  // and feeds raw physical PCM samples directly into masterAnalyser in real-time.
  public async enableLiveTabAudioCapture(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          suppressLocalAudioPlayback: false,
        } as any,
      });

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }

      // Stop unused video track immediately to conserve GPU/CPU resources
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }

      this.disableLiveTabAudioCapture();

      this.tabAudioStream = stream;
      this.tabAudioSource = ctx.createMediaStreamSource(stream);

      // Connect strictly to masterAnalyser (zero speaker echo, zero feedback)
      if (this.masterAnalyser) {
        this.tabAudioSource.connect(this.masterAnalyser);
      }

      audioTrack.onended = () => {
        this.disableLiveTabAudioCapture();
      };

      window.dispatchEvent(new CustomEvent('tab_audio_capture_changed', { detail: { active: true } }));
      return true;
    } catch (err) {
      console.warn('Tab audio capture cancelled or error:', err);
      return false;
    }
  }

  public disableLiveTabAudioCapture() {
    if (this.tabAudioSource) {
      try {
        this.tabAudioSource.disconnect();
      } catch (e) {}
      this.tabAudioSource = null;
    }
    if (this.tabAudioStream) {
      try {
        this.tabAudioStream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      this.tabAudioStream = null;
    }
    window.dispatchEvent(new CustomEvent('tab_audio_capture_changed', { detail: { active: false } }));
  }

  public isLiveTabAudioActive(): boolean {
    return !!(this.tabAudioSource && this.tabAudioStream && this.tabAudioStream.active);
  }

  public async startAll() {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.isPlaying = true;
    for (const [_, nodes] of this.channels) {
      if (nodes.mediaElement && nodes.mediaElement.paused) {
        nodes.mediaElement.play().catch(() => {});
      }
    }
  }

  public pauseAll() {
    this.isPlaying = false;
    for (const [_, nodes] of this.channels) {
      if (nodes.mediaElement && !nodes.mediaElement.paused) {
        nodes.mediaElement.pause();
      }
    }
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  public stopAll() {
    this.pauseAll();
    for (const [_, nodes] of this.channels) {
      if (nodes.mediaElement) {
        try {
          nodes.mediaElement.currentTime = 0;
        } catch (e) {}
      }
    }
  }

  public syncChannel(track: ChannelTrack, allTracks: ChannelTrack[], buses?: AudioBusGroup[]) {
    const ctx = this.getAudioContext();
    let nodes = this.channels.get(track.id);

    // Calculate effective bus multiplier if track belongs to a bus group
    let busMultiplier = 1.0;
    if (buses && track.busId) {
      const bus = buses.find((b) => b.id === track.busId);
      if (bus) {
        if (bus.muted) {
          busMultiplier = 0;
        } else {
          const hasAnyBusSolo = buses.some((b) => b.solo);
          if (hasAnyBusSolo && !bus.solo && !track.solo) {
            busMultiplier = 0;
          } else {
            busMultiplier = bus.volume;
          }
        }
      }
    }

    // Calculate effective gain considering Solo and Mute
    const hasAnySolo = allTracks.some((t) => t.solo);
    let targetGain = track.volume * busMultiplier;
    if (track.muted) {
      targetGain = 0;
    } else if (hasAnySolo && !track.solo) {
      targetGain = 0;
    }

    if (!nodes) {
      // Build channel audio chain
      const filter = ctx.createBiquadFilter();
      filter.type = track.filterType || 'lowpass';
      filter.frequency.value = track.filterCutoff || 20000;
      filter.Q.value = track.filterQ || 1.0;

      // Analog Tape Saturation
      const tapeShaper = ctx.createWaveShaper();
      tapeShaper.curve = makeSaturationCurve(20);
      tapeShaper.oversample = '2x';
      const tapeGain = ctx.createGain();
      tapeGain.gain.value = track.tapeWarmth || 0;

      const gain = ctx.createGain();
      gain.gain.value = targetGain;

      const pan = ctx.createStereoPanner();
      pan.pan.value = track.pan || 0;

      const reverbSend = ctx.createGain();
      reverbSend.gain.value = track.reverbSend || 0.2;

      // Stereo Delay / Echo per channel
      const delaySend = ctx.createGain();
      delaySend.gain.value = track.delaySend || 0;
      const delay = ctx.createDelay(2.5);
      delay.delayTime.value = track.delayTime || 0.35;
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = track.delayFeedback || 0.35;

      // Wiring delay loop
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      // Connect channel pipeline:
      // Filter -> Gain & TapeShaper -> Gain -> Pan -> Analyser -> Master or YouTube Tracker
      filter.connect(gain);
      filter.connect(tapeShaper);
      tapeShaper.connect(tapeGain);
      tapeGain.connect(gain);

      gain.connect(pan);
      pan.connect(analyser);

      if (track.type !== 'youtube_video') {
        if (this.masterFilter) {
          analyser.connect(this.masterFilter);
          delay.connect(this.masterFilter);
        }
        if (this.reverbNode) {
          pan.connect(reverbSend);
          reverbSend.connect(this.reverbNode);
        }

        // Delay send
        pan.connect(delaySend);
        delaySend.connect(delay);
      }

      nodes = {
        filterNode: filter,
        tapeShaperNode: tapeShaper,
        tapeGainNode: tapeGain,
        gainNode: gain,
        panNode: pan,
        reverbSendNode: reverbSend,
        delaySendNode: delaySend,
        delayNode: delay,
        delayFeedbackNode: delayFeedback,
        analyserNode: analyser,
      };

      this.setupTrackSource(track, nodes, ctx);
      this.channels.set(track.id, nodes);
    } else {
      // Update existing nodes smoothly
      nodes.gainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.04);
      nodes.panNode.pan.setTargetAtTime(track.pan, ctx.currentTime, 0.04);
      nodes.filterNode.frequency.setTargetAtTime(track.filterCutoff, ctx.currentTime, 0.04);
      nodes.filterNode.type = track.filterType || 'lowpass';
      nodes.reverbSendNode.gain.setTargetAtTime(track.reverbSend, ctx.currentTime, 0.04);
      nodes.tapeGainNode.gain.setTargetAtTime(track.tapeWarmth || 0, ctx.currentTime, 0.04);
      nodes.delaySendNode.gain.setTargetAtTime(track.delaySend || 0, ctx.currentTime, 0.04);
      nodes.delayNode.delayTime.setTargetAtTime(track.delayTime || 0.35, ctx.currentTime, 0.04);
      nodes.delayFeedbackNode.gain.setTargetAtTime(track.delayFeedback || 0.35, ctx.currentTime, 0.04);

      if (nodes.updateParams) {
        nodes.updateParams(track);
      }

      if (nodes.mediaElement) {
        nodes.mediaElement.playbackRate = track.playbackRate || 1.0;
        nodes.mediaElement.loop = track.loop !== false;
      }
    }
  }

  private setupTrackSource(track: ChannelTrack, nodes: ChannelAudioNodes, ctx: AudioContext) {
    if (track.type === 'youtube_video') {
      nodes.cleanup = () => {};
    } else if (track.type === 'midi_random') {
      const res = GenerativeAudioService.createMidiInstrument(
        track,
        nodes.filterNode,
        ctx,
        () => this.isPlaying
      );
      nodes.cleanup = res.cleanup;
      nodes.updateParams = res.updateParams;
      this.midiInstruments.set(track.id, res.triggerChord);
    } else if (track.type === 'drone_ambient') {
      const res = GenerativeAudioService.createDroneAmbient(track, nodes.filterNode, ctx);
      nodes.cleanup = res.cleanup;
      nodes.updateParams = res.updateParams;
    } else if (track.type === 'synthesizer' && track.synthType) {
      let currentSynthCleanup = this.createProceduralSynth(track, nodes.filterNode, ctx);
      nodes.cleanup = () => {
        if (currentSynthCleanup) currentSynthCleanup();
      };
      let currentSynthType = track.synthType;
      nodes.updateParams = (updatedTrack: ChannelTrack) => {
        if (updatedTrack.synthType && updatedTrack.synthType !== currentSynthType) {
          currentSynthType = updatedTrack.synthType;
          if (currentSynthCleanup) currentSynthCleanup();
          currentSynthCleanup = this.createProceduralSynth(updatedTrack, nodes.filterNode, ctx);
        }
      };
    } else if ((track.type === 'audio_url' || track.type === 'video_url') && track.sourceUrl) {
      const mediaEl = track.type === 'video_url' ? document.createElement('video') : new Audio();
      mediaEl.crossOrigin = 'anonymous';
      mediaEl.src = track.sourceUrl;
      mediaEl.loop = track.loop !== false;
      mediaEl.playbackRate = track.playbackRate || 1.0;
      if (track.type === 'video_url') {
        const v = mediaEl as HTMLVideoElement;
        v.playsInline = true;
        v.muted = false; // Audio routed via WebAudio
      }

      nodes.mediaElement = mediaEl;

      try {
        const source = ctx.createMediaElementSource(mediaEl);
        source.connect(nodes.filterNode);
        nodes.sourceNode = source;

        if (this.isPlaying) {
          mediaEl.play().catch(() => {});
        }
      } catch (err) {
        console.warn('MediaElementSource initialization deferred or CORS restricted:', err);
      }

      nodes.cleanup = () => {
        mediaEl.pause();
        mediaEl.src = '';
        mediaEl.load();
      };
    }
  }

  // Procedural synthesizer engines (binaural, isochronic, noise generators, singing bowls, rain, etc.)
  private createProceduralSynth(track: ChannelTrack, destination: AudioNode, ctx: AudioContext): () => void {
    const cleanups: (() => void)[] = [];
    const type = track.synthType;

    switch (type) {
      case 'binaural':
      case 'binaural_alpha':
      case 'binaural_theta': {
        const carrier = track.carrierHz || 210;
        const beatOffset = track.beatHz || (type === 'binaural_alpha' ? 10 : 6);
        const leftOsc = ctx.createOscillator();
        const rightOsc = ctx.createOscillator();
        const merger = ctx.createChannelMerger(2);

        leftOsc.type = 'sine';
        leftOsc.frequency.value = carrier;
        rightOsc.type = 'sine';
        rightOsc.frequency.value = carrier + beatOffset;

        leftOsc.connect(merger, 0, 0);
        rightOsc.connect(merger, 0, 1);
        merger.connect(destination);

        leftOsc.start();
        rightOsc.start();

        cleanups.push(() => {
          leftOsc.stop();
          rightOsc.stop();
          leftOsc.disconnect();
          rightOsc.disconnect();
          merger.disconnect();
        });
        break;
      }

      case 'isochronic': {
        // Isochronic tones: Periodic rhythmic amplitude modulation.
        // Effective on laptop and room speakers without requiring headphones!
        const carrier = track.carrierHz || 432;
        const pulseRate = track.beatHz || 10;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = carrier;

        // Modulated Gain node
        const ampGain = ctx.createGain();
        ampGain.gain.value = 0.5; // Baseline DC offset

        // LFO modulating amplitude
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = pulseRate;

        const lfoDepth = ctx.createGain();
        lfoDepth.gain.value = 0.48; // Swings amplitude smoothly between ~0.02 and 0.98

        lfo.connect(lfoDepth);
        lfoDepth.connect(ampGain.gain);

        osc.connect(ampGain);
        ampGain.connect(destination);

        osc.start();
        lfo.start();

        cleanups.push(() => {
          osc.stop();
          lfo.stop();
          osc.disconnect();
          lfo.disconnect();
          lfoDepth.disconnect();
          ampGain.disconnect();
        });
        break;
      }

      case 'pink_noise':
      case 'brown_noise':
      case 'white_noise': {
        const bufferSize = ctx.sampleRate * 4;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        if (type === 'white_noise') {
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
        } else if (type === 'pink_noise') {
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.153852;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.016898;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
          }
        } else {
          // Brown noise
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
          }
        }

        const whiteSource = ctx.createBufferSource();
        whiteSource.buffer = noiseBuffer;
        whiteSource.loop = true;
        whiteSource.connect(destination);
        whiteSource.start();

        cleanups.push(() => {
          whiteSource.stop();
          whiteSource.disconnect();
        });
        break;
      }

      case 'drone_sub':
      case 'sub_drone': {
        // Deep resonant sub-bass drone with harmonic detuning
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const subGain = ctx.createGain();
        subGain.gain.value = 0.4;

        osc1.type = 'triangle';
        osc1.frequency.value = 55; // A1
        osc2.type = 'sawtooth';
        osc2.frequency.value = 55.4; // subtle slow phasing detune

        osc1.connect(subGain);
        osc2.connect(subGain);
        subGain.connect(destination);

        osc1.start();
        osc2.start();

        cleanups.push(() => {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
          subGain.disconnect();
        });
        break;
      }

      case 'singing_bowl': {
        // Modal acoustic singing bowl synthesis (fundamental + metallic harmonics)
        const partials = [240, 662.4, 1296];
        const partialGains = [0.6, 0.25, 0.1];
        const oscs: OscillatorNode[] = [];

        partials.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const pGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          pGain.gain.value = partialGains[idx];

          // Slow organic pitch vibrato
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.value = 0.25;
          lfoGain.gain.value = 0.8;
          lfo.connect(osc.frequency);

          osc.connect(pGain);
          pGain.connect(destination);

          osc.start();
          lfo.start();
          oscs.push(osc);

          cleanups.push(() => {
            osc.stop();
            lfo.stop();
            osc.disconnect();
            lfo.disconnect();
          });
        });
        break;
      }

      case 'rain_synth':
        return GenerativeAudioService.createStudioRain(destination, ctx);

      case 'ocean_synth':
        return GenerativeAudioService.createStudioOcean(destination, ctx);

      case 'wind_stream':
      case 'vinyl_crackle':
      default: {
        // High fidelity filtered atmospheric wind/crackle texture
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
        const left = noiseBuffer.getChannelData(0);
        const right = noiseBuffer.getChannelData(1);
        for (let i = 0; i < bufferSize; i++) {
          left[i] = Math.random() * 2 - 1;
          right[i] = Math.random() * 2 - 1;
        }

        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuffer;
        noiseSrc.loop = true;

        const bpFilter = ctx.createBiquadFilter();
        bpFilter.type = type === 'wind_stream' ? 'bandpass' : 'lowpass';
        bpFilter.frequency.value = type === 'wind_stream' ? 420 : 1800;
        bpFilter.Q.value = type === 'wind_stream' ? 2.2 : 0.8;

        noiseSrc.connect(bpFilter);
        bpFilter.connect(destination);

        noiseSrc.start();

        cleanups.push(() => {
          try {
            noiseSrc.stop();
            noiseSrc.disconnect();
            bpFilter.disconnect();
          } catch (e) {}
        });
        break;
      }
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }

  public triggerMidiChord(channelId: string) {
    this.midiInstruments.get(channelId)?.();
  }

  public removeChannel(channelId: string) {
    this.midiInstruments.delete(channelId);
    const nodes = this.channels.get(channelId);
    if (nodes) {
      if (nodes.cleanup) {
        nodes.cleanup();
      }
      try {
        nodes.gainNode.disconnect();
        nodes.panNode.disconnect();
        nodes.filterNode.disconnect();
        nodes.reverbSendNode.disconnect();
        nodes.analyserNode.disconnect();
      } catch (e) {}
      this.channels.delete(channelId);
    }
  }

  public removeAllChannels() {
    for (const [id] of this.channels) {
      this.removeChannel(id);
    }
  }

  // Master Audio Recording & Export Feature
  public startRecording(): boolean {
    if (!this.mediaDest) return false;
    try {
      this.recordedChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      this.mediaRecorder = new MediaRecorder(this.mediaDest.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      return true;
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      return false;
    }
  }

  public stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        this.recordedChunks = [];
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  public isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}

export const audioEngine = new AudioEngine();
