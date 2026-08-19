import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { RaInputEvent } from './types.js';

class InputSimulator {
  private psProcess: ChildProcessWithoutNullStreams | null = null;
  private isActive: boolean = false;
  private currentSessionToken: string | null = null;

  public start(sessionToken: string) {
    if (this.isActive) {
      this.stop();
    }

    this.currentSessionToken = sessionToken;
    this.isActive = true;

    // Spawn a persistent PowerShell process that reads from stdin.
    // This eliminates the 50-150ms startup latency of spawning a new process per input event.
    this.psProcess = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-NoExit', '-Command', '-']);
    console.log('[InputSimulator] Spawned persistent PowerShell process (PID:', this.psProcess.pid, ')');

    this.psProcess.stderr.on('data', (data) => {
      console.error('[InputSimulator] PowerShell Error:', data.toString());
    });
    
    this.psProcess.stdout.on('data', (data) => {
      console.log('[InputSimulator] PowerShell Output:', data.toString());
    });
    const initScript = `
$code = @"
using System;
using System.Runtime.InteropServices;
public class InputSim {
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);
    
    public static void Run() {
        string line;
        while ((line = Console.ReadLine()) != null) {
            if (line == "EXIT") break;
            if (line.Length < 2) continue;
            try {
                string[] p = line.Split(',');
                if (p[0] == "M") {
                    mouse_event(0x8001, int.Parse(p[1]), int.Parse(p[2]), 0, 0);
                } else if (p[0] == "C") {
                    mouse_event(int.Parse(p[1]), 0, 0, int.Parse(p[2]), 0);
                } else if (p[0] == "K") {
                    keybd_event(byte.Parse(p[1]), 0, int.Parse(p[2]), 0);
                }
            } catch {}
        }
    }
}
"@
Add-Type -TypeDefinition $code
[InputSim]::Run()
`;
    this.executeCommand(initScript);
  }

  public stop() {
    this.isActive = false;
    this.currentSessionToken = null;
    if (this.psProcess) {
      this.psProcess.stdin.end();
      this.psProcess.kill();
      this.psProcess = null;
    }
  }

  private executeCommand(cmd: string) {
    if (this.psProcess && this.isActive) {
      // PowerShell requires CRLF line endings when reading from stdin.
      // Without this, here-string (@"..."@) blocks fail to parse, preventing
      // the C# InputSim class from compiling and breaking all input injection.
      const normalized = cmd.replace(/\r?\n/g, '\r\n');
      if (!normalized.startsWith('M,')) {
        console.log(`[InputSimulator] Executing native command:`, normalized.trim());
      }
      this.psProcess.stdin.write(normalized + '\r\n');
    } else {
      console.warn('[InputSimulator] Cannot execute command: psProcess missing or inactive', { hasProcess: !!this.psProcess, isActive: this.isActive });
    }
  }

  public handleInputEvent(event: RaInputEvent) {
    // Security: Only accept inputs if there's an active session and the token matches
    if (!this.isActive || event.token !== this.currentSessionToken) {
      return;
    }

    switch (event.type) {
      case 'mousemove':
        if (event.x !== undefined && event.y !== undefined) {
          // Map normalized coords (0.0 - 1.0) to absolute coords (0 - 65535)
          const dx = Math.round(event.x * 65535);
          const dy = Math.round(event.y * 65535);
          this.executeCommand(`M,${dx},${dy}`);
        }
        break;

      case 'mousedown':
      case 'mouseup':
        if (event.button) {
          let flag = 0;
          const isDown = event.type === 'mousedown';
          if (event.button === 'left') flag = isDown ? 0x0002 : 0x0004;
          else if (event.button === 'right') flag = isDown ? 0x0008 : 0x0010;
          else if (event.button === 'middle') flag = isDown ? 0x0020 : 0x0040;
          
          if (flag !== 0) {
            this.executeCommand(`C,${flag},0`);
          }
        }
        break;

      case 'wheel':
        if (event.deltaY !== undefined) {
          const wheelAmount = -Math.round(event.deltaY);
          // MOUSEEVENTF_WHEEL = 0x0800
          this.executeCommand(`C,2048,${wheelAmount}`);
        }
        break;

      case 'keydown':
      case 'keyup':
        if (event.vkCode !== undefined) {
          const flag = event.type === 'keyup' ? 0x0002 : 0x0000;
          this.executeCommand(`K,${event.vkCode},${flag}`);
        }
        break;
    }
  }
}

export const inputSimulator = new InputSimulator();
