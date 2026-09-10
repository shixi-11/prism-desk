using System;
using System.Text;
using System.IO;
using System.Runtime.InteropServices;
using System.Runtime.Serialization.Json;
using System.Threading;

// Start suspended, assign to a kill-on-close Job, then resume. The host does not
// finish until every descendant has exited. No shell string interpolation.
class PrismProcess {
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFO {
    public int cb; public IntPtr reserved, desktop, title;
    public int x,y,w,h,cx,cy,fill,flags; public short show, reserved2;
    public IntPtr reservedPtr, input, output, error;
  }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr process, thread; public uint pid, tid; }
  [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMIT {
    public long processTime, jobTime; public uint flags; public UIntPtr min, max;
    public uint activeLimit; public UIntPtr affinity; public uint priority, scheduling;
  }
  [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong a,b,c,d,e,f; }
  [StructLayout(LayoutKind.Sequential)] struct EXTENDED_LIMIT { public BASIC_LIMIT basic; public IO_COUNTERS io; public UIntPtr processMemory, jobMemory, peakProcess, peakJob; }
  [StructLayout(LayoutKind.Sequential)] struct ACCOUNTING { public long user, kernel, periodUser, periodKernel; public uint faults, total, active, terminated; }
  [DllImport("kernel32", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr security, string name);
  [DllImport("kernel32", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int type, IntPtr info, uint length);
  [DllImport("kernel32", SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr job, int type, out ACCOUNTING info, uint length, IntPtr returned);
  [DllImport("kernel32", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string app, StringBuilder command, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string cwd, ref STARTUPINFO info, out PROCESS_INFORMATION process);
  [DllImport("kernel32")] static extern IntPtr GetStdHandle(int type);
  [DllImport("kernel32")] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32")] static extern uint WaitForSingleObject(IntPtr handle, uint ms);
  [DllImport("kernel32")] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
  [DllImport("kernel32")] static extern bool TerminateJobObject(IntPtr job, uint code);
  [DllImport("kernel32")] static extern bool TerminateProcess(IntPtr process, uint code);
  [DllImport("kernel32")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateEvent(IntPtr security, bool manualReset, bool initialState, string name);
  [DllImport("kernel32", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr OpenEvent(uint access, bool inherit, string name);
  [DllImport("kernel32")] static extern bool SetEvent(IntPtr handle);
  [DllImport("kernel32")] static extern uint WaitForMultipleObjects(uint count, IntPtr[] handles, bool waitAll, uint milliseconds);
  static string Quote(string value) {
    var result = new StringBuilder("\""); int slashes = 0;
    foreach(char c in value) {
      if(c == '\\') { slashes++; continue; }
      if(c == '"') result.Append('\\', slashes * 2 + 1).Append(c);
      else result.Append('\\', slashes).Append(c);
      slashes = 0;
    }
    return result.Append('\\', slashes * 2).Append('"').ToString();
  }
  static int Main(string[] args) {
    IntPtr job = IntPtr.Zero, stop = IntPtr.Zero; PROCESS_INFORMATION process = new PROCESS_INFORMATION();
    try {
      if(args.Length==2 && args[0]=="--stop") {
        if(!args[1].StartsWith("Local\\Prism-"))return 125;
        stop=OpenEvent(2,false,args[1]);
        return stop!=IntPtr.Zero && SetEvent(stop) ? 0 : 125;
      }
      if(args.Length != 2 && args.Length != 3) throw new Exception("Expected executable and base64 arguments");
      if(args.Length==3){if(!args[2].StartsWith("Local\\Prism-"))throw new Exception("Invalid stop event");stop=CreateEvent(IntPtr.Zero,false,false,args[2]);if(stop==IntPtr.Zero)throw new Exception("Cannot create stop event");}
      string[] argv;
      using(var stream = new MemoryStream(Convert.FromBase64String(args[1]))) argv = (string[])new DataContractJsonSerializer(typeof(string[])).ReadObject(stream);
      job = CreateJobObject(IntPtr.Zero, null); if(job == IntPtr.Zero) throw new Exception("CreateJobObject failed");
      var limits = new EXTENDED_LIMIT(); limits.basic.flags = 0x2000;
      int size = Marshal.SizeOf(limits); IntPtr ptr = Marshal.AllocHGlobal(size);
      try { Marshal.StructureToPtr(limits, ptr, false); if(!SetInformationJobObject(job, 9, ptr, (uint)size)) throw new Exception("SetInformationJobObject failed"); }
      finally { Marshal.FreeHGlobal(ptr); }
      var startup = new STARTUPINFO(); startup.cb = Marshal.SizeOf(startup); startup.flags = 0x101; startup.show = 0; // STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW, SW_HIDE
      startup.input = GetStdHandle(-10); startup.output = GetStdHandle(-11); startup.error = GetStdHandle(-12);
      var command = new StringBuilder(Quote(args[0])); foreach(string arg in argv) command.Append(' ').Append(Quote(arg));
      if(!CreateProcess(args[0], command, IntPtr.Zero, IntPtr.Zero, true, 0x08000004, IntPtr.Zero, null, ref startup, out process)) throw new Exception("CreateProcess failed: " + Marshal.GetLastWin32Error());
      if(!AssignProcessToJobObject(job, process.process)) { TerminateProcess(process.process, 125); throw new Exception("AssignProcessToJobObject failed: " + Marshal.GetLastWin32Error()); }
      if(ResumeThread(process.thread) == 0xffffffff) throw new Exception("ResumeThread failed");
      uint ended=stop==IntPtr.Zero ? WaitForSingleObject(process.process,0xffffffff) : WaitForMultipleObjects(2,new IntPtr[]{process.process,stop},false,0xffffffff);
      if(ended>1)throw new Exception("Cannot wait for execution");
      uint code=1223;if(ended==0)GetExitCodeProcess(process.process, out code);
      // No detached background work is allowed to outlive the requested turn.
      TerminateJobObject(job, code);
      ACCOUNTING accounting;
      do { if(!QueryInformationJobObject(job, 1, out accounting, (uint)Marshal.SizeOf(typeof(ACCOUNTING)), IntPtr.Zero)) throw new Exception("Cannot confirm child process shutdown"); if(accounting.active > 0) Thread.Sleep(30); } while(accounting.active > 0);
      return (int)code;
    } catch(Exception error) { Console.Error.WriteLine("PRISM_HOST: " + error.Message); return 125; }
    finally { if(process.thread != IntPtr.Zero) CloseHandle(process.thread); if(process.process != IntPtr.Zero) CloseHandle(process.process); if(job != IntPtr.Zero) CloseHandle(job); if(stop!=IntPtr.Zero)CloseHandle(stop); }
  }
}
