import { useEffect, useMemo } from "react";
import clsx from "clsx";
import useVoiceRecorder, { type RecorderStatus } from "../hooks/useVoiceRecorder";
import { Mode2Icons } from "../assets/icons/mode2ToolbarIcons";

type VoiceRecorderControlsProps = {
  className?: string;
  label?: string;
  size?: "default" | "compact";
  onRecordingReady?: (audioUrl: string | null) => void;
  orientation?: "stacked" | "inline";
  hideStatus?: boolean;
  buttonClassName?: string;
  iconClassName?: string;
  useDefaultButtonStyles?: boolean;
  showButtonLabels?: boolean;
};

const statusLabel = (status: RecorderStatus) => {
  switch (status) {
    case "recording":
      return "Recording...";
    case "playing":
      return "Playing back...";
    case "paused":
      return "Playback paused";
    case "ready":
      return "Recording ready";
    default:
      return "Recorder idle";
  }
};

const VoiceRecorderControls = ({
  className,
  label = "Voice notes",
  size = "default",
  onRecordingReady,
  orientation = "stacked",
  hideStatus = false,
  buttonClassName,
  iconClassName,
  useDefaultButtonStyles = true,
  showButtonLabels = true,
}: VoiceRecorderControlsProps) => {
  const recorder = useVoiceRecorder();

  useEffect(() => {
    if (onRecordingReady) {
      onRecordingReady(recorder.audioUrl);
    }
  }, [onRecordingReady, recorder.audioUrl]);

  const rootClasses = clsx(
    "voice-recorder",
    size === "compact" && "voice-recorder--compact",
    orientation === "inline" ? "voice-recorder--inline" : "voice-recorder--stacked",
    className,
    recorder.isRecording && "voice-recorder--recording",
  );

  const statusText = useMemo(() => statusLabel(recorder.status), [recorder.status]);

  const baseButtonClass = useDefaultButtonStyles ? "voice-recorder__button" : "";
  const recordButtonClass = clsx(
    baseButtonClass,
    buttonClassName,
  );
  const playButtonClass = clsx(
    baseButtonClass,
    buttonClassName,
  );
  const pauseButtonClass = clsx(
    baseButtonClass,
    buttonClassName,
  );

  const recordLabel = recorder.isRecording ? "Stop" : "Record";

  const disableRecord = recorder.isPlaying;
  const disablePlay =
    !recorder.hasRecording || recorder.isRecording || recorder.isPlaying;
  const pauseDisabled = !recorder.isPlaying;

  const playButtonLabel = recorder.isPaused ? "Resume" : "Play";
  const playButtonAria = recorder.isPaused ? "Resume playback" : "Play recording";
  const renderIcon = (svg: string) => (
    <span
      className={iconClassName}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );

  return (
    <div className={rootClasses}>
      {hideStatus ? (
        <span className="voice-recorder__status voice-recorder__status--sr" aria-live="polite">
          {statusText}
        </span>
      ) : (
        <div className="voice-recorder__header">
          <p className="voice-recorder__label">{label}</p>
          <span className="voice-recorder__status" aria-live="polite">
            {statusText}
          </span>
        </div>
      )}
      <div className="voice-recorder__controls">
        <button
          type="button"
          onClick={() => {
            if (recorder.isRecording) {
              recorder.stop();
            } else {
              void recorder.startRecording();
            }
          }}
          disabled={disableRecord}
          className={recordButtonClass}
          aria-label={recorder.isRecording ? "Stop recording" : "Start recording"}
        >
          {renderIcon(recorder.isRecording ? Mode2Icons.stop : Mode2Icons.record)}
          {showButtonLabels ? <span>{recordLabel}</span> : null}
        </button>
        <button
          type="button"
          onClick={() => {
            void recorder.play();
          }}
          disabled={disablePlay}
          className={playButtonClass}
          aria-label={playButtonAria}
        >
          {renderIcon(Mode2Icons.play)}
          {showButtonLabels ? <span>{playButtonLabel}</span> : null}
        </button>
        <button
          type="button"
          onClick={recorder.pause}
          disabled={pauseDisabled}
          className={pauseButtonClass}
          aria-label="Pause playback"
        >
          {renderIcon(Mode2Icons.pause)}
          {showButtonLabels ? <span>Pause</span> : null}
        </button>
      </div>
      {recorder.error ? (
        <p className="voice-recorder__error" role="alert">
          {recorder.error}
        </p>
      ) : null}
    </div>
  );
};

export default VoiceRecorderControls;
