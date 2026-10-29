import React, { useState, useEffect, useRef } from 'react';
import { SoundscapeProject, ChannelTrack, AudioBusGroup } from './types/soundscape';
import { FACTORY_PRESETS } from './services/soundLibrary';
import { audioEngine } from './services/audioEngine';
import { youtubeManager } from './services/youtubeManager';
import { CloudStorageService } from './services/cloudStorage';
import { ShareService } from './services/shareService';
import { TopBar } from './components/TopBar';
import { ButterchurnVisualizer } from './components/ButterchurnVisualizer';
import { ChannelStrip } from './components/ChannelStrip';
import { MasterStrip } from './components/MasterStrip';
import { PresetsBar } from './components/PresetsBar';
import { SoundSearchModal } from './components/SoundSearchModal';
import { AISoundscapeModal } from './components/AISoundscapeModal';
import { GalleryModal } from './components/GalleryModal';
import { MultiVideoGrid } from './components/MultiVideoGrid';
import { SpatialRadarModal } from './components/SpatialRadarModal';
import { BinauralTunerModal } from './components/BinauralTunerModal';
import { GeminiSettingsModal } from './components/GeminiSettingsModal';
import { SleepTimerModal, TimerConfig } from './components/SleepTimerModal';
import { ZenModeView } from './components/ZenModeView';
import { YouTubePlayerEmbed } from './components/YouTubePlayerEmbed';
import { ErrorBoundary } from './components/ErrorBoundary';
import { VerifiedVideoLibrary } from './services/verifiedVideoLibrary';
import { GeminiKeyService } from './services/geminiKeyService';
import {
  Plus,
  Sparkles,
  FolderHeart,
  Layers,
  CheckCircle2,
  Youtube,
  LayoutGrid,
  Sliders,
  Compass,
  Brain,
  Keyboard,
  Key,
  Radio,
  Timer,
  Moon,
  Share2,
  Upload,
  Music,
  Folder,
  Disc,
  Trash2,
} from 'lucide-react';

export default function App() {
  // Initialize with last active project, or shared URL hash if present, or first factory preset
  const [activeProject, setActiveProject] = useState<SoundscapeProject>(() => {
    const shared = ShareService.getSharedProjectFromUrl();
    if (shared) return shared;

    const saved = CloudStorageService.getActiveProject();
    const isLegacyAnnoyingPreset =
      saved &&
      (saved.id === 'preset_youtube_cabin_rain' ||
        saved.channels.some((c) => c.soundKey === 'binaural_theta' || c.name.includes('Theta (6 Hz)')));
    const base = isLegacyAnnoyingPreset || !saved ? FACTORY_PRESETS[0] : saved;

    // Ensure all channels have active verified IDs
    const healedChannels = base.channels.map((ch) => {
      if (ch.type === 'youtube_video') {
        if (ch.youtubeVideoId === 'bJ9Rmk3J6TU' || ch.youtubeVideoId === 'mPZkdNFkN8A' || !ch.youtubeVideoId) {
          return { ...ch, youtubeVideoId: 'mPZkdNFkNps', youtubeThumbnail: 'https://img.youtube.com/vi/mPZkdNFkNps/hqdefault.jpg' };
        }
        if (ch.youtubeVideoId === 'sioZcOzfH-E') {
          return { ...ch, youtubeVideoId: '7BrIJrjxVxA', youtubeThumbnail: 'https://img.youtube.com/vi/7BrIJrjxVxA/hqdefault.jpg' };
        }
        if (ch.youtubeVideoId === 'mXw-K9Lh-0A') {
          return { ...ch, youtubeVideoId: 'd00VwBAoiF0', youtubeThumbnail: 'https://img.youtube.com/vi/d00VwBAoiF0/hqdefault.jpg' };
        }
        if (ch.youtubeVideoId === '9g81E6Oqf8E' || ch.youtubeVideoId === '1ZYbU8JGB4A') {
          return { ...ch, youtubeVideoId: 'By6zerfldXE', youtubeThumbnail: 'https://img.youtube.com/vi/By6zerfldXE/hqdefault.jpg' };
        }
        if (ch.youtubeVideoId === 'DWcJFNfaw9c') {
          return { ...ch, youtubeVideoId: 'DWcJFNfaw9c', youtubeThumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg' };
        }
      }
      return ch;
    });

    return { ...base, channels: healedChannels };
  });

  const [currentView, setCurrentView] = useState<'mixer' | 'multi_video' | 'zen'>('mixer');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isAiBalancing, setIsAiBalancing] = useState<boolean>(false);
  const [balanceNotice, setBalanceNotice] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSpatialRadarOpen, setIsSpatialRadarOpen] = useState(false);
  const [isBinauralTunerOpen, setIsBinauralTunerOpen] = useState(false);
  const [isGeminiSettingsOpen, setIsGeminiSettingsOpen] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<{
    trackId: string;
    trackName: string;
    initialTab?: 'ai_replace' | 'youtube_live' | 'catalog' | 'youtube_direct' | 'web_url';
  } | null>(null);
  const [isDraggingOverMixer, setIsDraggingOverMixer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Timer state
  const [activeTimer, setActiveTimer] = useState<{
    isActive: boolean;
    mode: 'sleep' | 'pomodoro';
    remainingSeconds: number;
    totalSeconds: number;
    fadeOutSeconds: number;
    pomodoroBreakSeconds: number;
    isPomodoroBreak?: boolean;
    soundAlert: boolean;
  } | null>(null);

  const handleOpenReplace = (
    trackId: string,
    trackName: string,
    initialTab?: 'ai_replace' | 'youtube_live' | 'catalog' | 'youtube_direct' | 'web_url'
  ) => {
    setReplaceTarget({ trackId, trackName, initialTab });
    setIsSearchOpen(true);
  };

  // Initial sync of master levels to audio engine and youtube manager
  useEffect(() => {
    audioEngine.setMasterVolume(activeProject.masterVolume ?? 0.85);
    youtubeManager.setMasterVolume(activeProject.masterVolume ?? 0.85);
    audioEngine.setMasterReverb(activeProject.masterReverb ?? 0.3);
    audioEngine.setMasterFilterCutoff(activeProject.masterFilter ?? 20000);
  }, []);

  // Global tactile keyboard shortcuts for studio workflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in form inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'Escape') {
        handleGlobalStop();
        setIsSearchOpen(false);
        setIsAiModalOpen(false);
        setIsGalleryOpen(false);
        setIsSpatialRadarOpen(false);
        setIsBinauralTunerOpen(false);
        setIsTimerModalOpen(false);
        setCurrentView((prev) => (prev === 'zen' ? 'mixer' : prev));
      } else if (e.key === 'v' || e.key === 'V') {
        setCurrentView((prev) => (prev === 'mixer' ? 'multi_video' : 'mixer'));
      } else if (e.key === 'z' || e.key === 'Z') {
        setCurrentView((prev) => (prev === 'zen' ? 'mixer' : 'zen'));
      } else if (e.key === 't' || e.key === 'T') {
        setIsTimerModalOpen((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        setIsSpatialRadarOpen((prev) => !prev);
      } else if (e.key === 'b' || e.key === 'B') {
        setIsBinauralTunerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Timer Tick Engine: Handles sleep timer fade-out and Pomodoro intervals
  useEffect(() => {
    if (!activeTimer?.isActive) return;

    const timerInterval = setInterval(() => {
      setActiveTimer((prev) => {
        if (!prev || !prev.isActive) return null;

        const nextRemaining = prev.remainingSeconds - 1;

        // Logarithmic volume fade-out during the final minutes of Sleep Mode
        if (prev.mode === 'sleep' && prev.fadeOutSeconds > 0) {
          if (nextRemaining <= prev.fadeOutSeconds && nextRemaining > 0) {
            const ratio = Math.max(0.02, nextRemaining / prev.fadeOutSeconds);
            const attenuated = activeProject.masterVolume * Math.pow(ratio, 1.4);
            audioEngine.setMasterVolume(attenuated);
          }
        }

        if (nextRemaining <= 0) {
          // Timer finished
          if (prev.mode === 'sleep') {
            handleGlobalStop();
            audioEngine.setMasterVolume(activeProject.masterVolume);
            setToastNotice('🌙 Sesión de descanso finalizada: la suite se ha detenido suavemente.');
            setTimeout(() => setToastNotice(null), 6000);
            return null;
          } else {
            // Pomodoro mode interval switch
            if (prev.soundAlert) {
              audioEngine.playGentleChime(prev.isPomodoroBreak ? 528 : 432);
            }
            const nextIsBreak = !prev.isPomodoroBreak;
            const nextDuration = nextIsBreak ? prev.pomodoroBreakSeconds : prev.totalSeconds;
            setToastNotice(
              nextIsBreak
                ? '☕ ¡Bloque de concentración completado! Inicia el descanso.'
                : '🔥 ¡Descanso terminado! Volviendo al bloque de enfoque profundo.'
            );
            setTimeout(() => setToastNotice(null), 5000);

            return {
              ...prev,
              isPomodoroBreak: nextIsBreak,
              remainingSeconds: nextDuration,
            };
          }
        }

        return {
          ...prev,
          remainingSeconds: nextRemaining,
        };
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [activeTimer, activeProject.masterVolume]);

  const handleStartTimer = (config: TimerConfig) => {
    setActiveTimer({
      isActive: true,
      mode: config.mode,
      remainingSeconds: config.durationMinutes * 60,
      totalSeconds: config.durationMinutes * 60,
      fadeOutSeconds: config.fadeOutMinutes * 60,
      pomodoroBreakSeconds: config.pomodoroBreakMinutes * 60,
      soundAlert: config.soundAlert,
      isPomodoroBreak: false,
    });

    if (!isPlaying) {
      handleTogglePlay();
    }

    setToastNotice(
      config.mode === 'sleep'
        ? `🌙 Temporizador de apagado configurado para ${config.durationMinutes} min (Fade-out en últimos ${config.fadeOutMinutes} min)`
        : `🔥 Modo Pomodoro iniciado (${config.durationMinutes} min enfoque / ${config.pomodoroBreakMinutes} min descanso)`
    );
    setTimeout(() => setToastNotice(null), 4500);
  };

  const handleCancelTimer = () => {
    setActiveTimer(null);
    audioEngine.setMasterVolume(activeProject.masterVolume);
    setToastNotice('Temporizador desactivado.');
    setTimeout(() => setToastNotice(null), 3000);
  };

  const handleShareMix = async () => {
    const url = ShareService.generateShareUrl(activeProject);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setToastNotice('🔗 ¡Enlace de tu paisaje sonoro copiado al portapapeles!');
      setTimeout(() => setToastNotice(null), 4000);
    } catch (err) {
      console.error('Error al copiar enlace:', err);
    }
  };

  // Local audio file importer (via Drag & Drop or file dialog)
  const handleImportLocalAudioFiles = (files: File[]) => {
    const audioFiles = files.filter(
      (f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(f.name)
    );
    if (audioFiles.length === 0) return;

    audioFiles.forEach((file, idx) => {
      const objectUrl = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const newTrack: ChannelTrack = {
        id: `local_audio_${Date.now()}_${idx}`,
        name: cleanName,
        soundKey: `local_${Date.now()}_${idx}`,
        type: 'audio_url',
        sourceUrl: objectUrl,
        volume: 0.7,
        pan: 0,
        filterCutoff: 18000,
        filterType: 'lowpass',
        filterQ: 1.0,
        reverbSend: 0.25,
        delaySend: 0.1,
        tapeWarmth: 0.15,
        muted: false,
        solo: false,
        playbackRate: 1.0,
        loop: true,
        category: 'Atmosférico',
        color: '#10B981',
        role: 'Audio Local de Usuario',
        isLocalFile: true,
      };
      handleAddTrack(newTrack);
    });

    setToastNotice(`🎧 Se añadieron ${audioFiles.length} pista(s) de audio local al mezclador.`);
    setTimeout(() => setToastNotice(null), 4000);
  };

  // Sync active project state to localStorage on modification
  useEffect(() => {
    CloudStorageService.saveActiveProject(activeProject);
  }, [activeProject]);

  // Synchronize audio channels with Web Audio Engine and YouTube Manager
  const hasAnySolo = activeProject.channels.some((t) => t.solo);
  const hasAnyBusSolo = (activeProject.buses || []).some((b) => b.solo);

  useEffect(() => {
    activeProject.channels.forEach((track) => {
      const assignedBus = activeProject.buses?.find((b) => b.id === track.busId);
      const isBusMuted = assignedBus?.muted || false;
      const isBusSoloBlocked = hasAnyBusSolo && !assignedBus?.solo && !track.solo;
      const isSoloBlocked = (hasAnySolo && !track.solo) || isBusSoloBlocked;
      const busVolMult = assignedBus ? assignedBus.volume : 1.0;

      if (track.type === 'youtube_video') {
        youtubeManager.updateVolume(
          track.id,
          track.volume * busVolMult,
          activeProject.masterVolume,
          track.muted || isBusMuted,
          isSoloBlocked
        );
      }
      // Always sync to audioEngine so masterAnalyser captures the entire mix spectrum
      audioEngine.syncChannel(track, activeProject.channels, activeProject.buses);
    });
  }, [activeProject.channels, activeProject.masterVolume, activeProject.buses, hasAnySolo, hasAnyBusSolo]);

  // Synchronize master nodes
  useEffect(() => {
    audioEngine.setMasterVolume(activeProject.masterVolume);
  }, [activeProject.masterVolume]);

  useEffect(() => {
    audioEngine.setMasterReverb(activeProject.masterReverb);
  }, [activeProject.masterReverb]);

  useEffect(() => {
    audioEngine.setMasterFilterCutoff(activeProject.masterFilter);
  }, [activeProject.masterFilter]);

  // Master Play / Pause Toggle for Web Audio + all YouTube Videos
  const handleTogglePlay = async () => {
    if (isPlaying) {
      audioEngine.pauseAll();
      youtubeManager.pauseAll();
      setIsPlaying(false);
    } else {
      await audioEngine.startAll();
      youtubeManager.playAll();
      setIsPlaying(true);
    }
  };

  // Global STOP for the whole suite (halts and rewinds all Web Audio and YouTube videos to 0)
  const handleGlobalStop = () => {
    audioEngine.stopAll();
    youtubeManager.stopAll();
    setIsPlaying(false);
  };

  // Switch Soundscape Project
  const handleLoadProject = (newProject: SoundscapeProject) => {
    // Remove previous audio channels and YouTube players
    audioEngine.removeAllChannels();
    youtubeManager.unregisterAll();

    setActiveProject(newProject);

    // Sync master effects and master volume
    audioEngine.setMasterVolume(newProject.masterVolume ?? 0.85);
    youtubeManager.setMasterVolume(newProject.masterVolume ?? 0.85);
    audioEngine.setMasterReverb(newProject.masterReverb ?? 0.3);
    audioEngine.setMasterFilterCutoff(newProject.masterFilter ?? 20000);

    // Sync new channels (both Web Audio synths, drones, MIDI and YouTube trackers)
    newProject.channels.forEach((track) => {
      audioEngine.syncChannel(track, newProject.channels, newProject.buses);
    });

    if (isPlaying) {
      audioEngine.startAll();
      youtubeManager.playAll();
    }
  };

  // Update a specific channel
  const handleUpdateChannel = (channelId: string, updated: Partial<ChannelTrack>) => {
    setActiveProject((prev) => {
      const nextChannels = prev.channels.map((ch) =>
        ch.id === channelId ? { ...ch, ...updated } : ch
      );
      const target = nextChannels.find((ch) => ch.id === channelId);
      if (target) {
        audioEngine.syncChannel(target, nextChannels, prev.buses);

        // Calculate effective bus multiplier for YouTube volume
        let busMultiplier = 1.0;
        if (target.busId && prev.buses) {
          const bus = prev.buses.find((b) => b.id === target.busId);
          if (bus) {
            if (bus.muted) busMultiplier = 0;
            else busMultiplier = bus.volume;
          }
        }
        if (target.type === 'youtube_video') {
          const effectiveVol = (target.muted ? 0 : target.volume) * busMultiplier;
          youtubeManager.setVolume(target.id, effectiveVol);
        }
      }
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        channels: nextChannels,
      };
    });
  };

  // Remove channel
  const handleRemoveChannel = (channelId: string) => {
    audioEngine.removeChannel(channelId);
    youtubeManager.unregisterPlayer(channelId);
    setActiveProject((prev) => ({
      ...prev,
      channels: prev.channels.filter((ch) => ch.id !== channelId),
    }));
  };

  // Add new track from search or custom YouTube URL
  const handleAddTrack = (track: ChannelTrack) => {
    setActiveProject((prev) => {
      const nextChannels = [...prev.channels, track];
      audioEngine.syncChannel(track, nextChannels, prev.buses);
      return {
        ...prev,
        channels: nextChannels,
      };
    });
  };

  // Bus Group Handlers
  const handleAddBus = () => {
    const defaultColors = ['#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6'];
    const currentBuses = activeProject.buses || [];
    const busNum = currentBuses.length + 1;
    const newBus: AudioBusGroup = {
      id: `bus_${Date.now()}`,
      name: `Grupo ${busNum}`,
      color: defaultColors[(busNum - 1) % defaultColors.length],
      volume: 0.85,
      muted: false,
      solo: false,
      collapsed: false,
    };
    setActiveProject((prev) => ({
      ...prev,
      buses: [...(prev.buses || []), newBus],
    }));
    setToastNotice(`📁 Nuevo grupo creado: "${newBus.name}". Puedes asignar canales a este bus.`);
    setTimeout(() => setToastNotice(null), 4000);
  };

  const handleUpdateBus = (busId: string, updates: Partial<AudioBusGroup>) => {
    setActiveProject((prev) => {
      const nextBuses = (prev.buses || []).map((b) => (b.id === busId ? { ...b, ...updates } : b));
      // Re-sync all channels associated with or affected by bus updates (solo/mute/volume)
      prev.channels.forEach((ch) => {
        audioEngine.syncChannel(ch, prev.channels, nextBuses);
        if (ch.type === 'youtube_video') {
          let busMul = 1.0;
          if (ch.busId) {
            const b = nextBuses.find((x) => x.id === ch.busId);
            if (b) {
              if (b.muted) busMul = 0;
              else busMul = b.volume;
            }
          }
          youtubeManager.setVolume(ch.id, (ch.muted ? 0 : ch.volume) * busMul);
        }
      });
      return {
        ...prev,
        buses: nextBuses,
      };
    });
  };

  const handleRemoveBus = (busId: string) => {
    setActiveProject((prev) => ({
      ...prev,
      buses: (prev.buses || []).filter((b) => b.id !== busId),
      channels: prev.channels.map((ch) => (ch.busId === busId ? { ...ch, busId: undefined } : ch)),
    }));
    setToastNotice('Bus eliminado. Sus canales han sido reasignados al Máster directo.');
    setTimeout(() => setToastNotice(null), 3000);
  };

  // Add Generative MIDI Instrument Channel
  const handleAddMidiTrack = () => {
    const newTrack: ChannelTrack = {
      id: `midi_${Date.now()}`,
      name: 'Teclado Rhodes Generativo',
      soundKey: 'midi_random_chords',
      type: 'midi_random',
      midiSoundPreset: 'rhodes',
      midiScale: 'pentatonic_minor',
      midiPlayMode: 'chords',
      midiBpm: 72,
      midiDensity: 0.6,
      volume: 0.75,
      pan: 0,
      reverbSend: 0.35,
      delaySend: 0.15,
      filterCutoff: 16000,
      filterType: 'lowpass',
      filterQ: 1.0,
      playbackRate: 1.0,
      loop: true,
      muted: false,
      solo: false,
      color: '#F59E0B',
      category: 'Instrumento MIDI',
      role: 'Acordes Generativos',
    };
    handleAddTrack(newTrack);
    setToastNotice('🎹 Canal de MIDI Random añadido a la mezcla.');
    setTimeout(() => setToastNotice(null), 3000);
  };

  // Add Configurable Ambient Drone Channel
  const handleAddDroneTrack = () => {
    const newTrack: ChannelTrack = {
      id: `drone_${Date.now()}`,
      name: 'Drone Pad Cálido Analógico',
      soundKey: 'drone_ambient_synth',
      type: 'drone_ambient',
      droneRootNote: 'D',
      droneOctave: 2,
      droneTexture: 'warm_pad',
      droneDetune: 3,
      droneWarmth: 0.3,
      volume: 0.7,
      pan: 0,
      reverbSend: 0.45,
      delaySend: 0.2,
      filterCutoff: 3800,
      filterType: 'lowpass',
      filterQ: 1.2,
      playbackRate: 1.0,
      loop: true,
      muted: false,
      solo: false,
      color: '#8B5CF6',
      category: 'Drone Armónico',
      role: 'Cimiento / Tono Raíz',
    };
    handleAddTrack(newTrack);
    setToastNotice('🪐 Canal de Drone Ambient añadido a la mezcla.');
    setTimeout(() => setToastNotice(null), 3000);
  };

  // Quick synth generator adder
  const handleAddQuickSynth = (synthType: 'brown_noise' | 'pink_noise' | 'binaural_alpha' = 'brown_noise') => {
    const isBrown = synthType === 'brown_noise';
    const newTrack: ChannelTrack = {
      id: `synth_${Date.now()}`,
      name: isBrown ? 'Ruido Marrón Profundo' : 'Ondas Alfa 10Hz',
      soundKey: isBrown ? 'brown_noise' : 'binaural_alpha',
      type: 'synthesizer',
      synthType,
      volume: 0.65,
      pan: 0,
      reverbSend: 0.3,
      filterCutoff: 12000,
      filterType: 'lowpass',
      filterQ: 1.0,
      muted: false,
      solo: false,
      playbackRate: 1.0,
      loop: true,
      color: isBrown ? '#06B6D4' : '#8B5CF6',
      category: isBrown ? 'Generador' : 'Binaural',
      role: 'Textura Acústica',
    };
    handleAddTrack(newTrack);
  };

  // AI Acoustic Balance Master
  const handleTriggerAiBalance = async () => {
    if (activeProject.channels.length === 0) return;
    setIsAiBalancing(true);
    setBalanceNotice(null);

    try {
      const res = await fetch('/api/gemini/balance-mix', {
        method: 'POST',
        headers: GeminiKeyService.getAuthHeaders(),
        body: JSON.stringify({
          channels: activeProject.channels.map((ch) => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            role: ch.role || ch.category,
            currentVolume: ch.volume,
            currentPan: ch.pan,
            currentFilterCutoff: ch.filterCutoff,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const { balancedChannels, engineerAnalysis } = data.data;

        setActiveProject((prev) => {
          const updated = prev.channels.map((ch) => {
            const match = balancedChannels.find((b: any) => b.id === ch.id);
            if (match) {
              return {
                ...ch,
                volume: typeof match.volume === 'number' ? match.volume : ch.volume,
                pan: typeof match.pan === 'number' ? match.pan : ch.pan,
                filterCutoff: typeof match.filterCutoff === 'number' ? match.filterCutoff : ch.filterCutoff,
                reverbSend: typeof match.reverbSend === 'number' ? match.reverbSend : ch.reverbSend,
              };
            }
            return ch;
          });
          return { ...prev, channels: updated };
        });

        setBalanceNotice(engineerAnalysis || 'Mezcla espacial optimizada por el Ingeniero Acústico IA.');
        setTimeout(() => setBalanceNotice(null), 8000);
      }
    } catch (err) {
      console.error('Error al balancear mezcla:', err);
    } finally {
      setIsAiBalancing(false);
    }
  };

  const handleSaveCurrentAsNew = (name: string, description: string) => {
    const newSaved: SoundscapeProject = {
      ...activeProject,
      id: `saved_${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPreset: false,
    };
    CloudStorageService.saveProjectToGallery(newSaved);
    setActiveProject(newSaved);
  };

  const youtubeVideoCount = activeProject.channels.filter(
    (t) => t.type === 'youtube_video'
  ).length;

  const totalVideoCount = activeProject.channels.filter(
    (t) => t.type === 'youtube_video' || t.type === 'video_url'
  ).length;

  // Theme color mapping
  const themeColors: Record<string, string> = {
    cyan: '#06B6D4',
    amber: '#F59E0B',
    emerald: '#10B981',
    violet: '#8B5CF6',
    sky: '#0284C7',
    rose: '#F43F5E',
  };
  const activeColor = themeColors[activeProject.visualTheme] || '#F43F5E';

  // Mouse wheel horizontal scroll handler for channel strip rack
  const handleRackWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && !e.shiftKey) {
      e.currentTarget.scrollLeft += e.deltaY * 0.85;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-clip">
      {/* 3-Zone Top Bar with Global Play/Stop Transport */}
      <TopBar
        currentView={currentView}
        videoCount={youtubeVideoCount}
        isPlaying={isPlaying}
        activeTimer={activeTimer}
        onTogglePlay={handleTogglePlay}
        onGlobalStop={handleGlobalStop}
        onSetView={setCurrentView}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenAiGenerator={() => setIsAiModalOpen(true)}
        onOpenSleepTimer={() => setIsTimerModalOpen(true)}
        onShareMix={handleShareMix}
        onOpenGeminiSettings={() => setIsGeminiSettingsOpen(true)}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 py-3 space-y-3">
        {/* Workspace Command Strip & Active Preset Selector */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-lg">
          {/* Left: Active Project Title & Preset Quick Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeColor }} />
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate max-w-xs sm:max-w-md">
                {activeProject.name}
              </h1>
            </div>

            {/* Quick Preset Selector Dropdown */}
            <select
              value={activeProject.id}
              onChange={(e) => {
                const found = FACTORY_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleLoadProject(found);
              }}
              className="text-[11px] font-medium bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-cyan-300 hover:border-cyan-500/50 focus:outline-none cursor-pointer"
            >
              {FACTORY_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>

            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              · {activeProject.channels.length} canales ({youtubeVideoCount} YouTube)
            </span>
          </div>

          {/* Right: View Switcher & Action Tools */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {/* View Switcher: Consola vs Multi-Video vs Modo Zen */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setCurrentView('mixer')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  currentView === 'mixer'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Mezclador</span>
              </button>
              <button
                onClick={() => setCurrentView('multi_video')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  currentView === 'multi_video'
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Multi-Video ({totalVideoCount})</span>
              </button>
              <button
                onClick={() => setCurrentView('zen')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  currentView === 'zen'
                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Santuario inmersivo a pantalla completa (Atajo: Z)"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Modo Zen</span>
              </button>
            </div>

            {/* Spatial & Binaural Tools */}
            <button
              onClick={() => setIsSpatialRadarOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1 cursor-pointer"
              title="Posicionador Acústico 2D Holofónico (Atajo: R)"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Radar</span>
            </button>

            <button
              onClick={() => setIsBinauralTunerOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-violet-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1 cursor-pointer"
              title="Sintonizador de Ondas Cerebrales (Atajo: B)"
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Binaural</span>
            </button>

            <button
              onClick={() => setIsGalleryOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-pink-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1 cursor-pointer"
              title="Galería y Biblioteca en la Nube"
            >
              <FolderHeart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Galería</span>
            </button>

            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Crear con IA</span>
            </button>
          </div>
        </div>

        {/* AI Balance Notice */}
        {balanceNotice && (
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 text-xs flex items-center gap-2 animate-fade-in shadow-md">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{balanceNotice}</span>
          </div>
        )}

        {/* Master Real-time GPU WebGL MilkDrop Visualizer */}
        {currentView !== 'zen' && (
          <section aria-label="Visualizador Acústico GPU Nvidia MilkDrop Maestro">
            <ButterchurnVisualizer
              isPlaying={isPlaying}
              masterVolume={activeProject.masterVolume}
              tracks={activeProject.channels}
            />
          </section>
        )}

        {/* View 1: Multi-Video Screen Grid (When user wants to watch all YouTube videos together) */}
        {currentView === 'multi_video' && (
          <section aria-label="Mosaico Multi-Video">
            <MultiVideoGrid
              tracks={activeProject.channels}
              masterVolume={activeProject.masterVolume}
              isPlaying={isPlaying}
              hasAnySolo={hasAnySolo}
              onUpdateTrack={(id, upd) => handleUpdateChannel(id, upd)}
              onRemoveTrack={handleRemoveChannel}
              onOpenAddModal={() => setIsSearchOpen(true)}
              onOpenReplace={handleOpenReplace}
            />
          </section>
        )}

        {/* View 2: Multi-Channel Mixing Console (Channel Strips + Master Strip) */}
        {currentView === 'mixer' && (
          <section aria-label="Consola Mezcladora Multicanal" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Canales y Pistas en Mezcla ({activeProject.channels.length})
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAddBus}
                  className="text-xs font-semibold text-cyan-300 hover:text-white bg-slate-900/90 hover:bg-cyan-950/60 border border-slate-700/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Crear un nuevo grupo/bus para agrupar elementos sonoros"
                >
                  <Folder className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+ Grupo / Bus</span>
                </button>

                <button
                  onClick={handleAddMidiTrack}
                  className="text-xs font-semibold text-amber-300 hover:text-white bg-slate-900/90 hover:bg-amber-950/60 border border-slate-700/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Añadir instrumento de acordes y notas MIDI generativo"
                >
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Canal MIDI</span>
                </button>

                <button
                  onClick={handleAddDroneTrack}
                  className="text-xs font-semibold text-indigo-300 hover:text-white bg-slate-900/90 hover:bg-indigo-950/60 border border-slate-700/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Añadir textura de drone ambient tonal armónico"
                >
                  <Disc className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ Canal Drone</span>
                </button>

                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-rose-400" />
                  <span>+ Video o Sonido</span>
                </button>
              </div>
            </div>

            {/* Bus Groups Ribbon Toolbar (Folders / Submixes) */}
            {activeProject.buses && activeProject.buses.length > 0 && (
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 backdrop-blur-md flex items-center gap-2 overflow-x-auto shadow-md">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 shrink-0 px-1 border-r border-slate-800 pr-2.5">
                  <Folder className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Buses ({activeProject.buses.length})</span>
                </div>

                {activeProject.buses.map((bus) => {
                  const channelCount = activeProject.channels.filter((c) => c.busId === bus.id).length;
                  return (
                    <div
                      key={bus.id}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 shrink-0 transition-all shadow-sm"
                    >
                      {/* Color dot */}
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px]"
                        style={{ backgroundColor: bus.color, boxShadow: `0 0 8px ${bus.color}` }}
                      />

                      {/* Bus Name editable */}
                      <input
                        type="text"
                        value={bus.name}
                        onChange={(e) => handleUpdateBus(bus.id, { name: e.target.value })}
                        className="bg-transparent text-xs font-bold text-slate-200 hover:text-white focus:outline-none w-24 truncate cursor-pointer"
                        title="Nombre del bus (haz clic para editar)"
                      />

                      {/* Track count */}
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {channelCount} pist.
                      </span>

                      {/* Bus Volume */}
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={1.2}
                          step={0.01}
                          value={bus.volume}
                          onChange={(e) => handleUpdateBus(bus.id, { volume: parseFloat(e.target.value) })}
                          className="w-16 accent-cyan-400 cursor-pointer h-1 bg-slate-800 rounded-lg"
                          title={`Volumen del Bus: ${Math.round(bus.volume * 100)}%`}
                        />
                        <span className="text-[8px] font-mono text-slate-400 w-6 text-right">
                          {Math.round(bus.volume * 100)}%
                        </span>
                      </div>

                      {/* Bus Solo & Mute */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleUpdateBus(bus.id, { solo: !bus.solo })}
                          className={`w-4 h-4 rounded text-[8px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                            bus.solo
                              ? 'bg-amber-400 text-slate-950 font-extrabold shadow-[0_0_6px_#FBBF24]'
                              : 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
                          }`}
                          title="Solo de Bus"
                        >
                          S
                        </button>
                        <button
                          onClick={() => handleUpdateBus(bus.id, { muted: !bus.muted })}
                          className={`w-4 h-4 rounded text-[8px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                            bus.muted
                              ? 'bg-rose-500 text-white font-extrabold shadow-[0_0_6px_#F43F5E]'
                              : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
                          }`}
                          title="Mute de Bus"
                        >
                          M
                        </button>
                      </div>

                      {/* Toggle Collapse */}
                      <button
                        onClick={() => handleUpdateBus(bus.id, { collapsed: !bus.collapsed })}
                        className={`p-1 rounded text-[9px] transition-colors cursor-pointer ${
                          bus.collapsed
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={bus.collapsed ? 'Expandir pistas del grupo' : 'Plegar/ocultar pistas del grupo'}
                      >
                        <Folder className={`w-3 h-3 ${bus.collapsed ? 'fill-cyan-400/40 text-cyan-400' : ''}`} />
                      </button>

                      {/* Remove Bus */}
                      <button
                        onClick={() => handleRemoveBus(bus.id)}
                        className="text-slate-600 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                        title="Eliminar grupo/bus (las pistas vuelven al Máster)"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mixer Console Surface */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverMixer(true);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDraggingOverMixer(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOverMixer(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleImportLocalAudioFiles(Array.from(e.dataTransfer.files));
                }
              }}
              className={`relative p-3 sm:p-4 rounded-2xl bg-slate-950/90 border shadow-2xl transition-all ${
                isDraggingOverMixer
                  ? 'border-cyan-400 bg-cyan-950/20 ring-2 ring-cyan-500/40'
                  : 'border-slate-800'
              }`}
            >
              {isDraggingOverMixer && (
                <div className="absolute inset-0 z-30 rounded-2xl bg-slate-950/90 backdrop-blur-md border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
                  <div className="p-3 rounded-full bg-cyan-500/20 text-cyan-300 mb-2">
                    <Upload className="w-8 h-8 animate-bounce" />
                  </div>
                  <h3 className="text-base font-bold text-white">Suelta tus archivos de audio aquí</h3>
                  <p className="text-xs text-cyan-200 mt-1">
                    Se añadirán automáticamente como canales de audio multicanal con DSP (.mp3, .wav, .flac, .ogg)
                  </p>
                </div>
              )}

              <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-start w-full min-w-0">
                {/* Channel Strips Rack (Scrolls horizontally with smooth padding) */}
                <div
                  onWheel={handleRackWheel}
                  className="flex-1 w-full min-w-0 overflow-x-auto pb-3 pt-0.5 custom-scroll overscroll-x-contain touch-pan-x"
                >
                  <div className="flex items-start gap-3 min-w-max pr-3 pl-0.5">
                    {activeProject.channels.length === 0 ? (
                      <div className="w-80 h-[480px] flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3 border border-dashed border-slate-800 rounded-xl">
                        <p className="text-sm">No hay canales en la mezcla actual.</p>
                        <button
                          onClick={() => setIsSearchOpen(true)}
                          className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Añadir primer video de YouTube o sonido
                        </button>
                      </div>
                    ) : (
                      <>
                        <ErrorBoundary fallbackTitle="Canales de la Consola">
                          {activeProject.channels
                            .filter((track) => {
                              const b = activeProject.buses?.find((bus) => bus.id === track.busId);
                              return !b?.collapsed;
                            })
                            .map((track, idx) => (
                              <ChannelStrip
                                key={track.id}
                                track={track}
                                trackIndex={idx + 1}
                                masterVolume={activeProject.masterVolume}
                                hasAnySolo={hasAnySolo}
                                isPlaying={isPlaying}
                                buses={activeProject.buses}
                                onUpdate={(updated) => handleUpdateChannel(track.id, updated)}
                                onRemove={() => handleRemoveChannel(track.id)}
                                onOpenReplace={handleOpenReplace}
                              />
                            ))}
                        </ErrorBoundary>

                        {/* Botón + Añadir Canal */}
                        <div className="w-56 sm:w-60 md:w-64 shrink-0 rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-900/70 transition-all p-3 flex flex-col items-center justify-center text-center group shadow-lg min-h-[280px]">
                          <button
                            onClick={() => setIsSearchOpen(true)}
                            className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/80 group-hover:border-cyan-400 group-hover:bg-cyan-950/50 flex items-center justify-center mb-2 transition-all shadow-md group-hover:scale-105 cursor-pointer"
                            title="Añadir nuevo canal"
                          >
                            <Plus className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                          </button>
                          <h4 className="text-[11px] font-bold text-slate-200 group-hover:text-white uppercase tracking-wider mb-1">
                            Añadir Canal
                          </h4>
                          <p className="text-[9px] text-slate-400 mb-3 px-1 leading-relaxed">
                            Añade un video de YouTube, instrumento o textura.
                          </p>
                          <div className="flex flex-col gap-1.5 w-full">
                            <button
                              onClick={() => setIsSearchOpen(true)}
                              className="w-full py-1 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[9px] flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                            >
                              <Youtube className="w-3 h-3" />
                              <span>YouTube</span>
                            </button>
                            <button
                              onClick={handleAddMidiTrack}
                              className="w-full py-1 px-2 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white font-semibold text-[9px] flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                            >
                              <Music className="w-3 h-3" />
                              <span>🎹 MIDI Random</span>
                            </button>
                            <button
                              onClick={handleAddDroneTrack}
                              className="w-full py-1 px-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-[9px] flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                            >
                              <Disc className="w-3 h-3" />
                              <span>🪐 Drone Ambient</span>
                            </button>
                            <button
                              onClick={() => handleAddQuickSynth('brown_noise')}
                              className="w-full py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 font-medium text-[9px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Radio className="w-3 h-3 text-cyan-400" />
                              <span>+ Sintetizador</span>
                            </button>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 font-medium text-[9px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Importar archivo .mp3, .wav, .flac desde tu equipo"
                            >
                              <Upload className="w-3 h-3 text-emerald-400" />
                              <span>+ Audio Local</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Master Strip Console (Docked on Right on Desktop, Centered on Mobile/Tablet) */}
                <div className="w-full lg:w-auto shrink-0 flex justify-center lg:justify-start self-start">
                  <MasterStrip
                    tracks={activeProject.channels}
                    masterVolume={activeProject.masterVolume}
                    masterReverb={activeProject.masterReverb}
                    masterFilter={activeProject.masterFilter}
                    isPlaying={isPlaying}
                    isAiBalancing={isAiBalancing}
                    onVolumeChange={(masterVolume) => {
                      audioEngine.setMasterVolume(masterVolume);
                      youtubeManager.setMasterVolume(masterVolume);
                      setActiveProject((p) => ({ ...p, masterVolume }));
                    }}
                    onReverbChange={(masterReverb) => {
                      audioEngine.setMasterReverb(masterReverb);
                      setActiveProject((p) => ({ ...p, masterReverb }));
                    }}
                    onFilterChange={(masterFilter) => {
                      audioEngine.setMasterFilterCutoff(masterFilter);
                      setActiveProject((p) => ({ ...p, masterFilter }));
                    }}
                    onTogglePlay={handleTogglePlay}
                    onGlobalStop={handleGlobalStop}
                    onTriggerAiBalance={handleTriggerAiBalance}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* View 3: Fullscreen Zen Mode (Sanctuary) */}
        {currentView === 'zen' && (
          <ZenModeView
            project={activeProject}
            isPlaying={isPlaying}
            masterVolume={activeProject.masterVolume}
            activeTimer={activeTimer}
            onTogglePlay={handleTogglePlay}
            onVolumeChange={(masterVolume) => {
              audioEngine.setMasterVolume(masterVolume);
              youtubeManager.setMasterVolume(masterVolume);
              setActiveProject((p) => ({ ...p, masterVolume }));
            }}
            onOpenTimerModal={() => setIsTimerModalOpen(true)}
            onExitZen={() => setCurrentView('mixer')}
          />
        )}
      </main>

      {/* Global Persistent YouTube Audio Layer (Mounted in mixer and zen so YouTube playback never stops) */}
      <div className="fixed -left-[9999px] -top-[9999px] w-1 h-1 pointer-events-none opacity-0 overflow-hidden" aria-hidden="true">
        <ErrorBoundary fallbackTitle="Motor de Audio YouTube">
          {currentView !== 'multi_video' &&
            activeProject.channels
              .filter((t) => t.type === 'youtube_video' && t.youtubeVideoId)
              .map((track) => {
              const assignedBus = activeProject.buses?.find((b) => b.id === track.busId);
              const isBusMuted = assignedBus?.muted || false;
              const hasAnyBusSolo = activeProject.buses?.some((b) => b.solo) || false;
              const isBusSoloBlocked = hasAnyBusSolo && !assignedBus?.solo && !track.solo;
              const isTrackSoloBlocked = hasAnySolo && !track.solo;
              const isEffectivelyMuted = track.muted || isBusMuted;
              const isEffectivelySoloBlocked = isTrackSoloBlocked || isBusSoloBlocked;
              const busVolumeMult = assignedBus ? assignedBus.volume : 1.0;

              return (
                <YouTubePlayerEmbed
                  key={track.id}
                  trackId={track.id}
                  videoId={track.youtubeVideoId!}
                  volume={track.volume * busVolumeMult}
                  masterVolume={activeProject.masterVolume}
                  isPlaying={isPlaying}
                  muted={isEffectivelyMuted}
                  isSoloBlocked={isEffectivelySoloBlocked}
                  visible={false}
                  onAutoReplace={() => {
                    const cleanName = track.name.replace(/\(.*?\)/g, '').trim();
                    const fallback = VerifiedVideoLibrary.getNextWorkingVideo(
                      track.youtubeVideoId,
                      cleanName,
                      track.category
                    );
                    const safeTitle = (fallback?.title || cleanName || 'Video Verificado').trim();
                    handleUpdateChannel(track.id, {
                      youtubeVideoId: fallback.videoId,
                      youtubeThumbnail: fallback.thumbnail,
                      name: safeTitle.slice(0, 26),
                      isUnavailable: false,
                    });
                  }}
                  onErrorChange={(err) => {
                    if (err && !track.isUnavailable) {
                      handleUpdateChannel(track.id, { isUnavailable: true });
                    }
                  }}
                />
              );
            })}
        </ErrorBoundary>
      </div>

      {/* Hidden Audio File Input for Local Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleImportLocalAudioFiles(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Studio Tactile Hotkeys Bar & Footer */}
      <footer className="mt-12 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Soundscape AI. Multi-Reproductor de YouTube & Entornos Acústicos.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 font-mono text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">Espacio</kbd> Play/Pausa
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-mono text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">Esc</kbd> Stop General
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-mono text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">V</kbd> Alternar Vista
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-mono text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">Z</kbd> Modo Zen
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-mono text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">T</kbd> Temporizador
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-mono text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">R</kbd> Radar 2D
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-mono text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">B</kbd> Sintonizador
            </span>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastNotice && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-cyan-200 text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-md animate-fade-in max-w-sm">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Modals */}
      <SoundSearchModal
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          setReplaceTarget(null);
        }}
        onAddTrack={handleAddTrack}
        replaceTrackId={replaceTarget?.trackId || null}
        replaceTrackName={replaceTarget?.trackName || null}
        initialTab={replaceTarget?.initialTab}
        onReplaceTrackSource={(id, updated) => handleUpdateChannel(id, updated)}
      />

      <AISoundscapeModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyProject={handleLoadProject}
      />

      <GalleryModal
        isOpen={isGalleryOpen}
        activeProject={activeProject}
        onClose={() => setIsGalleryOpen(false)}
        onLoadProject={handleLoadProject}
        onSaveCurrentAsNew={handleSaveCurrentAsNew}
      />

      <SpatialRadarModal
        isOpen={isSpatialRadarOpen}
        tracks={activeProject.channels}
        onClose={() => setIsSpatialRadarOpen(false)}
        onUpdateTrack={(id, updated) => handleUpdateChannel(id, updated)}
      />

      <BinauralTunerModal
        isOpen={isBinauralTunerOpen}
        onClose={() => setIsBinauralTunerOpen(false)}
        onAddTrack={handleAddTrack}
      />

      <SleepTimerModal
        isOpen={isTimerModalOpen}
        activeTimer={activeTimer}
        onClose={() => setIsTimerModalOpen(false)}
        onStartTimer={handleStartTimer}
        onCancelTimer={handleCancelTimer}
      />

      <GeminiSettingsModal
        isOpen={isGeminiSettingsOpen}
        onClose={() => setIsGeminiSettingsOpen(false)}
      />
    </div>
  );
}
