import { type ModeTwoBank } from "./data";
import { resolveCategoryMeta } from "./modeTwoBankUtils";

type ModeTwoBankPanelProps = {
  banks: ModeTwoBank[];
  onInsertToken: (token: string) => void;
  themedClass: (base: string) => string;
};

const ModeTwoBankPanel = ({
  banks,
  onInsertToken,
  themedClass,
}: ModeTwoBankPanelProps) => {
  if (banks.length === 0) {
    return (
      <div className={themedClass("mode-two-empty")}>
        No words match the current filters.
      </div>
    );
  }

  return (
    <div className={themedClass("mode-two-bank-strip")}>
      {banks.map((bank) => {
        const categoryMeta = resolveCategoryMeta(bank.category, bank.categoryLabel);
        return (
          <div key={bank.id} className="mode-two-bank-card">
            <div className="mode-two-bank-card__header">
              <div>
                <p className="mode-two-bank-card__title">{bank.title}</p>
                <p className="mode-two-bank-card__meta">
                  {categoryMeta.label} - {bank.topic}
                </p>
              </div>
              <span className="mode-two-chip">{bank.items.length}</span>
            </div>
            <div className="mode-two-token-list">
              {bank.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onInsertToken(item.text)}
                  className="mode-two-token"
                >
                  {item.text}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ModeTwoBankPanel;
