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

    this.psProcess.stderr.on('data', (data) => {
      console.error('[InputSimulator] PowerShell Error:', data.toString());
    });

    // Initialize C# wrapper for user32.dll
    const initScript = `
$code = @"
using System;
using System.Runtime.InteropServices;
public class InputSim {
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);
}
"@
Add-Type -TypeDefinition $code
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
      this.psProcess.stdin.write(cmd + '\n');
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
          this.executeCommand(`[InputSim]::SetCursorPos(${Math.round(event.x)}, ${Math.round(event.y)})`);
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
            this.executeCommand(`[InputSim]::mouse_event(${flag}, 0, 0, 0, 0)`);
          }
        }
        break;

      case 'wheel':
        if (event.deltaY !== undefined) {
          // MOUSEEVENTF_WHEEL = 0x0800
          // Browser wheel event: positive deltaY is scrolling down.
          // Windows mouse_event wheel: < 0 is backwards/down. So we negate the browser delta.
          // Typical browser delta is ~100 per tick, Windows wheel delta is 120 per tick.
          const wheelAmount = -Math.round(event.deltaY);
          this.executeCommand(`[InputSim]::mouse_event(0x0800, 0, 0, ${wheelAmount}, 0)`);
        }
        break;

      case 'keydown':
      case 'keyup':
        if (event.vkCode !== undefined) {
          // KEYEVENTF_KEYUP = 0x0002
          const flag = event.type === 'keyup' ? 0x0002 : 0x0000;
          this.executeCommand(`[InputSim]::keybd_event(${event.vkCode}, 0, ${flag}, 0)`);
        }
        break;
    }
  }
}

export const inputSimulator = new InputSimulator();
