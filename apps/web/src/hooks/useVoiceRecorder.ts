import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "ready" | "playing" | "paused";

type UseVoiceRecorderOptions = {
  mimeType?: string;
};

type UseVoiceRecorderReturn = {
  status: RecorderStatus;
  isRecording: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  hasRecording: boolean;
  audioUrl: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stop: () => void;
  play: () => Promise<void>;
  pause: () => void;
  reset: () => void;
};

const DEFAULT_MIME_TYPE = "audio/webm";

const useVoiceRecorder = (
  options: UseVoiceRecorderOptions = {},
): UseVoiceRecorderReturn => {
  const { mimeType = DEFAULT_MIME_TYPE } = options;
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const revokeUrl = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const cleanupStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      cleanupStream();
      cleanupAudio();
      revokeUrl(audioUrl);
    };
  }, [audioUrl, cleanupAudio, cleanupStream, revokeUrl]);

  const startRecording = useCallback(async () => {
    if (status === "recording") {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported in this browser.");
      return;
    }

    setError(null);
    cleanupAudio();
    const currentUrl = audioUrl;
    if (currentUrl) {
      revokeUrl(currentUrl);
      setAudioUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        const message =
          (event.error && event.error.message) || "Recording failed. Please try again.";
        setError(message);
        setStatus("idle");
        cleanupStream();
      };

      recorder.onstop = () => {
        cleanupStream();
        if (chunksRef.current.length === 0) {
          setStatus("idle");
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl((previous) => {
          revokeUrl(previous);
          return url;
        });
        setStatus("ready");
      };

      recorder.start();
      setStatus("recording");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Microphone access was denied.",
      );
      cleanupStream();
      setStatus("idle");
    }
  }, [audioUrl, cleanupAudio, cleanupStream, mimeType, revokeUrl, status]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      mediaRecorderRef.current = null;
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    }
    setStatus((current) => (audioUrl ? "ready" : "idle"));
  }, [audioUrl]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (audio.paused) {
      return;
    }
    audio.pause();
    setStatus("paused");
  }, []);

  const play = useCallback(async () => {
    if (!audioUrl) {
      return;
    }
    if (status === "recording") {
      stop();
      return;
    }

    let audio = audioRef.current;
    if (audio && status === "paused") {
      try {
        await audio.play();
        setStatus("playing");
        return;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to resume playback.",
        );
        setStatus("ready");
        audioRef.current = null;
        return;
      }
    }

    cleanupAudio();
    audio = new Audio(audioUrl);
    audioRef.current = audio;
    setStatus("playing");

    try {
      await audio.play();
      audio.onended = () => {
        setStatus("ready");
        audioRef.current = null;
      };
      audio.onerror = () => {
        setError("Playback failed. Please record again.");
        setStatus("ready");
        audioRef.current = null;
      };
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to play the recording.",
      );
      setStatus("ready");
      audioRef.current = null;
    }
  }, [audioUrl, cleanupAudio, status, stop]);

  const reset = useCallback(() => {
    stop();
    cleanupAudio();
    cleanupStream();
    mediaRecorderRef.current = null;
    setStatus("idle");
    setError(null);
    setAudioUrl((previous) => {
      revokeUrl(previous);
      return null;
    });
    chunksRef.current = [];
  }, [cleanupAudio, cleanupStream, revokeUrl, stop]);

  return {
    status,
    isRecording: status === "recording",
    isPlaying: status === "playing",
    isPaused: status === "paused",
    hasRecording: status === "ready" || status === "playing" || status === "paused",
    audioUrl,
    error,
    startRecording,
    stop,
    play,
    pause,
    reset,
  };
};

export default useVoiceRecorder;
