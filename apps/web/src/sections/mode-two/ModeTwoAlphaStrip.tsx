import clsx from "clsx";

type ModeTwoAlphaStripProps = {
  letters: string[];
  activeLetter: string | null;
  availableLetters: Set<string>;
  onSelectLetter: (letter: string) => void;
  themedClass: (base: string) => string;
};

const ModeTwoAlphaStrip = ({
  letters,
  activeLetter,
  availableLetters,
  onSelectLetter,
  themedClass,
}: ModeTwoAlphaStripProps) => (
  <div className={themedClass("mode-two-alpha-strip")}>
    {letters.map((letter) => {
      const isAvailable = availableLetters.has(letter);
      const isActive = activeLetter === letter;
      return (
        <button
          key={letter}
          type="button"
          className={clsx(
            "mode-two-alpha-link",
            isActive && isAvailable && "mode-two-alpha-link--active",
          )}
          disabled={!isAvailable}
          onClick={() => {
            if (!isAvailable) {
              return;
            }
            onSelectLetter(letter);
          }}
        >
          {letter}
        </button>
      );
    })}
  </div>
);

export default ModeTwoAlphaStrip;
