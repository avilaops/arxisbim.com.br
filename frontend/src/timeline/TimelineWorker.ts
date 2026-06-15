export function createTimelineWorker(): Worker {
  const workerCode = `
    self.onmessage = function(e) {
      const { activities, startDateStr, endDateStr, fps } = e.data;
      
      function parseUTCDate(dateStr) {
        if (!dateStr) return new Date();
        const parts = dateStr.split('T')[0].split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        return new Date(Date.UTC(y, m - 1, d));
      }

      const startDate = parseUTCDate(startDateStr);
      const endDate = parseUTCDate(endDateStr);
      
      const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const totalFrames = totalDays * fps;

      const frames = [];

      for (let f = 0; f <= totalFrames; f++) {
        const currentOffsetDays = f / fps;
        const currentDate = new Date(startDate.getTime() + currentOffsetDays * (1000 * 60 * 60 * 24));
        const currentTimestamp = currentDate.getTime();

        const elementStates = {};

        for (const act of activities) {
          const actStart = parseUTCDate(act.earlyStart || act.plannedStart).getTime();
          const actEnd = parseUTCDate(act.earlyFinish || act.plannedEnd).getTime();

          const elements = act.elements || [];
          for (const el of elements) {
            const globalId = el.globalId;
            const stateDuring = el.stateDuring || 'active';

            let state = 'not_started';

            if (stateDuring === 'removed') {
              if (currentTimestamp < actStart) {
                state = 'complete';
              } else if (currentTimestamp >= actStart && currentTimestamp <= actEnd) {
                state = 'removed';
              } else {
                state = 'hidden';
              }
            } else if (stateDuring === 'temporary') {
              if (currentTimestamp < actStart) {
                state = 'not_started';
              } else if (currentTimestamp >= actStart && currentTimestamp <= actEnd) {
                state = 'active';
              } else {
                state = 'hidden';
              }
            } else {
              if (currentTimestamp < actStart) {
                state = 'not_started';
              } else if (currentTimestamp >= actStart && currentTimestamp <= actEnd) {
                state = 'active';
              } else {
                state = 'complete';
              }
            }

            const existingState = elementStates[globalId];
            if (!existingState) {
              elementStates[globalId] = state;
            } else {
              if (state === 'active' || existingState === 'active') {
                elementStates[globalId] = 'active';
              } else if (state === 'removed' || existingState === 'removed') {
                elementStates[globalId] = 'removed';
              } else if (state === 'hidden' || existingState === 'hidden') {
                elementStates[globalId] = 'hidden';
              } else if (state === 'complete' || existingState === 'complete') {
                elementStates[globalId] = 'complete';
              }
            }
          }
        }
        frames.push({
          frameIndex: f,
          dateStr: currentDate.toISOString().slice(0, 10),
          elementStates
        });
      }

      self.postMessage({ frames });
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}
