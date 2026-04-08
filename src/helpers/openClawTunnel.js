const fs = require("fs");
const net = require("net");
const path = require("path");
const os = require("os");
const debugLogger = require("./debugLogger");

const PROBE_TIMEOUT_MS = 200;
const DEFAULT_LOCAL_PORT = 18789;
const DEFAULT_REMOTE_PORT = 18789;

class OpenClawTunnel {
  constructor(config = {}) {
    this.config = config;
    this.client = null;
    this.server = null;
    this.active = false;
  }

  updateConfig(config = {}) {
    this.config = config;
  }

  isActive() {
    return this.active;
  }

  async probe(host = "127.0.0.1", port = DEFAULT_LOCAL_PORT) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        socket.destroy();
        resolve(ok);
      };
      socket.setTimeout(PROBE_TIMEOUT_MS);
      socket.once("connect", () => finish(true));
      socket.once("timeout", () => finish(false));
      socket.once("error", () => finish(false));
      socket.connect(port, host);
    });
  }

  async ensure() {
    const localPort = this.config.localPort || DEFAULT_LOCAL_PORT;
    if (await this.probe("127.0.0.1", localPort)) {
      debugLogger.debug(
        "OpenClaw tunnel probe: loopback port already open",
        { port: localPort },
        "openclaw"
      );
      return { opened: false, reason: "already-open" };
    }

    if (!this.config.host || !this.config.user) {
      return { opened: false, reason: "no-ssh-config" };
    }

    await this._openSshTunnel(localPort);
    return { opened: true };
  }

  async _openSshTunnel(localPort) {
    const { Client } = require("ssh2");
    const keyPath = this._resolveKeyPath(this.config.keyPath);
    const privateKey = keyPath ? fs.readFileSync(keyPath) : undefined;
    const remoteHost = this.config.remoteHost || "127.0.0.1";
    const remotePort = this.config.remotePort || DEFAULT_REMOTE_PORT;

    const client = new Client();
    this.client = client;

    await new Promise((resolve, reject) => {
      client.on("ready", resolve);
      client.on("error", reject);
      client.connect({
        host: this.config.host,
        port: this.config.port || 22,
        username: this.config.user,
        privateKey,
      });
    });

    const server = net.createServer((socket) => {
      client.forwardOut(
        socket.remoteAddress || "127.0.0.1",
        socket.remotePort || 0,
        remoteHost,
        remotePort,
        (err, stream) => {
          if (err) {
            debugLogger.debug(
              "OpenClaw tunnel forwardOut failed",
              { error: err.message },
              "openclaw"
            );
            socket.destroy();
            return;
          }
          socket.pipe(stream).pipe(socket);
        }
      );
    });

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(localPort, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });

    this.server = server;
    this.active = true;
    debugLogger.debug(
      "OpenClaw SSH tunnel opened",
      { host: this.config.host, localPort, remotePort },
      "openclaw"
    );
  }

  _resolveKeyPath(configured) {
    if (configured && configured.length > 0) {
      if (configured.startsWith("~")) {
        return path.join(os.homedir(), configured.slice(1));
      }
      return configured;
    }
    return path.join(os.homedir(), ".ssh", "id_ed25519");
  }

  async close() {
    if (this.server) {
      try {
        this.server.close();
      } catch {}
      this.server = null;
    }
    if (this.client) {
      try {
        this.client.end();
      } catch {}
      this.client = null;
    }
    this.active = false;
  }
}

module.exports = OpenClawTunnel;
