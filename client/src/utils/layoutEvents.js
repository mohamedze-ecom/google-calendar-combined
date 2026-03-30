/**
 * Lays out overlapping events side-by-side (like Google Calendar does).
 * Returns events with added `column` and `totalColumns` properties.
 */
export function layoutEvents(events) {
  if (events.length === 0) return [];

  // Sort by start time, then by duration (longer first)
  const sorted = [...events].sort((a, b) => {
    const aStart = new Date(a.start).getTime();
    const bStart = new Date(b.start).getTime();
    if (aStart !== bStart) return aStart - bStart;
    const aDur = new Date(a.end).getTime() - aStart;
    const bDur = new Date(b.end).getTime() - bStart;
    return bDur - aDur; // longer events first
  });

  // Group into collision clusters
  const clusters = [];
  let currentCluster = [sorted[0]];
  let clusterEnd = new Date(sorted[0].end).getTime();

  for (let i = 1; i < sorted.length; i++) {
    const evStart = new Date(sorted[i].start).getTime();
    if (evStart < clusterEnd) {
      // Overlaps with current cluster
      currentCluster.push(sorted[i]);
      clusterEnd = Math.max(clusterEnd, new Date(sorted[i].end).getTime());
    } else {
      clusters.push(currentCluster);
      currentCluster = [sorted[i]];
      clusterEnd = new Date(sorted[i].end).getTime();
    }
  }
  clusters.push(currentCluster);

  // For each cluster, assign columns
  const result = [];
  for (const cluster of clusters) {
    const columns = []; // Each column is an array of events

    for (const event of cluster) {
      const evStart = new Date(event.start).getTime();
      let placed = false;

      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1];
        const lastEnd = new Date(lastInCol.end).getTime();
        if (evStart >= lastEnd) {
          // Fits in this column
          columns[col].push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([event]);
      }
    }

    const totalColumns = columns.length;
    for (let col = 0; col < columns.length; col++) {
      for (const event of columns[col]) {
        result.push({
          ...event,
          column: col,
          totalColumns,
        });
      }
    }
  }

  return result;
}
