import { type AlphabeticalBucket } from "./modeTwoBankUtils";
import { stripWordBankBrackets } from "../../utils/wordBankText";

type ModeTwoAlphabeticalPanelProps = {
  buckets: AlphabeticalBucket[];
  activeLetter: string | null;
  onInsertToken: (token: string) => void;
  themedClass: (base: string) => string;
};

const ModeTwoAlphabeticalPanel = ({
  buckets,
  activeLetter,
  onInsertToken,
  themedClass,
}: ModeTwoAlphabeticalPanelProps) => {
  if (buckets.length === 0) {
    return (
      <div className={themedClass("mode-two-empty")}>
        No words match the current filters.
      </div>
    );
  }

  const activeBucket =
    (activeLetter && buckets.find((bucket) => bucket.letter === activeLetter)) ??
    buckets[0];

  if (!activeBucket) {
    return (
      <div className={themedClass("mode-two-empty")}>
        No words match the current filters.
      </div>
    );
  }

  return (
    <div
      key={activeBucket.letter}
      id={`alpha-${activeBucket.letter}`}
      className={themedClass("mode-two-alpha-card")}
    >
      <div className="mode-two-bank-card__header">
        <p className="mode-two-bank-card__title">{activeBucket.letter}</p>
        <span className="mode-two-chip">{activeBucket.items.length}</span>
      </div>
      <div className="mode-two-alpha-grid">
        {activeBucket.items.map((item) => {
          const displayText = stripWordBankBrackets(item.text);
          return (
            <button
              key={`${activeBucket.letter}-${item.id}`}
              type="button"
              onClick={() => onInsertToken(displayText)}
              className="mode-two-token"
            >
              {displayText}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModeTwoAlphabeticalPanel;
