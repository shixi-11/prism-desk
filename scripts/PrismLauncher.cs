using System;
using System.IO;
using System.Diagnostics;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

internal static class PrismLauncher {
    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    private static extern int MessageBox(IntPtr window, string text, string title, uint flags);
    private static string Quote(string value) {
        var result = new StringBuilder("\""); int slashes = 0;
        foreach (char c in value) {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') result.Append('\\', slashes * 2 + 1);
            else result.Append('\\', slashes);
            result.Append(c); slashes = 0;
        }
        return result.Append('\\', slashes * 2).Append('"').ToString();
    }
    [STAThread]
    private static int Main(string[] args) {
        try {
            string root = Directory.GetParent(AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar)).FullName;
            string runtime = Path.Combine(root, "runtime", "desktop", "Prism.exe");
            if (!File.Exists(runtime) || !File.Exists(Path.Combine(root, "electron", "main.cjs"))) throw new IOException("Prism application files are missing.");
            var forwarded = new List<string>(); forwarded.Add(Quote(root));
            bool hasData = false;
            foreach (string arg in args) {
                if (String.Equals(arg, root, StringComparison.OrdinalIgnoreCase)) continue;
                if (arg == "--user-data-dir" || arg.StartsWith("--user-data-dir=", StringComparison.Ordinal)) hasData = true;
                forwarded.Add(Quote(arg));
            }
            if (!hasData) forwarded.Add(Quote("--user-data-dir=" + Path.Combine(root, ".local", "desktop-runtime")));
            Process.Start(new ProcessStartInfo(runtime, String.Join(" ", forwarded.ToArray())) { WorkingDirectory=root, UseShellExecute=false, CreateNoWindow=true });
            return 0;
        } catch (Exception error) { MessageBox(IntPtr.Zero, error.Message, "Prism", 0x10); return 1; }
    }
}
