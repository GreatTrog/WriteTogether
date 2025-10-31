import { useEffect, useMemo, useState } from "react";

import { normaliseTimeline, rollingAverage } from "@writetogether/analytics";

import { useTeacherStore } from "../../store/useTeacherStore";

const draftStorageKey = "writetogether-mode2-draft";

// Converts the mock store into insight tiles for the preview dashboard.
const AnalyticsPanel = () => {
  const { classes, assignments } = useTeacherStore();
  const [currentDraftWords, setCurrentDraftWords] = useState(0);

  useEffect(() => {
    // Check the Mode 2 draft cache to simulate a live writing signal.
    const draft = window.localStorage.getItem(draftStorageKey) ?? "";
    const words = draft.trim().match(/\b[a-zA-Z']+\b/g)?.length ?? 0;
    setCurrentDraftWords(words);
  }, []);

  const totals = useMemo(() => {
    // Roll up high-level stats so tiles stay fast even as data grows.
    const pupilCount = classes.reduce(
      (sum, group) => sum + group.pupils.length,
      0,
    );
    const mode1Pupils = classes.reduce(
      (sum, group) =>
        sum +
        group.pupils.filter((pupil) => pupil.currentMode === "mode1").length,
      0,
    );
    const mode2Pupils = pupilCount - mode1Pupils;

    const ttsAssignments = assignments.filter(
      (assignment) => assignment.settings?.enableTTS,
    ).length;

    const wordLimits = assignments
      .map((assignment) => assignment.settings?.wordLimit)
      .filter((limit): limit is number => typeof limit === "number");

    const averageWordLimit =
      wordLimits.length > 0
        ? Math.round(
            wordLimits.reduce((sum, limit) => sum + limit, 0) /
              wordLimits.length,
          )
        : 0;

    const bankFrequency = assignments.reduce((map, assignment) => {
      assignment.wordBankIds.forEach((id) => {
        map.set(id, (map.get(id) ?? 0) + 1);
      });
      return map;
    }, new Map<string, number>());

    const busiestBanks = Array.from(bankFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return {
      pupilCount,
      mode1Pupils,
      mode2Pupils,
      ttsAssignments,
      averageWordLimit,
      busiestBanks,
    };
  }, [classes, assignments]);

  const timeline = useMemo(() => {
    // Build a rolling average so the simple chart reads like a trend.
    const data = assignments.map((assignment) => ({
      timestamp: assignment.dueAt
        ? new Date(assignment.dueAt).toISOString()
        : new Date(Date.now()).toISOString(),
      value: assignment.wordBankIds.length,
    }));
    const normalised = normaliseTimeline(data);
    return rollingAverage(normalised, 3);
  }, [assignments]);

  const upcoming = useMemo(() => {
    // Flag near-term deadlines to drive teacher actions during testing.
    const now = Date.now();
    const weekAhead = now + 1000 * 60 * 60 * 24 * 7;
    return assignments
      .filter((assignment) => {
        if (!assignment.dueAt) {
          return false;
        }
        const due = new Date(assignment.dueAt).getTime();
        return due >= now && due <= weekAhead;
      })
      .sort(
        (a, b) =>
          new Date(a.dueAt ?? 0).getTime() -
          new Date(b.dueAt ?? 0).getTime(),
      );
  }, [assignments]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pupils onboarded
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totals.pupilCount}
          </p>
          <p className="text-xs text-slate-500">
            {totals.mode1Pupils} on Mode 1 - {totals.mode2Pupils} on Mode 2
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assignments with TTS
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totals.ttsAssignments}
          </p>
          <p className="text-xs text-slate-500">
            {currentDraftWords} words in current pupil draft
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Typical word limit
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totals.averageWordLimit || "--"}
          </p>
          <p className="text-xs text-slate-500">
            Average limit across published tasks
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Busy word banks
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {totals.busiestBanks.length === 0 ? (
              <li>No data yet</li>
            ) : (
              totals.busiestBanks.map(([bankId, count]) => (
                <li key={bankId}>
                  {bankId} - {count} assignment(s)
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Bank usage trend (rolling average)
        </h2>
        {timeline.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Create more assignments to unlock trend insights.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-6">
            {timeline.slice(-6).map((point) => (
              <div
                key={point.timestamp}
                className="rounded-md bg-slate-50 p-3 text-center"
              >
                <p className="font-semibold text-slate-900">
                  {point.value.toFixed(1)}
                </p>
                <p>{new Date(point.timestamp).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Due in the next 7 days
          </h2>
          <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {upcoming.length}
          </span>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            All clear - no assignments due this week.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {upcoming.map((assignment) => {
              const dueAt = assignment.dueAt
                ? new Date(assignment.dueAt)
                : null;
              return (
                <li
                  key={assignment.id}
                  className="rounded-md bg-slate-50 px-3 py-2"
                >
                  <p className="font-medium text-slate-900">
                    {assignment.title}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Due {dueAt ? dueAt.toLocaleDateString() : "flexible"} -{" "}
                    {assignment.modeLock === "mode2"
                      ? "Click-to-Compose"
                      : "Colourful Semantics"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AnalyticsPanel;
