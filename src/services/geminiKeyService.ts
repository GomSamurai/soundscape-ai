/**
 * Service to manage custom Gemini API Key storage, verification, and request headers.
 */

const STORAGE_KEY = 'soundscape_gemini_api_key';

export interface VerifyKeyResult {
  valid: boolean;
  message?: string;
  error?: string;
  model?: string;
  isCustom?: boolean;
  reply?: string;
}

export const GeminiKeyService = {
  getCustomApiKey(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  },

  setCustomApiKey(key: string): void {
    try {
      const cleanKey = key.trim();
      if (cleanKey) {
        localStorage.setItem(STORAGE_KEY, cleanKey);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error saving Gemini API key to localStorage:', e);
    }
  },

  clearCustomApiKey(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing Gemini API key:', e);
    }
  },

  getAuthHeaders(): Record<string, string> {
    const key = this.getCustomApiKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (key) {
      headers['x-gemini-api-key'] = key;
    }
    return headers;
  },

  async verifyApiKey(customKey?: string): Promise<VerifyKeyResult> {
    const keyToTest = typeof customKey === 'string' ? customKey.trim() : this.getCustomApiKey();

    try {
      const res = await fetch('/api/gemini/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(keyToTest ? { 'x-gemini-api-key': keyToTest } : {}),
        },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        let cleanError = data.error || 'Clave de API inválida o error en Gemini 3.8 Flash';
        try {
          if (cleanError.startsWith('{')) {
            const parsed = JSON.parse(cleanError);
            if (parsed.error?.message) {
              cleanError = parsed.error.message;
            }
          }
        } catch {
          // keep original
        }

        return {
          valid: false,
          error: cleanError,
        };
      }

      return {
        valid: true,
        model: data.model || 'gemini-3.8-flash',
        message: data.message || 'Clave verificada con éxito en Gemini 3.8 Flash',
        isCustom: data.isCustom,
        reply: data.reply,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || 'Error de conexión con el servidor al verificar la clave',
      };
    }
  },
};
