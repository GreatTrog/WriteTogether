export type TimelinePoint = {
  timestamp: string;
  value: number;
};

export const normaliseTimeline = (points: TimelinePoint[]) =>
  points
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

export const rollingAverage = (points: TimelinePoint[], window = 3) => {
  if (window <= 0) {
    throw new Error("Window must be greater than zero");
  }

  return points.map((point, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = points.slice(start, index + 1);
    const total = slice.reduce((acc, current) => acc + current.value, 0);
    return {
      ...point,
      value: Number((total / slice.length).toFixed(2)),
    };
  });
};
