const { spawn, execFileSync } = require('node:child_process');
const unknown = message => Object.assign(Error(message), { code: 'STOP_UNKNOWN' });
function groupRunning(pgid, inspect=execFileSync){
  if(!Number.isInteger(pgid)||pgid<=0)throw Error('Invalid process group');
  const listing=inspect('/bin/ps',['-axo','pid=,pgid=,stat='],{encoding:'utf8',timeout:2000,maxBuffer:1024*1024,stdio:['ignore','pipe','ignore']});
  const rows=listing.split(/\r?\n/).map(line=>line.trim().split(/\s+/)).filter(fields=>fields.length===3&&/^\d+$/.test(fields[0])&&/^\d+$/.test(fields[1]));
  if(!rows.length)throw Error('Process group observation unavailable');
  return rows.some(fields=>Number(fields[1])===pgid&&!fields[2].startsWith('Z'));
}

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
      try { if(!groupRunning(child.pid))settle(); }
      catch { settle(unknown('无法确认 Unix 进程组已退出；执行状态保持待核对')); }
    };
    child.once('close', finish);
    poll = setInterval(() => {
      if (closed) finish();
    }, 250);
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

module.exports = { spawnUnix, confirmedStop, groupRunning };
