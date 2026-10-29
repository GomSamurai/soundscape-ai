// YouTube IFrame API multi-player manager for Soundscape AI

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface ManagedPlayer {
  trackId: string;
  videoId: string;
  player: any;
  isReady: boolean;
  targetVolume: number;
}

export class YouTubeManager {
  private players: Map<string, ManagedPlayer> = new Map();
  private isApiLoaded = false;
  private isApiLoading = false;
  private isGlobalPlaying = false;
  private pendingInitCallbacks: (() => void)[] = [];

  constructor() {
    this.initApi();
  }

  // Load YouTube Iframe API script once
  public initApi(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
        this.isApiLoaded = true;
        resolve();
        return;
      }

      this.pendingInitCallbacks.push(resolve);

      if (this.isApiLoading) return;
      this.isApiLoading = true;

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        this.isApiLoaded = true;
        this.isApiLoading = false;
        this.pendingInitCallbacks.forEach((cb) => cb());
        this.pendingInitCallbacks = [];
      };

      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
    });
  }

  // Extract YouTube Video ID from any format
  public static extractVideoId(input: string): string | null {
    if (!input) return null;
    const trimmed = input.trim();

    // Direct 11-character ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // RegEx covering watch?v=, youtu.be/, embed/, shorts/
    const regExp =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
    const match = trimmed.match(regExp);
    return match && match[1] ? match[1] : null;
  }

  // Register and instantiate a YouTube player for a channel
  public async registerPlayer(
    trackId: string,
    containerId: string,
    videoId: string,
    initialVolume: number,
    shouldPlay: boolean,
    onReady?: () => void,
    onError?: (errorCode: number) => void
  ) {
    await this.initApi();

    // Check if element exists in DOM
    const el = document.getElementById(containerId);
    if (!el) {
      console.warn(`Container element #${containerId} not found in DOM yet.`);
      return;
    }

    // Clean up prior instance if exists
    this.unregisterPlayer(trackId);

    const managed: ManagedPlayer = {
      trackId,
      videoId,
      player: null,
      isReady: false,
      targetVolume: initialVolume,
    };
    this.players.set(trackId, managed);

    try {
      const player = new window.YT.Player(containerId, {
        videoId,
        playerVars: {
          autoplay: this.isGlobalPlaying || shouldPlay ? 1 : 0,
          controls: 0,
          loop: 1,
          playlist: videoId,
          playsinline: 1,
          enablejsapi: 1,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: any) => {
            managed.isReady = true;
            managed.player = event.target;
            const vol = Math.max(0, Math.min(100, Math.round(initialVolume * 100)));

            try {
              event.target.setVolume(vol);
              if (vol > 0) {
                event.target.unMute();
              } else {
                event.target.mute();
              }

              if (this.isGlobalPlaying || shouldPlay) {
                event.target.playVideo();
              } else {
                event.target.pauseVideo();
              }
            } catch (err) {
              console.warn('Error setting initial YouTube player state:', err);
            }

            if (onReady) onReady();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.playVideo();
            }
          },
          onError: (event: any) => {
            const code = event?.data || 100;
            console.warn(`YouTube Player Error for track ${trackId} (Code ${code})`);
            if (onError) onError(code);
          },
        },
      });

      managed.player = player;
    } catch (e) {
      console.error('Error creating YouTube player:', e);
      if (onError) onError(100);
    }
  }

  // Update track volume dynamically
  public updateVolume(
    trackId: string,
    trackVolume: number,
    masterVolume: number,
    isMuted: boolean,
    isSoloBlocked: boolean
  ) {
    const managed = this.players.get(trackId);
    if (!managed || !managed.player || !managed.isReady) return;

    let effective = trackVolume * masterVolume;
    if (isMuted || isSoloBlocked) {
      effective = 0;
    }

    const ytVolume = Math.max(0, Math.min(100, Math.round(effective * 100)));
    managed.targetVolume = effective;

    try {
      if (typeof managed.player.setVolume === 'function') {
        managed.player.setVolume(ytVolume);
        if (ytVolume <= 0) {
          managed.player.mute();
        } else {
          managed.player.unMute();
        }
      }
    } catch (e) {
      console.warn('Error updating YouTube volume:', e);
    }
  }

  // Play all registered YouTube videos
  public playAll() {
    this.isGlobalPlaying = true;
    this.players.forEach((managed) => {
      if (managed.isReady && managed.player && typeof managed.player.playVideo === 'function') {
        try {
          if (managed.targetVolume > 0) {
            managed.player.unMute();
            managed.player.setVolume(Math.round(managed.targetVolume * 100));
          }
          managed.player.playVideo();
        } catch (e) {
          console.warn('Error playing YouTube video:', e);
        }
      }
    });
  }

  // Pause all registered YouTube videos
  public pauseAll() {
    this.isGlobalPlaying = false;
    this.players.forEach((managed) => {
      if (managed.isReady && managed.player && typeof managed.player.pauseVideo === 'function') {
        try {
          managed.player.pauseVideo();
        } catch (e) {
          console.warn('Error pausing YouTube video:', e);
        }
      }
    });
  }

  // Stop all registered YouTube videos and rewind to start
  public stopAll() {
    this.isGlobalPlaying = false;
    this.players.forEach((managed) => {
      if (managed.isReady && managed.player) {
        try {
          if (typeof managed.player.pauseVideo === 'function') {
            managed.player.pauseVideo();
          }
          if (typeof managed.player.seekTo === 'function') {
            managed.player.seekTo(0, true);
          }
        } catch (e) {}
      }
    });
  }

  // Unregister and destroy a player instance
  public unregisterPlayer(trackId: string) {
    const managed = this.players.get(trackId);
    if (managed) {
      if (managed.player && typeof managed.player.destroy === 'function') {
        try {
          managed.player.destroy();
        } catch (e) {}
      }
      this.players.delete(trackId);
    }
  }

  // Clear all players
  public unregisterAll() {
    this.players.forEach((_, id) => this.unregisterPlayer(id));
    this.players.clear();
  }

  public getIsPlaying(): boolean {
    return this.isGlobalPlaying;
  }
}

export const youtubeManager = new YouTubeManager();
