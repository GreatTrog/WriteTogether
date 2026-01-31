import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechOptions = {
  rate?: number;
  pitch?: number;
  voice?: SpeechSynthesisVoice;
};

const supportsSpeech = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

// Wrap the Web Speech API so components can toggle playback, monitor status,
// and pick the best available voice for the given locale.
const useSpeechSynthesis = (options?: { locale?: string }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === "undefined") {
      return true;
    }
    return navigator.onLine;
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Browser voice registry loads asynchronously; listen once and cache results.
    if (!supportsSpeech()) {
      return;
    }

    const loadVoices = () => {
      const loaded = window.speechSynthesis.getVoices();
      if (loaded.length > 0) {
        setVoices(loaded);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  useEffect(() => {
    // Track online/offline state so we can prefer locally cached voices offline.
    if (typeof window === "undefined") {
      return;
    }
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const localVoices = useMemo(
    () => voices.filter((voice) => voice.localService),
    [voices],
  );

  const resolveFallbackVoice = useCallback(
    (preferred?: SpeechSynthesisVoice) => {
      if (!preferred || localVoices.length === 0) {
        return null;
      }
      const preferredLang = preferred.lang?.toLowerCase() ?? "";
      const matchingLocal = localVoices.find((voice) =>
        preferredLang
          ? voice.lang?.toLowerCase().startsWith(preferredLang)
          : false,
      );
      return matchingLocal ?? localVoices[0] ?? null;
    },
    [localVoices],
  );

  const speak = useCallback((text: string, options?: SpeechOptions) => {
    // Cancel any existing utterance so new playback always starts cleanly.
    if (!supportsSpeech()) {
      return false;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return false;
    }

    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) {
      synth.cancel();
    }

    const fallbackVoice = resolveFallbackVoice(options?.voice);

    const play = (
      voice?: SpeechSynthesisVoice,
      allowFallback = true,
    ) => {
      let started = false;
      let fallbackTimer: number | undefined;

      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.rate = options?.rate ?? 1;
      utterance.pitch = options?.pitch ?? 1;
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang ?? utterance.lang;
      }

      utterance.onstart = () => {
        started = true;
        if (fallbackTimer) {
          window.clearTimeout(fallbackTimer);
        }
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        if (fallbackTimer) {
          window.clearTimeout(fallbackTimer);
        }
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        if (fallbackTimer) {
          window.clearTimeout(fallbackTimer);
        }
        if (allowFallback && fallbackVoice && voice !== fallbackVoice) {
          synth.cancel();
          play(fallbackVoice, false);
          return;
        }
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      if (allowFallback && fallbackVoice && voice && !voice.localService) {
        fallbackTimer = window.setTimeout(() => {
          if (started) {
            return;
          }
          synth.cancel();
          play(fallbackVoice, false);
        }, 1200);
      }
      synth.speak(utterance);
    };

    play(options?.voice);
    return true;
  }, [resolveFallbackVoice]);

  const stop = useCallback(() => {
    if (!supportsSpeech()) {
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const preferredVoices = useMemo(() => {
    // Filter and sort voices each time the locale or connectivity shifts.
    if (voices.length === 0) {
      return [];
    }

    const localeFilter = options?.locale?.toLowerCase();
    const withLocale = localeFilter
      ? voices.filter((voice) => voice.lang?.toLowerCase().startsWith(localeFilter))
      : voices;

    let candidates = withLocale;
    if (!isOnline) {
      const localVoices = withLocale.filter((voice) => voice.localService);
      if (localVoices.length > 0) {
        candidates = localVoices;
      }
    }

    const preferredNames = [
      "microsoft ryan online (natural)",
      "microsoft ryan online",
    ];
    const isPreferredVoice = (voice: SpeechSynthesisVoice) => {
      const name = voice.name?.toLowerCase() ?? "";
      return preferredNames.some((preferred) => name.includes(preferred));
    };

    return candidates.slice().sort((a, b) => {
      const aPreferred = isPreferredVoice(a);
      const bPreferred = isPreferredVoice(b);
      if (aPreferred && !bPreferred) {
        return -1;
      }
      if (!aPreferred && bPreferred) {
        return 1;
      }
      const aLang = a.lang ?? "";
      const bLang = b.lang ?? "";
      if (aLang !== bLang) {
        return aLang.localeCompare(bLang);
      }
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [voices, options?.locale, isOnline]);

  return {
    canSpeak: supportsSpeech(),
    isSpeaking,
    speak,
    stop,
    voices: preferredVoices,
  };
};

export default useSpeechSynthesis;
