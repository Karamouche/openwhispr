const { BrowserWindow, Notification } = require("electron");
const debugLogger = require("./debugLogger");

const NOTIFICATION_BODY_MAX = 140;

class OpenClawNotifier {
  constructor({ client, databaseManager, meetingDetectionEngine, windowManager }) {
    this.client = client;
    this.databaseManager = databaseManager;
    this.meetingDetectionEngine = meetingDetectionEngine;
    this.windowManager = windowManager;
    this.tabActive = false;
    this._handleMessageDone = this._handleMessageDone.bind(this);
    this._handleProactive = this._handleProactive.bind(this);
    this._handleSessionsChanged = this._handleSessionsChanged.bind(this);

    client.on("message-done", this._handleMessageDone);
    client.on("proactive-message", this._handleProactive);
    client.on("sessions-changed", this._handleSessionsChanged);
  }

  setTabActive(active) {
    this.tabActive = Boolean(active);
  }

  dispose() {
    this.client.off("message-done", this._handleMessageDone);
    this.client.off("proactive-message", this._handleProactive);
    this.client.off("sessions-changed", this._handleSessionsChanged);
  }

  _isWindowFocused() {
    return BrowserWindow.getAllWindows().some((w) => !w.isDestroyed() && w.isFocused());
  }

  _isDictationActive() {
    return Boolean(this.meetingDetectionEngine?._userRecording);
  }

  _resolveConversationId(sessionKey) {
    if (!sessionKey) return null;
    const row = this.databaseManager.findOpenClawConversationBySessionKey(sessionKey);
    return row?.id || null;
  }

  _handleSessionsChanged() {
    this._broadcast("openclaw-sessions-changed");
  }

  _handleMessageDone({ sessionKey, content, role }) {
    if (!sessionKey) return;
    const conversationId = this._resolveConversationId(sessionKey);
    if (!conversationId) {
      this._broadcast("openclaw-sessions-changed");
      return;
    }

    const activeSession = this.client.getActiveSession();
    const isForeground =
      this.tabActive && this._isWindowFocused() && activeSession === sessionKey;

    if (!isForeground) {
      this.databaseManager.addOpenClawMessage(
        conversationId,
        role || "assistant",
        typeof content === "string" ? content : ""
      );
      this.databaseManager.incrementOpenClawUnread(conversationId);
      this._broadcast("openclaw-sessions-changed");
    }
  }

  _handleProactive({ sessionKey, content, role, channel }) {
    if (!sessionKey) return;
    const conversationId = this._resolveConversationId(sessionKey);
    if (!conversationId) {
      this._broadcast("openclaw-sessions-changed");
      return;
    }

    this.databaseManager.addOpenClawMessage(
      conversationId,
      role || "assistant",
      typeof content === "string" ? content : ""
    );

    const activeSession = this.client.getActiveSession();
    const focused = this._isWindowFocused();
    const isForeground = this.tabActive && focused && activeSession === sessionKey;

    if (!isForeground) {
      this.databaseManager.incrementOpenClawUnread(conversationId);
    }
    this._broadcast("openclaw-sessions-changed");

    if ((!focused || !this.tabActive) && !this._isDictationActive()) {
      this._fireOsNotification({ conversationId, sessionKey, content, channel });
    }
  }

  _fireOsNotification({ conversationId, sessionKey, content, channel }) {
    if (!Notification.isSupported()) return;
    const conversation = this.databaseManager.getOpenClawConversation(conversationId);
    const title = conversation?.title || channel || "OpenClaw";
    const body =
      typeof content === "string" && content.length > 0
        ? content.slice(0, NOTIFICATION_BODY_MAX)
        : "New message";

    try {
      const notification = new Notification({ title, body, silent: false });
      notification.on("click", () => {
        const mainWindow = this.windowManager?.controlPanelWindow || this.windowManager?.mainWindow;
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
        this._broadcast("openclaw-open-conversation", { conversationId, sessionKey });
      });
      notification.show();
    } catch (err) {
      debugLogger.debug(
        "OpenClaw notification failed",
        { error: err.message },
        "openclaw"
      );
    }
  }

  _broadcast(channel, payload) {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    });
  }
}

module.exports = OpenClawNotifier;
