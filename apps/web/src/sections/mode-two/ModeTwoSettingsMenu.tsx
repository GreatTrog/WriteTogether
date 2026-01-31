import { type TopicFilter } from "./types";

type ModeTwoSettingsMenuProps = {
  availableTopics: TopicFilter[];
  topicFilter: TopicFilter;
  onTopicChange: (topic: TopicFilter) => void;
  sortMode: "class" | "alphabetical";
  onSortModeChange: (mode: "class" | "alphabetical") => void;
  voices: SpeechSynthesisVoice[];
  voiceIndex: number;
  onVoiceChange: (index: number) => void;
  themedClass: (base: string) => string;
};

const ModeTwoSettingsMenu = ({
  availableTopics,
  topicFilter,
  onTopicChange,
  sortMode,
  onSortModeChange,
  voices,
  voiceIndex,
  onVoiceChange,
  themedClass,
}: ModeTwoSettingsMenuProps) => (
  <div className={themedClass("mode-two-left-menu")}>
    <label className="mode-two-topic-label">
      Topic focus
      <select
        value={topicFilter}
        onChange={(event) => onTopicChange(event.target.value as TopicFilter)}
        className="mode-two-select"
      >
        {availableTopics.map((topic) => (
          <option key={topic} value={topic}>
            {topic === "all" ? "All topics" : topic}
          </option>
        ))}
      </select>
    </label>
    <div className="mode-two-sort">
      <p className="mode-two-sort-title">Display order</p>
      <div className="mode-two-sort-group">
        <button
          type="button"
          onClick={() => onSortModeChange("class")}
          className={`mode-two-sort-button${sortMode === "class" ? " is-active" : ""}`}
        >
          Word class
        </button>
        <button
          type="button"
          onClick={() => onSortModeChange("alphabetical")}
          className={`mode-two-sort-button${
            sortMode === "alphabetical" ? " is-active" : ""
          }`}
        >
          Alphabetical
        </button>
      </div>
    </div>
    {voices.length > 0 ? (
      <label className="mode-two-topic-label">
        Voice
        <select
          value={voiceIndex}
          onChange={(event) => onVoiceChange(Number(event.target.value))}
          className="mode-two-select"
        >
          {voices.map((voice, index) => (
            <option key={voice.name} value={index}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </label>
    ) : null}
    <div className="mode-two-autosave">
      Autosave runs every few seconds. Encourage pupils to read back after
      each paragraph.
    </div>
  </div>
);

export default ModeTwoSettingsMenu;
