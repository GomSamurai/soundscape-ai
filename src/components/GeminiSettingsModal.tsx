import React, { useState, useEffect } from 'react';
import { GeminiKeyService, VerifyKeyResult } from '../services/geminiKeyService';
import { Key, CheckCircle2, AlertCircle, Loader2, X, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';

interface GeminiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
}

export const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyKeyResult | null>(null);
  const [saveNotice, setSaveNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(GeminiKeyService.getCustomApiKey());
      setVerifyResult(null);
      setSaveNotice(false);
    }
  }, [isOpen]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    setSaveNotice(false);

    const result = await GeminiKeyService.verifyApiKey(apiKey);
    setIsVerifying(false);
    setVerifyResult(result);
  };

  const handleSave = () => {
    GeminiKeyService.setCustomApiKey(apiKey);
    setSaveNotice(true);
    onKeyUpdated?.();
    setTimeout(() => {
      setSaveNotice(false);
    }, 2500);
  };

  const handleClear = () => {
    setApiKey('');
    GeminiKeyService.clearCustomApiKey();
    setVerifyResult(null);
    setSaveNotice(false);
    onKeyUpdated?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-950 border border-violet-500/30 text-violet-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Configurar Gemini AI</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800">
                  gemini-2.5-flash
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Introduce tu clave de API personalizada y verifica su funcionamiento
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

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Clave de API de Gemini (Google AI Studio)
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setVerifyResult(null);
                }}
                className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={showKey ? 'Ocultar' : 'Mostrar'}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Si la dejas en blanco, el sistema usará la clave de API configurada en el servidor (si existe).
            </p>
          </div>

          {/* Action buttons: Test & Save */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Comprobando Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Comprobar clave de API</span>
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Guardar en navegador
            </button>

            {apiKey && (
              <button
                onClick={handleClear}
                className="px-3 py-2 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                Eliminar clave
              </button>
            )}
          </div>

          {/* Verification Result Feedback */}
          {verifyResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                verifyResult.valid
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
              }`}
            >
              {verifyResult.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">
                  {verifyResult.valid
                    ? '¡Clave de API verificada y funcionando con éxito!'
                    : 'Error al verificar la clave de API'}
                </p>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {verifyResult.valid
                    ? `Modelo: ${verifyResult.model || 'gemini-2.5-flash'}. Origen: ${
                        verifyResult.isCustom ? 'Personalizada' : 'Servidor'
                      }. Respuesta de prueba recibida correctamente.`
                    : verifyResult.error}
                </p>
              </div>
            </div>
          )}

          {saveNotice && (
            <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Clave guardada localmente de forma segura en este navegador.</span>
            </div>
          )}

          {/* Privacy note */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300 block">Privacidad y Seguridad:</span>
            <p>
              Tu clave personalizada se almacena únicamente en tu navegador y se envía directamente a la
              pasarela segura del servidor para procesar las peticiones de Soundscape AI con el modelo{' '}
              <code className="text-violet-300 font-mono">gemini-2.5-flash</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
