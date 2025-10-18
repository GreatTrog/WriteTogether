export const pupilModes = [
  { label: "Overview", path: "/pupil" },
  { label: "Mode 1 - Colourful Semantics", path: "/pupil/mode-one" },
  { label: "Mode 2 - Click-to-Compose", path: "/pupil/mode-two" },
] as const;

export type PupilModePath = (typeof pupilModes)[number]["path"];
