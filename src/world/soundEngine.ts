// ============================================================================
// MODULE: World / Sound Engine
// DESIGN: Web Audio API synthesized procedural ambient and SFX sound engine (SRP)
// SUMMARY: Synthesizes ambient wind, water lapping, birdsong, footsteps, bow draw,
//          arrow releases, sword swings, combat impacts, and horse gallop audio.
// ============================================================================

// ======================== IMPORTS & TYPES ======================== \\
// #region Imports & Types
import { BiomeType } from './terrainMath';
import { type ILogger, NullLogger } from '../core/ILogger';
// #endregion

// ======================== SOUND ENGINE CLASS ======================== \\
// #region Sound Engine Class
/**
 * Summary: Nature sound engine.
 * Design: Standard class implementing domain specifications and behavioral contracts.
 */
export class NatureSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private waterGain: GainNode | null = null;
  private muted = false;
  private initialized = false;
  private noiseBuffer: AudioBuffer | null = null;
  private birdTimer = 0;

  public constructor(
    private readonly logger: ILogger = NullLogger.instance,
    public readonly randomSource: () => number = Math.random
  ) {}

  private _resumeContext(): void {
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
      void this.ctx.resume().catch((err: unknown) => {
        this.logger.warn('AudioContext resume deferred by browser autoplay policy', {
          error: String(err),
        });
      });
    }
  }

  public init() {
    if (this.initialized) {
      this._resumeContext();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.45;
      this.masterGain.connect(this.ctx.destination);

      // Create 2-second white/pink noise buffer
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = this.randomSource() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.950 * b2 + white * 0.048;
        data[i] = (b0 + b1 + b2 + white * 0.05) * 0.35;
      }

      // Ambient Forest Wind Loop
      const windSource = this.ctx.createBufferSource();
      windSource.buffer = this.noiseBuffer;
      windSource.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 380;
      windFilter.Q.value = 1.8;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.16;

      windSource.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      windSource.start();

      // Ambient Lake Water Lapping Loop
      const waterSource = this.ctx.createBufferSource();
      waterSource.buffer = this.noiseBuffer;
      waterSource.loop = true;

      const waterFilter = this.ctx.createBiquadFilter();
      waterFilter.type = 'lowpass';
      waterFilter.frequency.value = 620;

      this.waterGain = this.ctx.createGain();
      this.waterGain.gain.value = 0.05;

      waterSource.connect(waterFilter);
      waterFilter.connect(this.waterGain);
      this.waterGain.connect(this.masterGain);
      waterSource.start();

      this.initialized = true;
    } catch (err: unknown) {
      this.logger.warn('AudioContext initialization failed or audio unavailable in environment', {
        error: String(err),
      });
      this.initialized = false;
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.45, this.ctx.currentTime, 0.08);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setPaused(paused: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const target = paused || this.muted ? 0 : 0.45;
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  public updateAmbient(
    dt: number,
    playerX: number,
    playerZ: number,
    active: boolean,
    windStrength = 0.25,
    rainIntensity = 0.0,
    isNight = false,
    underRoof = false,
    birdProximity = 1.0
  ) {
    if (!this.initialized || !this.ctx || !active || this.muted) return;

    const shelterMuffle = underRoof ? 0.42 : 1.0;

    // Modulate wind/rain loop by weather windStrength & rainIntensity (muffled when under a roof)
    if (this.windGain) {
      const targetWind =
        Math.min(0.42, 0.10 + windStrength * 0.22 + rainIntensity * 0.14) * shelterMuffle;
      this.windGain.gain.setTargetAtTime(targetWind, this.ctx.currentTime, 0.25);
    }

    // Modulate water volume by proximity to lake center or waterfall or rain
    const lakeDist = Math.hypot(playerX - 2, playerZ - 2);
    const wfDist = Math.hypot(playerX + 42, playerZ + 30);
    const minWaterDist = Math.min(lakeDist, wfDist * 0.8);
    const waterProximity =
      Math.max(
        0.02 + rainIntensity * 0.15,
        Math.min(0.32, (1.0 - Math.min(1, Math.max(0, (minWaterDist - 12) / 38))) * 0.28)
      ) * shelterMuffle;
    if (this.waterGain) {
      this.waterGain.gain.setTargetAtTime(waterProximity, this.ctx.currentTime, 0.2);
    }

    // Occasional soft birdsong chirp ONLY during daytime, fair weather, outdoors, AND when close to birds/trees!
    if (!isNight && rainIntensity < 0.35 && !underRoof && birdProximity > 0.15) {
      this.birdTimer -= dt;
      if (this.birdTimer <= 0) {
        this.birdTimer = 4.0 + this.randomSource() * 6.0;
        this.playBirdChirp(birdProximity);
      }
    }
  }

  public playThunderRumble() {
    if (this.muted) return;
    if (!this.initialized) {
      this.init();
    }
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    this._resumeContext();
    const now = this.ctx.currentTime;

    // Stage 1: Sharp Electric Lightning Snap / Crack (0.0s -> 0.24s)
    const crackSrc = this.ctx.createBufferSource();
    crackSrc.buffer = this.noiseBuffer;
    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(1150, now);
    crackFilter.frequency.exponentialRampToValueAtTime(240, now + 0.22);
    crackFilter.Q.value = 1.4;
    const crackEnv = this.ctx.createGain();
    crackEnv.gain.setValueAtTime(0.01, now);
    crackEnv.gain.linearRampToValueAtTime(0.65, now + 0.012);
    crackEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    crackSrc.connect(crackFilter);
    crackFilter.connect(crackEnv);
    crackEnv.connect(this.masterGain);
    crackSrc.start(now, this.randomSource() * 0.4, 0.26);

    // Stage 2: Deep Booming Thunderclap + Sub-Bass Shockwave (0.02s -> 2.1s)
    const boomSrc = this.ctx.createBufferSource();
    boomSrc.buffer = this.noiseBuffer;
    boomSrc.loop = true;
    const boomFilter = this.ctx.createBiquadFilter();
    boomFilter.type = 'lowpass';
    boomFilter.frequency.setValueAtTime(240, now + 0.02);
    boomFilter.frequency.exponentialRampToValueAtTime(52, now + 1.9);
    const boomEnv = this.ctx.createGain();
    boomEnv.gain.setValueAtTime(0.001, now);
    boomEnv.gain.linearRampToValueAtTime(0.88, now + 0.07);
    boomEnv.gain.setValueAtTime(0.76, now + 0.32);
    boomEnv.gain.exponentialRampToValueAtTime(0.001, now + 2.05);
    boomSrc.connect(boomFilter);
    boomFilter.connect(boomEnv);
    boomEnv.connect(this.masterGain);
    boomSrc.start(now + 0.02);
    boomSrc.stop(now + 2.1);

    // Sub-bass resonant thunder punch oscillator
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(68, now + 0.02);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 1.45);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.42, now + 0.06);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now + 0.02);
    subOsc.stop(now + 1.55);

    // Stage 3: Rolling Mountain Echo Rumble (0.55s -> 3.4s)
    const echoSrc = this.ctx.createBufferSource();
    echoSrc.buffer = this.noiseBuffer;
    echoSrc.loop = true;
    const echoFilter = this.ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.setValueAtTime(135, now + 0.55);
    echoFilter.frequency.exponentialRampToValueAtTime(42, now + 3.3);
    const echoEnv = this.ctx.createGain();
    echoEnv.gain.setValueAtTime(0.001, now + 0.55);
    echoEnv.gain.linearRampToValueAtTime(0.46, now + 0.95);
    echoEnv.gain.exponentialRampToValueAtTime(0.001, now + 3.35);
    echoSrc.connect(echoFilter);
    echoFilter.connect(echoEnv);
    echoEnv.connect(this.masterGain);
    echoSrc.start(now + 0.55);
    echoSrc.stop(now + 3.4);
  }

  public playFootstep(biome: BiomeType, pitchScale = 1.0) {
    if (!this.initialized || !this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    const jitter = (0.92 + this.randomSource() * 0.16) * pitchScale;

    if (biome === 'water' || biome === 'shore') {
      filter.type = 'bandpass';
      filter.frequency.value = 950 * jitter;
      filter.Q.value = 1.2;
      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.22, now + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    } else if (biome === 'pier') {
      // Hollow wooden plank thud
      filter.type = 'lowpass';
      filter.frequency.value = 320 * jitter;
      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.26, now + 0.008);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    } else if (biome === 'bridge' || biome === 'rock') {
      // Crisp stone step
      filter.type = 'bandpass';
      filter.frequency.value = 1350 * jitter;
      filter.Q.value = 2.0;
      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.18, now + 0.006);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    } else {
      // Soft earth / grass rustle
      filter.type = 'bandpass';
      filter.frequency.value = 680 * jitter;
      filter.Q.value = 1.4;
      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.15, now + 0.012);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    }

    src.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);
    src.start(now, this.randomSource() * 1.2, 0.22);
  }

  private playBirdChirp(proximity = 1.0) {
    if (!this.ctx || !this.masterGain || this.muted || proximity <= 0.1) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = 2200 + this.randomSource() * 950;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.28, now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, now + 0.16);

    const peakVol = Math.max(0.005, Math.min(0.038, 0.038 * proximity));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakVol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playBowDraw() {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    this._resumeContext();
    const now = this.ctx.currentTime;

    // Subtle wooden bow limb creak + hemp string tension slide
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(245, now + 0.18);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playArrowShoot(drawPower = 1.0) {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    this._resumeContext();
    const now = this.ctx.currentTime;
    const p = Math.max(0.3, Math.min(1.0, drawPower));

    // 1) Crisp bowstring twang harmonic
    const twang = this.ctx.createOscillator();
    const twangGain = this.ctx.createGain();
    twang.type = 'sawtooth';
    twang.frequency.setValueAtTime(190 + p * 65, now);
    twang.frequency.exponentialRampToValueAtTime(92, now + 0.18);
    twangGain.gain.setValueAtTime(0.001, now);
    twangGain.gain.linearRampToValueAtTime(0.18 * p, now + 0.008);
    twangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    twang.connect(twangGain);
    twangGain.connect(this.masterGain);
    twang.start(now);
    twang.stop(now + 0.2);

    // 2) Feathered arrow air whoosh
    const whooshSrc = this.ctx.createBufferSource();
    whooshSrc.buffer = this.noiseBuffer;
    const whooshFilter = this.ctx.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.setValueAtTime(950, now);
    whooshFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.06);
    whooshFilter.frequency.exponentialRampToValueAtTime(620, now + 0.18);
    whooshFilter.Q.value = 1.6;
    const whooshGain = this.ctx.createGain();
    whooshGain.gain.setValueAtTime(0.001, now);
    whooshGain.gain.linearRampToValueAtTime(0.26 * p, now + 0.02);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    whooshSrc.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(this.masterGain);
    whooshSrc.start(now, this.randomSource() * 0.8, 0.22);
  }

  public playBowRelease(drawPower = 1.0) {
    this.playArrowShoot(drawPower);
  }

  public playSwordSwing(comboIndex = 0, isHeavy = false) {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    this._resumeContext();
    const now = this.ctx.currentTime;
    const pitchMod = isHeavy ? 0.76 : comboIndex === 1 ? 1.12 : comboIndex === 2 ? 0.92 : 1.0;
    const dur = isHeavy ? 0.36 : 0.23;

    // Metallic blade air-cleave whoosh + subtle steel ring
    const whooshSrc = this.ctx.createBufferSource();
    whooshSrc.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(640 * pitchMod, now);
    filter.frequency.exponentialRampToValueAtTime((isHeavy ? 2250 : 1920) * pitchMod, now + 0.09);
    filter.frequency.exponentialRampToValueAtTime(360 * pitchMod, now + dur);
    filter.Q.value = isHeavy ? 1.4 : 1.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(isHeavy ? 0.42 : 0.28, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    whooshSrc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    whooshSrc.start(now, this.randomSource() * 0.6, dur + 0.02);

    // Subtle steel harmonic ring along the fuller (plus deep air-wave resonance on heavy cleave!)
    const ring = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ring.type = isHeavy ? 'triangle' : 'sine';
    ring.frequency.setValueAtTime((isHeavy ? 1180 : 1480) * pitchMod, now + 0.02);
    ring.frequency.exponentialRampToValueAtTime((isHeavy ? 620 : 920) * pitchMod, now + dur);
    ringGain.gain.setValueAtTime(0.001, now + 0.02);
    ringGain.gain.linearRampToValueAtTime(isHeavy ? 0.085 : 0.045, now + 0.045);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    ring.connect(ringGain);
    ringGain.connect(this.masterGain);
    ring.start(now + 0.02);
    ring.stop(now + dur + 0.02);
  }

  public playSwordClash(isBlock = false) {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    this._resumeContext();
    const now = this.ctx.currentTime;

    // Crisp metallic steel-on-steel / spark clash ring
    const freqs = isBlock ? [1120, 1680] : [1360, 2140, 2890];
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freqs[i], now);
      osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.86, now + 0.18);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(isBlock ? 0.09 / (i + 1) : 0.14 / (i + 1), now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, now + (isBlock ? 0.16 : 0.24));
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  public playArrowHit(hitTarget = false) {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    // Solid thwack into straw/wood target or stone
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(hitTarget ? 185 : 140, now);
    thud.frequency.exponentialRampToValueAtTime(48, now + 0.11);
    thudGain.gain.setValueAtTime(0.001, now);
    thudGain.gain.linearRampToValueAtTime(hitTarget ? 0.34 : 0.2, now + 0.005);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.13);

    if (hitTarget) {
      // Rewarding resonant chime for hitting an archery bullseye target
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(587.33, now + 0.02); // D5
      chime.frequency.setValueAtTime(880.0, now + 0.09);  // A5
      chimeGain.gain.setValueAtTime(0.001, now + 0.02);
      chimeGain.gain.linearRampToValueAtTime(0.16, now + 0.04);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      chime.connect(chimeGain);
      chimeGain.connect(this.masterGain);
      chime.start(now + 0.02);
      chime.stop(now + 0.38);
    }
  }

  public playBirdFlockStartle(distance = 14) {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const atten = Math.max(0.12, Math.min(1.0, 1.0 - (distance - 6) / 32));

    // Rapid wing-flutter burst + chorus of startled bird calls
    for (let i = 0; i < 4; i++) {
      const delay = i * 0.065;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1150 + i * 220;
      filter.Q.value = 2.2;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.001, now + delay);
      env.gain.linearRampToValueAtTime(0.14 * atten, now + delay + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.075);
      src.connect(filter);
      filter.connect(env);
      env.connect(this.masterGain);
      src.start(now + delay, this.randomSource() * 0.8, 0.09);
    }

    this.playBirdChirp(atten);
  }

  public playCritterScamper(distance = 8) {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const atten = Math.max(0.15, Math.min(1.0, 1.0 - (distance - 3) / 18));

    // Quick foliage/brush rustle + soft woodland chitter
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1650, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 0.14);
    filter.Q.value = 1.8;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.16 * atten, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);
    src.start(now, this.randomSource() * 0.9, 0.2);
  }

  public dispose() {
    if (this.ctx) {
      void this.ctx.close().catch((err: unknown) => {
        this.logger.warn('AudioContext teardown error on dispose', {
          error: String(err),
        });
      });
      this.ctx = null;
    }
  }
}
// #endregion

