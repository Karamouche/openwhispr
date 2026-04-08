const EventEmitter = require("events");
const crypto = require("crypto");
const WebSocket = require("ws");
const { app } = require("electron");
const debugLogger = require("./debugLogger");

const PROTOCOL_VERSION = 3;
const CONNECT_TIMEOUT_MS = 15000;
const REQUEST_TIMEOUT_MS = 30000;
const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 16000, 30000];
const SENT_MESSAGE_TTL_MS = 10000;

class OpenClawClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.url = config.url || "ws://127.0.0.1:18789";
    this.token = config.token || "";
    this.ssh = config.ssh || null;
    this.ws = null;
    this.status = "disconnected";
    this.pendingRequests = new Map();
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.userInitiatedDisconnect = false;
    this.activeSessionKey = null;
    this.recentSends = new Map();
    this._connectResolve = null;
    this._connectReject = null;
    this._connectTimeout = null;
  }

  updateConfig(config = {}) {
    if (config.url) this.url = config.url;
    if (config.token !== undefined) this.token = config.token;
    if (config.ssh !== undefined) this.ssh = config.ssh;
  }

  isConnected() {
    return this.status === "connected";
  }

  getStatus() {
    return this.status;
  }

  _setStatus(next) {
    if (this.status === next) return;
    this.status = next;
    this.emit("status-change", next);
  }

  async connect() {
    if (this.status === "connected" || this.status === "connecting") return;
    this.userInitiatedDisconnect = false;
    this._clearReconnectTimer();
    await this._openSocket();
  }

  async disconnect() {
    this.userInitiatedDisconnect = true;
    this._clearReconnectTimer();
    this._failAllPending(new Error("Disconnected"));
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this._setStatus("disconnected");
  }

  async _openSocket() {
    this._setStatus(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");

    return new Promise((resolve, reject) => {
      let settled = false;
      const settleOk = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const settleErr = (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      let ws;
      try {
        ws = new WebSocket(this.url);
      } catch (err) {
        this._setStatus("error");
        this.emit("error", { code: "ws-open-failed", message: err.message });
        settleErr(err);
        this._scheduleReconnect();
        return;
      }

      this.ws = ws;

      const connectTimeout = setTimeout(() => {
        try {
          ws.close();
        } catch {}
        const err = new Error("OpenClaw connect timeout");
        this._setStatus("error");
        this.emit("error", { code: "connect-timeout", message: err.message });
        settleErr(err);
        this._scheduleReconnect();
      }, CONNECT_TIMEOUT_MS);

      ws.on("open", async () => {
        try {
          await this._performHandshake();
          clearTimeout(connectTimeout);
          this.reconnectAttempt = 0;
          this._setStatus("connected");
          settleOk();
        } catch (err) {
          clearTimeout(connectTimeout);
          this._setStatus("error");
          this.emit("error", { code: "handshake-failed", message: err.message });
          try {
            ws.close();
          } catch {}
          settleErr(err);
          this._scheduleReconnect();
        }
      });

      ws.on("message", (data) => {
        this._handleFrame(data);
      });

      ws.on("error", (err) => {
        debugLogger.debug("OpenClaw WebSocket error", { error: err.message }, "openclaw");
        this.emit("error", { code: "ws-error", message: err.message });
      });

      ws.on("close", (code, reason) => {
        clearTimeout(connectTimeout);
        const wasConnected = this.status === "connected";
        this._failAllPending(new Error("Connection closed"));
        this.ws = null;
        debugLogger.debug(
          "OpenClaw WebSocket closed",
          { code, reason: reason?.toString(), wasConnected },
          "openclaw"
        );
        if (this.userInitiatedDisconnect) {
          this._setStatus("disconnected");
          return;
        }
        this._scheduleReconnect();
      });
    });
  }

  _performHandshake() {
    const params = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: "openwhispr",
        version: app.getVersion(),
        platform: process.platform,
        mode: "desktop",
      },
      role: "operator",
      scopes: ["operator.read", "operator.write"],
      auth: { token: this.token },
    };
    return this._sendRequest("connect", params, CONNECT_TIMEOUT_MS).then((payload) => {
      if (!payload || payload.type !== "hello-ok") {
        throw new Error("Unexpected handshake response");
      }
      return payload;
    });
  }

  _sendRequest(method, params = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("OpenClaw not connected"));
        return;
      }
      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`OpenClaw request ${method} timed out`));
      }, timeoutMs);
      this.pendingRequests.set(id, { resolve, reject, timer, method });
      try {
        this.ws.send(JSON.stringify({ type: "req", id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  _handleFrame(data) {
    let frame;
    try {
      frame = JSON.parse(data.toString());
    } catch (err) {
      debugLogger.debug("OpenClaw frame parse error", { error: err.message }, "openclaw");
      return;
    }

    if (frame.type === "res") {
      const pending = this.pendingRequests.get(frame.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(frame.id);
      if (frame.ok) {
        pending.resolve(frame.payload);
      } else {
        const message = frame.error?.message || "OpenClaw request failed";
        pending.reject(new Error(message));
      }
      return;
    }

    if (frame.type === "event") {
      this._handleEvent(frame);
    }
  }

  _handleEvent(frame) {
    const eventName = frame.event;
    const payload = frame.payload || {};
    const sessionKey = payload.sessionKey || payload.session_key || null;

    switch (eventName) {
      case "sessions.changed":
      case "presence":
      case "tick":
      case "health":
        this.emit("sessions-changed");
        return;
      case "session.tool": {
        const messageId = payload.messageId || payload.message_id;
        if (payload.phase === "result") {
          this.emit("tool-result", {
            sessionKey,
            messageId,
            tool: payload.tool,
            output: payload.output,
          });
        } else {
          this.emit("tool-call", {
            sessionKey,
            messageId,
            tool: payload.tool,
            input: payload.input,
          });
        }
        return;
      }
      case "session.message":
      case "chat": {
        const messageId = payload.messageId || payload.message_id;
        const delta = payload.delta;
        const content = payload.content;
        const role = payload.role || "assistant";
        if (typeof delta === "string" && delta.length > 0) {
          this.emit("message-chunk", { sessionKey, messageId, delta });
          return;
        }
        if (payload.done || typeof content === "string") {
          if (this._isProactive(sessionKey)) {
            this.emit("proactive-message", {
              sessionKey,
              messageId,
              role,
              content: content ?? "",
              channel: payload.channel,
            });
          } else {
            this.emit("message-done", {
              sessionKey,
              messageId,
              content: content ?? "",
              toolCalls: payload.toolCalls || payload.tool_calls,
            });
          }
          return;
        }
        return;
      }
      default:
        return;
    }
  }

  _isProactive(sessionKey) {
    if (!sessionKey) return false;
    const sentAt = this.recentSends.get(sessionKey);
    if (!sentAt) return true;
    return Date.now() - sentAt > SENT_MESSAGE_TTL_MS;
  }

  _trackSend(sessionKey) {
    this.recentSends.set(sessionKey, Date.now());
    const cutoff = Date.now() - SENT_MESSAGE_TTL_MS;
    for (const [key, ts] of this.recentSends) {
      if (ts < cutoff) this.recentSends.delete(key);
    }
  }

  _failAllPending(err) {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pendingRequests.clear();
  }

  _clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  _scheduleReconnect() {
    if (this.userInitiatedDisconnect) return;
    this._clearReconnectTimer();
    const delay =
      BACKOFF_STEPS_MS[Math.min(this.reconnectAttempt, BACKOFF_STEPS_MS.length - 1)];
    this.reconnectAttempt += 1;
    this._setStatus("reconnecting");
    debugLogger.debug(
      "OpenClaw scheduling reconnect",
      { attempt: this.reconnectAttempt, delayMs: delay },
      "openclaw"
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._openSocket().catch(() => {});
    }, delay);
  }

  async listSessions() {
    const payload = await this._sendRequest("sessions.list");
    return payload?.sessions || [];
  }

  async createSession({ title } = {}) {
    const payload = await this._sendRequest("sessions.create", { title });
    return payload?.sessionKey || payload?.session_key;
  }

  setActiveSession(sessionKey) {
    this.activeSessionKey = sessionKey || null;
  }

  getActiveSession() {
    return this.activeSessionKey;
  }

  async getHistory(sessionKey, opts = {}) {
    const payload = await this._sendRequest("chat.history", { sessionKey, ...opts });
    return { messages: payload?.messages || [] };
  }

  async sendMessage(sessionKey, text) {
    this._trackSend(sessionKey);
    const payload = await this._sendRequest("chat.send", { sessionKey, text });
    return { messageId: payload?.messageId || payload?.message_id };
  }

  async abort(sessionKey) {
    await this._sendRequest("chat.abort", { sessionKey });
  }
}

module.exports = OpenClawClient;
