const { spawn } = require('node:child_process');
const unknown = message => Object.assign(Error(message), { code: 'STOP_UNKNOWN' });

function spawnUnix(command, args, options, spawnImpl = spawn) {
  const child = spawnImpl(command, args, { ...options, detached: true });
  let closed = false;
  child.once('close', () => { closed = true; });
  child.requestStop = () => new Promise((resolve, reject) => {
    if (!Number.isInteger(child.pid)) return reject(unknown('无法确认 Unix 执行进程编号；执行状态保持待核对'));
    try { process.kill(-child.pid, 'SIGTERM'); }
    catch (error) { if (error.code !== 'ESRCH') return reject(unknown('无法确认停止信号已送达；执行状态保持待核对')); }
    let settled = false;
    let poll, escalation;
    const timer = setTimeout(() => settle(unknown('停止超时，无法确认进程组已退出；执行状态保持待核对')), 10000);
    function settle(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(escalation);
      clearInterval(poll);
      error ? reject(error) : resolve();
    }
    const finish = () => {
      if (!closed) return;
      try { process.kill(-child.pid, 0); }
      catch (error) {
        if (error.code === 'ESRCH') settle();
        else settle(unknown('无法确认 Unix 进程组已退出；执行状态保持待核对'));
      }
    };
    child.once('close', finish);
    poll = setInterval(() => {
      if (closed) finish();
    }, 50);
    timer.unref?.();
    // Escalate only within this execution's process group after a grace period.
    escalation = setTimeout(() => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') settle(unknown('无法确认 Unix 进程组已退出；执行状态保持待核对')); }
    }, 1500);
    escalation.unref?.();
  });
  return child;
}

function confirmedStop(platform, cancelled, acknowledged, code) {
  return Boolean(cancelled && acknowledged && (platform === 'win32' ? code === 1223 : code === null));
}

module.exports = { spawnUnix, confirmedStop };
