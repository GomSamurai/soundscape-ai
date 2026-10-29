/**
 * Service to manage custom Gemini API Key storage, verification, and request headers.
 * Includes direct Google REST API fallback so verification works even if backend is offline.
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

  /**
   * Direct Google Gemini REST API Verification (client-side fallback)
   */
  async verifyWithGoogleDirect(apiKey: string): Promise<VerifyKeyResult> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return { valid: false, error: 'Por favor introduce una clave de API válida de Google Gemini.' };
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        cleanKey
      )}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping de conexión Soundscape AI. Responde: OK' }] }],
        }),
      });

      const raw = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        return {
          valid: false,
          error: `Respuesta no válida del servidor (${res.status}): ${raw.slice(0, 120)}`,
        };
      }

      if (res.ok && data.candidates && data.candidates.length > 0) {
        const reply = data.candidates[0]?.content?.parts?.[0]?.text?.trim() || 'OK';
        return {
          valid: true,
          model: 'gemini-2.5-flash',
          message: 'Clave validada con éxito directamente con Google Gemini 2.5 Flash.',
          reply,
          isCustom: true,
        };
      }

      // Handle Google specific error message
      const errMsg =
        data.error?.message ||
        (res.status === 400
          ? 'Clave de API no válida o expirada. Verifica que empiece por AIzaSy...'
          : `Error al validar con Google (${res.status})`);

      return {
        valid: false,
        error: errMsg,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || 'Error de red al conectar directamente con Google Gemini API.',
      };
    }
  },

  /**
   * Primary verification: Attempts backend proxy first, then falls back to direct Google verification.
   */
  async verifyApiKey(customKey?: string): Promise<VerifyKeyResult> {
    const keyToTest = typeof customKey === 'string' ? customKey.trim() : this.getCustomApiKey();

    if (!keyToTest) {
      return {
        valid: false,
        error: 'No has introducido ninguna clave de API de Gemini.',
      };
    }

    // Try backend verification first
    try {
      const res = await fetch('/api/gemini/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(keyToTest ? { 'x-gemini-api-key': keyToTest } : {}),
        },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.valid) {
          return {
            valid: true,
            model: data.model || 'gemini-2.5-flash',
            message: data.message || 'Clave verificada con éxito con Gemini 2.5 Flash',
            isCustom: data.isCustom,
            reply: data.reply,
          };
        } else if (data.error) {
          // If backend gave a clear invalid key error from Google, return it
          return {
            valid: false,
            error: data.error,
          };
        }
      }
    } catch (backendErr) {
      console.warn('Backend verify-key unavailable, falling back to direct Google test:', backendErr);
    }

    // Direct Google REST test fallback
    return await this.verifyWithGoogleDirect(keyToTest);
  },
};
