// Streamed reasoning, tool activity and reply text can arrive dozens of times per
// second. Keep the latest values here and publish them to React at most once per
// interval, so a long reply does not re-render the whole window for every chunk.
export const LIVE_TEXT_INTERVAL = 100;
export const emptyLiveText = () => ({thinking: '', activity: '', streaming: ''});

export function createLiveText(publish, {interval = LIVE_TEXT_INTERVAL, schedule = setTimeout, cancel = clearTimeout} = {}) {
  const value = emptyLiveText();
  let timer = null;
  const flush = () => {
    if (timer !== null) { cancel(timer); timer = null; }
    publish({...value});
  };
  // Values may be strings or updater functions of the previous value.
  // Resets pass {now:true} so a task switch or finished turn clears immediately.
  const change = (patch, {now = false} = {}) => {
    for (const [key, next] of Object.entries(patch)) value[key] = typeof next === 'function' ? next(value[key]) : next;
    if (now) flush();
    else if (timer === null) timer = schedule(() => { timer = null; publish({...value}); }, interval);
  };
  const dispose = () => { if (timer !== null) { cancel(timer); timer = null; } };
  return {value, change, flush, dispose};
}
