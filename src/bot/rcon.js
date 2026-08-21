import { Rcon } from 'rcon-client';

export class RconService {
  constructor() {
    this.rcon = null;
    this.isConnected = false;
  }

  async connect(host, port, password) {
    if (!host || !password) {
      throw new Error('Host and Password are required for RCON');
    }
    try {
      this.rcon = await Rcon.connect({
        host,
        port: parseInt(port, 10) || 25575,
        password,
        timeout: 10000
      });
      this.isConnected = true;
      console.log(`[RCON] Connected successfully to ${host}:${port}`);
      return true;
    } catch (err) {
      this.isConnected = false;
      this.rcon = null;
      console.error('[RCON] Connection error:', err.message);
      throw err;
    }
  }

  async sendCommand(command) {
    if (!this.rcon || !this.isConnected) {
      return 'RCON is not connected.';
    }
    try {
      const response = await this.rcon.send(command);
      return response || 'Command executed.';
    } catch (err) {
      console.error(`[RCON] Error executing command '${command}':`, err.message);
      return `Error: ${err.message}`;
    }
  }

  async disconnect() {
    if (this.rcon) {
      try {
        await this.rcon.end();
      } catch (e) {
        // ignore disconnect errors
      }
      this.isConnected = false;
      this.rcon = null;
      console.log('[RCON] Disconnected');
    }
  }
}
