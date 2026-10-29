import React, { useState, useEffect } from 'react';
import { SoundscapeProject, ChannelTrack, SoundSourceType } from '../types/soundscape';
import { SOUND_LIBRARY } from '../services/soundLibrary';
import { GeminiKeyService, VerifyKeyResult } from '../services/geminiKeyService';
import { composeSemanticSoundscape } from '../services/soundscapeComposer';
import { VerifiedVideoLibrary } from '../services/verifiedVideoLibrary';
import { Sparkles, X, Wand2, Check, ArrowRight, Loader2, Youtube, Key, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

interface AISoundscapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyProject: (project: SoundscapeProject) => void;
}

export const AISoundscapeModal: React.FC<AISoundscapeModalProps> = ({
  isOpen,
  onClose,
  onApplyProject,
}) => {
  const [prompt, setPrompt] = useState('');
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);

  // Gemini API Key state
  const [customKey, setCustomKey] = useState('');
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<VerifyKeyResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      const activeKey = GeminiKeyService.getCustomApiKey();
      setCustomKey(activeKey);
      if (activeKey) {
        // Auto-verify key on open so user sees green active badge immediately
        GeminiKeyService.verifyApiKey(activeKey).then((status) => {
          setKeyTestStatus(status);
        }).catch(() => {});
      }
    }
  }, [isOpen]);

  const handleTestApiKey = async () => {
    setIsTestingKey(true);
    setKeyTestStatus(null);
    const result = await GeminiKeyService.verifyApiKey(customKey);
    setIsTestingKey(false);
    setKeyTestStatus(result);
    if (result.valid && customKey.trim()) {
      GeminiKeyService.setCustomApiKey(customKey);
    }
  };

  const handleSaveApiKey = () => {
    GeminiKeyService.setCustomApiKey(customKey);
    handleTestApiKey();
  };

  interface MoodRecipe {
    title: string;
    emoji: string;
    desc: string;
    prompt: string;
  }

  const SMART_MOODS: MoodRecipe[] = [
    {
      title: 'Sobremesa de Lujo & Banquete',
      emoji: '🍷',
      desc: 'Cuarteto clásico, copas de baccarat y chimenea de palacio',
      prompt: 'Ambiente aristocrático muy de lujo en la sobremesa después de un banquete, con cuarteto de cuerdas clásico, cristalería fina y chimenea de palacio señorial',
    },
    {
      title: 'Noche de Lluvia & Chimenea',
      emoji: '🌧️',
      desc: 'Lluvia en ventana con truenos y brasas crepitantes',
      prompt: 'Lluvia torrencial en ventana de YouTube con chimenea crepitante cálida y ondas Theta 6Hz para dormir',
    },
    {
      title: 'Café Parisino Lo-Fi Study',
      emoji: '☕',
      desc: 'Piano de cafetería con beats Lofi Girl y lluvia',
      prompt: 'Lofi Girl de YouTube mezclado con cafetería de jazz en París, lluvia tenue y vinilo crepitante',
    },
    {
      title: 'Cyberpunk Blade Runner',
      emoji: '🚀',
      desc: 'Sintetizadores analógicos, lluvia nocturna y drone subgrave',
      prompt: 'Blade Runner cyberpunk lluvia nocturna de YouTube con drone sub-grave de 55 Hz y sintetizador Vangelis',
    },
    {
      title: 'Meditación Zen 432 Hz',
      emoji: '🧘',
      desc: 'Cuencos tibetanos y arroyo de agua pura',
      prompt: 'Cuencos tibetanos a 432 Hz de YouTube con arroyo de montaña y ondas Alfa a 10 Hz',
    },
    {
      title: 'Ventisca Ártica en Cabaña',
      emoji: '❄️',
      desc: 'Tormenta de nieve invernal con fuego de leña',
      prompt: 'Ventisca ártica y tormenta de nieve de YouTube con chimenea de cabaña y ruido marrón profundo',
    },
    {
      title: 'Hiper-Enfoque Código & Flow',
      emoji: '⚡',
      desc: 'Ruido marrón, lluvia y ondas Beta para estudio',
      prompt: 'Ruido marrón profundo con lluvia suave en cristal y ondas Beta a 18 Hz para máxima concentración',
    },
  ];

  const handleGenerate = async (targetPrompt?: string) => {
    const textToSubmit = targetPrompt || prompt;
    if (!textToSubmit.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedResult(null);

    let resultData: any = null;

    // 1. Try Backend API first
    try {
      const res = await fetch('/api/gemini/generate-soundscape', {
        method: 'POST',
        headers: GeminiKeyService.getAuthHeaders(),
        body: JSON.stringify({ prompt: textToSubmit.trim() }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          resultData = json.data;
        } else if (!res.ok) {
          console.warn('Backend gemini error:', json.error);
        }
      }
    } catch (err) {
      console.warn('Backend generation fetch failed:', err);
    }

    // 2. Try direct Google Generative Language REST API (client-side) if custom key is present
    if (!resultData) {
      const effectiveKey = customKey.trim() || GeminiKeyService.getCustomApiKey();
      if (effectiveKey) {
        try {
          const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
          for (const m of modelsToTry) {
            try {
              const directRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(effectiveKey)}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [
                          {
                            text: `You are Soundscape AI. Acoustically decompose this scene description: "${textToSubmit.trim()}". Return ONLY a raw JSON object with: { "name": string, "tagline": string, "concept": string, "visualTheme": "cyan"|"amber"|"violet"|"emerald"|"rose", "binauralFreqHz": number, "masterReverb": number, "masterDelay": number, "masterWarmth": number, "category": string, "tags": string[], "channels": [ { "customTitle": string, "soundKey": string, "type": "youtube_video", "youtubeSearchQuery": string, "role": string, "volume": number, "pan": number, "reverbSend": number, "delaySend": number, "tapeWarmth": number } ] }. Do not default to rain if the user asked for a different mood (like aristocratic salon, medieval tavern, space, etc).`,
                          },
                        ],
                      },
                    ],
                    generationConfig: {
                      responseMimeType: 'application/json',
                    },
                  })
                }
              );

              if (directRes.ok) {
                const directJson = await directRes.json();
                const rawText = directJson.candidates?.[0]?.content?.parts?.[0]?.text;
                if (rawText) {
                  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                  resultData = JSON.parse(cleaned);
                  break;
                }
              }
            } catch {
              continue;
            }
          }
        } catch (directErr) {
          console.warn('Direct Google AI generation failed:', directErr);
        }
      }
    }

    // 3. Resilient Semantic Orchestration Fallback
    // Guarantees that the user ALWAYS receives a tailored, gorgeous soundscape with verified videos
    if (!resultData) {
      resultData = composeSemanticSoundscape(textToSubmit.trim());
    }

    if (resultData && resultData.channels && resultData.channels.length > 0) {
      setGeneratedResult(resultData);
      setLastGeneratedPrompt(textToSubmit.trim());
    } else {
      setError('No se pudo orquestar el paisaje sonoro. Por favor, revisa tu conexión o API key.');
    }

    setIsLoading(false);
  };

  const handleApply = () => {
    if (!generatedResult) return;

    // Convert AI channels to concrete ChannelTrack objects
    const channels: ChannelTrack[] = generatedResult.channels.map((aiCh: any, index: number) => {
      const isYt = aiCh.type === 'youtube_video' || Boolean(aiCh.youtubeVideoId) || (aiCh.soundKey?.startsWith('yt_') && aiCh.type !== 'synthesizer');
      
      // Determine YouTube video ID using verified library
      let videoId = aiCh.youtubeVideoId;
      if (isYt && (!videoId || videoId === 'undefined')) {
        const verifiedVid = VerifiedVideoLibrary.getNextWorkingVideo(
          undefined,
          aiCh.customTitle,
          aiCh.soundKey
        );
        videoId = verifiedVid?.videoId || 'mPZkdNFkNps';
      }

      // Find matching template in sound library if available
      const synthTemplates = SOUND_LIBRARY.filter((item) => item.type === 'synthesizer');
      const template =
        SOUND_LIBRARY.find((item) => item.key === aiCh.soundKey) ||
        (isYt ? SOUND_LIBRARY[0] : synthTemplates[index % synthTemplates.length] || SOUND_LIBRARY[0]);

      const finalType: SoundSourceType = isYt
        ? 'youtube_video'
        : (aiCh.type === 'synthesizer' ? 'synthesizer' : template.type);

      const finalSynthType = !isYt ? (aiCh.synthType || template.synthType || 'binaural') : undefined;

      return {
        id: `ch_ai_${Date.now()}_${index}`,
        name: aiCh.customTitle || (isYt ? `Video YouTube (${videoId})` : template.name),
        soundKey: aiCh.soundKey || (isYt ? `yt_${videoId}` : template.key),
        type: finalType,
        synthType: finalSynthType,
        sourceUrl: isYt ? undefined : template.sourceUrl,
        youtubeVideoId: isYt ? videoId : undefined,
        youtubeThumbnail: aiCh.youtubeThumbnail || (isYt ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined),
        volume: typeof aiCh.volume === 'number' ? Math.max(0.1, Math.min(1.0, aiCh.volume)) : 0.65,
        pan: typeof aiCh.pan === 'number' ? Math.max(-1, Math.min(1, aiCh.pan)) : 0,
        filterCutoff: typeof aiCh.filterCutoff === 'number' ? aiCh.filterCutoff : 16000,
        filterType: 'lowpass' as const,
        filterQ: 1.0,
        reverbSend: typeof aiCh.reverbSend === 'number' ? aiCh.reverbSend : 0.2,
        delaySend: typeof aiCh.delaySend === 'number' ? aiCh.delaySend : 0.15,
        tapeWarmth: typeof aiCh.tapeWarmth === 'number' ? aiCh.tapeWarmth : 0.1,
        muted: false,
        solo: false,
        playbackRate: 1.0,
        loop: true,
        category: isYt ? 'YouTube Videos' : template.category,
        color: isYt ? '#F43F5E' : template.color,
        role: aiCh.role || (isYt ? 'video principal' : 'textura'),
        videoMode: isYt,
      };
    });

    const newProject: SoundscapeProject = {
      id: `project_${Date.now()}`,
      name: generatedResult.name || 'Paisaje Sonoro IA',
      tagline: generatedResult.tagline || 'Composición inteligente con multi-reproductor de YouTube',
      description: generatedResult.concept || prompt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: generatedResult.category || 'YouTube Multi-Video',
      tags: generatedResult.tags || ['YouTube', 'IA', 'Inmersivo'],
      visualTheme: (generatedResult.visualTheme as any) || 'cyan',
      masterVolume: 0.85,
      masterReverb: generatedResult.masterReverb || 0.35,
      masterDelay: generatedResult.masterDelay || 0.25,
      masterWarmth: generatedResult.masterWarmth || 0.2,
      masterFilter: 18000,
      binauralFreqHz: generatedResult.binauralFreqHz || 6.0,
      channels,
    };

    onApplyProject(newProject);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-950 border border-rose-500/30 text-rose-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Compositor Inteligente Soundscape AI
              </h2>
              <p className="text-xs text-slate-400">
                Busca y orquesta automáticamente videos de YouTube y capas sonoras para tu solicitud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gemini 3.8 Flash Engine & API Key Bar */}
        <div className="bg-slate-950/80 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Motor de Inteligencia Artificial:</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-800/80">
              gemini-3.8-flash
            </span>
          </div>

          <button
            onClick={() => setShowKeyPanel(!showKeyPanel)}
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{customKey ? 'Clave de API configurada' : 'Configurar Clave de API'}</span>
            {showKeyPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible API Key Config & Verification Form */}
        {showKeyPanel && (
          <div className="px-6 py-4 bg-slate-950/95 border-b border-slate-800 space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder="Pega aquí tu Gemini API Key (AIzaSy...)"
                value={customKey}
                onChange={(e) => {
                  setCustomKey(e.target.value);
                  setKeyTestStatus(null);
                }}
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestApiKey}
                  disabled={isTestingKey}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {isTestingKey ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Comprobando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Comprobar clave</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  Guardar
                </button>
              </div>
            </div>

            {keyTestStatus && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                  keyTestStatus.valid
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}
              >
                {keyTestStatus.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>
                  {keyTestStatus.valid
                    ? `¡Clave verificada y operativa con ${keyTestStatus.model || 'gemini-3.8-flash'}!`
                    : keyTestStatus.error}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300">
                ¿Qué entorno o combinación de videos de YouTube quieres crear?
              </label>
              {(prompt || generatedResult) && (
                <button
                  onClick={() => {
                    setPrompt('');
                    setGeneratedResult(null);
                    setError(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpiar y nuevo prompt</span>
                </button>
              )}
            </div>
            <textarea
              rows={3}
              placeholder="Ej: Quiero una mezcla de cuarteto de cuerdas clásico con cristalería fina y chimenea de palacio, o una taberna medieval con laúd..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
            />
          </div>

          {/* Quick inspiration prompts */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Recetas y Ambientes Inteligentes (1 Clic):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SMART_MOODS.map((mood, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(mood.prompt);
                    handleGenerate(mood.prompt);
                  }}
                  className="p-3 text-left bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/50 rounded-xl transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{mood.emoji}</span>
                    <span className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                      {mood.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1">
                    {mood.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/40 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{generatedResult.name}</span>
                  </h3>
                  <p className="text-xs text-rose-300 mt-0.5">
                    {generatedResult.tagline}
                  </p>
                </div>
                <span className="text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded">
                  {generatedResult.category}
                </span>
              </div>

              <p className="text-xs text-slate-300 italic">
                "{generatedResult.concept}"
              </p>

              {/* Channels list preview */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Canales & Videos Orquestados ({generatedResult.channels?.length || 0}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {generatedResult.channels?.map((ch: any, idx: number) => {
                    const isYt = ch.type === 'youtube_video' || ch.youtubeVideoId || ch.soundKey?.startsWith('yt_');
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          {isYt ? (
                            <Youtube className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                          )}
                          <span className="text-slate-200 truncate">{ch.customTitle}</span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                          {Math.round((ch.volume || 0.7) * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                <span>Etiquetas:</span>
                <span>{generatedResult.tags?.join(' · ')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            {generatedResult && (
              <button
                onClick={() => {
                  setGeneratedResult(null);
                  setError(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                title="Descartar vista previa actual y escribir una nueva escena"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nueva Búsqueda</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {generatedResult ? (
              <>
                <button
                  onClick={() => handleGenerate()}
                  disabled={isLoading || !prompt.trim()}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-rose-500/50 disabled:opacity-50 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      <span>Diseñando...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 text-rose-400" />
                      <span>
                        {prompt.trim() !== lastGeneratedPrompt.trim()
                          ? '✨ Orquestar este nuevo prompt'
                          : '🔄 Regenerar con IA'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleApply}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-all shadow-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Cargar en Soundscape AI</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleGenerate()}
                disabled={isLoading || !prompt.trim()}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Buscando & Diseñando...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Orquestar con IA</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
