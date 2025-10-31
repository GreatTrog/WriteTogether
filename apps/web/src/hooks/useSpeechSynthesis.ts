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

  const speak = useCallback((text: string, options?: SpeechOptions) => {
    // Cancel any existing utterance so new playback always starts cleanly.
    if (!supportsSpeech()) {
      return false;
    }

    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    if (options?.voice) {
      utterance.voice = options.voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  }, []);

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
