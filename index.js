"use strict";

const { addLog, getLogs } = require("./logger");
const mineflayer = require("mineflayer");
const config = require("./settings.json");
const express = require("express");
const http = require("http");
const https = require("https");

// ============================================================
// EXPRESS SERVER
// ============================================================
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;

// ============================================================
// BOT STATE
// ============================================================
let botState = {
  connected: false,
  lastActivity: Date.now(),
  reconnectAttempts: 0,
  startTime: Date.now(),
  errors: [],
  wasThrottled: false,
};

// ============================================================
// DASHBOARD
// ============================================================
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${config.name} Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" media="print" onload="this.media='all'"
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">

        <style>
          *, *::before, *::after { box-sizing: border-box; }

          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #0d1117;
            color: #e6edf3;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
          }

          main {
            width: 100%;
            max-width: 400px;
          }

          header {
            margin-bottom: 28px;
          }

          header h1 {
            font-size: 26px;
            font-weight: 700;
            color: #f0f6fc;
            margin: 0;
            line-height: 1.2;
          }

          header p {
            font-size: 14px;
            color: #8b949e;
            margin: 6px 0 0;
            line-height: 1.5;
          }

          .status-section {
            border-radius: 12px;
            padding: 20px 24px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .status-section.online {
            background: #0d2218;
            border: 2px solid #238636;
          }

          .status-section.offline {
            background: #200d0d;
            border: 2px solid #da3633;
          }

          .status-icon {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
          }

          .status-icon.online {
            background: #238636;
          }

          .status-icon.offline {
            background: #da3633;
          }

          .status-label {
            font-size: 18px;
            font-weight: 700;
            line-height: 1.2;
          }

          .status-label.online {
            color: #3fb950;
          }

          .status-label.offline {
            color: #f85149;
          }

          .status-detail {
            font-size: 13px;
            color: #8b949e;
            margin-top: 3px;
          }

          dl {
            margin: 0;
          }

          .stat-card {
            background: #161b22;
            border: 1px solid #21262d;
            border-radius: 10px;
            padding: 16px 20px;
            margin-bottom: 10px;
          }

          dt {
            font-size: 12px;
            color: #8b949e;
            font-weight: 600;
            margin-bottom: 4px;
          }

          dd {
            margin: 0;
            font-size: 17px;
            font-weight: 600;
            color: #e6edf3;
            line-height: 1.3;
          }

          .stat-detail {
            margin: 4px 0 0;
            font-size: 11px;
            color: #6e7681;
          }

          .controls {
            margin-top: 8px;
          }

          .btn-grid {
            display: grid;
            gap: 10px;
            margin-bottom: 10px;
          }

          .btn-grid-2 {
            grid-template-columns: 1fr 1fr;
          }

          .btn-primary {
            min-height: 52px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            letter-spacing: 0.3px;
            font-family: inherit;
          }

          .btn-start {
            border: 2px solid #238636;
            background: #0d2218;
            color: #3fb950;
          }

          .btn-stop {
            border: 2px solid #da3633;
            background: #200d0d;
            color: #f85149;
          }

          .btn-secondary {
            min-height: 44px;
            border-radius: 10px;
            border: 1px solid #21262d;
            background: #161b22;
            color: #8b949e;
            font-size: 13px;
            font-weight: 500;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: inherit;
          }

          footer {
            margin-top: 20px;
            text-align: center;
          }

          footer p {
            font-size: 12px;
            color: #484f58;
            margin: 0;
          }
        </style>
      </head>

      <body>
        <main>

          <header>
            <h1>AFK Bot Dashboard</h1>
            <p>Minecraft server bot &middot; Live status</p>
          </header>

          <section
            id="status-section"
            role="status"
            aria-live="polite"
            class="status-section offline"
          >
            <div id="status-icon" class="status-icon offline">&#x2717;</div>

            <div>
              <div id="status-label" class="status-label offline">
                Connecting…
              </div>

              <div id="status-detail" class="status-detail">
                Establishing connection
              </div>
            </div>
          </section>

          <section>
            <dl>

              <div class="stat-card">
                <dt>Uptime</dt>
                <dd id="uptime-text">—</dd>
                <p class="stat-detail">Time since last connection</p>
              </div>

              <div class="stat-card">
                <dt>Coordinates</dt>
                <dd id="coords-text">Searching…</dd>
                <p class="stat-detail">Bot's current in-game position</p>
              </div>

              <div class="stat-card">
                <dt>Server address</dt>
                <dd>${config.server.ip}</dd>
                <p class="stat-detail">Minecraft server hostname</p>
              </div>

            </dl>
          </section>

          <section class="controls">

            <div class="btn-grid btn-grid-2">
              <button class="btn-primary btn-start" onclick="startBot()">
                Start bot
              </button>

              <button class="btn-primary btn-stop" onclick="stopBot()">
                Stop bot
              </button>
            </div>

            <div class="btn-grid btn-grid-2">
              <a href="/tutorial" class="btn-secondary">
                Setup guide
              </a>

              <a href="/logs" class="btn-secondary">
                View logs
              </a>
            </div>

          </section>

          <footer>
            <p>Status updates every 5 seconds</p>
          </footer>

        </main>

        <script>
          function formatUptime(s) {
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;

            if (h > 0) return h + 'h ' + m + 'm ' + sec + 's';
            if (m > 0) return m + 'm ' + sec + 's';

            return sec + ' seconds';
          }

          async function update() {
            try {
              const r = await fetch('/health');
              const data = await r.json();

              const online = data.status === 'connected';

              const section = document.getElementById('status-section');
              const icon = document.getElementById('status-icon');
              const label = document.getElementById('status-label');
              const detail = document.getElementById('status-detail');

              section.className =
                'status-section ' + (online ? 'online' : 'offline');

              icon.className =
                'status-icon ' + (online ? 'online' : 'offline');

              icon.textContent = online ? '✓' : '✗';

              label.className =
                'status-label ' + (online ? 'online' : 'offline');

              label.textContent =
                online ? 'Connected' : 'Disconnected';

              detail.textContent =
                online
                  ? 'Bot is active on the server'
                  : 'Attempting to reconnect';

              document.getElementById('uptime-text').textContent =
                formatUptime(data.uptime);

              if (data.coords) {
                const x = Math.floor(data.coords.x);
                const y = Math.floor(data.coords.y);
                const z = Math.floor(data.coords.z);

                document.getElementById('coords-text').textContent =
                  'X ' + x + ', Y ' + y + ', Z ' + z;
              } else {
                document.getElementById('coords-text').textContent =
                  'Searching…';
              }

            } catch (e) {
              const label =
                document.getElementById('status-label');

              label.className = 'status-label offline';
              label.textContent = 'Unreachable';
            }
          }

          async function startBot() {
            const r =
              await fetch('/start', { method: 'POST' });

            const data = await r.json();

            alert(data.success ? 'Bot started!' : data.msg);

            update();
          }

          async function stopBot() {
            const r =
              await fetch('/stop', { method: 'POST' });

            const data = await r.json();

            alert(data.success ? 'Bot stopped!' : data.msg);

            update();
          }

          setInterval(update, 5000);
          update();
        </script>

      </body>
    </html>
  `);
});

// ============================================================
// TUTORIAL
// ============================================================
app.get("/tutorial", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">

      <head>
        <title>${config.name} - Setup Guide</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <style>
          body {
            font-family: Arial, sans-serif;
            background: #0d1117;
            color: #e6edf3;
            margin: 0;
            padding: 40px 24px;
          }

          main {
            width: 100%;
            max-width: 560px;
            margin: 0 auto;
          }

          .back-btn {
            display: inline-block;
            color: #8b949e;
            text-decoration: none;
            background: #161b22;
            border: 1px solid #21262d;
            border-radius: 8px;
            padding: 7px 14px;
            margin-bottom: 32px;
          }

          header {
            margin-bottom: 32px;
          }

          header h1 {
            font-size: 26px;
            color: #f0f6fc;
            margin: 0;
          }

          header p {
            font-size: 14px;
            color: #8b949e;
          }

          .step-card {
            background: #161b22;
            border: 1px solid #21262d;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 16px;
          }

          .step-header {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 18px;
          }

          .step-number {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #0d2218;
            border: 2px solid #238636;
            color: #3fb950;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
          }

          .step-title {
            font-size: 16px;
            color: #f0f6fc;
          }

          li {
            margin-bottom: 10px;
            color: #8b949e;
            line-height: 1.6;
          }

          code {
            background: #21262d;
            border: 1px solid #30363d;
            padding: 2px 7px;
            border-radius: 5px;
          }

          footer {
            margin-top: 32px;
            text-align: center;
          }

          footer p {
            font-size: 12px;
            color: #484f58;
          }
        </style>
      </head>

      <body>

        <main>

          <a href="/" class="back-btn">
            &#8592; Back to Dashboard
          </a>

          <header>
            <h1>Setup Guide</h1>
            <p>Get your AFK bot running</p>
          </header>

          <div class="step-card">
            <div class="step-header">
              <div class="step-number">1</div>
              <h2 class="step-title">Configure Aternos</h2>
            </div>

            <ol>
              <li>Go to <strong>Aternos</strong> and open your server.</li>
              <li>Install <strong>Paper/Bukkit</strong>.</li>
              <li>Enable <strong>Cracked</strong> mode.</li>
              <li>
                Install
                <code>ViaVersion</code>,
                <code>ViaBackwards</code>,
                <code>ViaRewind</code>
                if needed.
              </li>
            </ol>
          </div>

          <div class="step-card">
            <div class="step-header">
              <div class="step-number">2</div>
              <h2 class="step-title">GitHub Setup</h2>
            </div>

            <ol>
              <li>Upload the project to GitHub.</li>
              <li>Edit <code>settings.json</code>.</li>
              <li>Set your server IP and port.</li>
            </ol>
          </div>

          <div class="step-card">
            <div class="step-header">
              <div class="step-number">3</div>
              <h2 class="step-title">Deploy</h2>
            </div>

            <ol>
              <li>Import the GitHub repo.</li>
              <li>Use <code>npm start</code>.</li>
              <li>Start the bot.</li>
            </ol>
          </div>

          <footer>
            <p>AFK Bot Dashboard &middot; ${config.name}</p>
          </footer>

        </main>

      </body>
    </html>
  `);
});

// ============================================================
// HEALTH
// ============================================================
app.get("/health", (req, res) => {
  res.json({
    status: botState.connected ? "connected" : "disconnected",
    uptime: Math.floor(
      (Date.now() - botState.startTime) / 1000
    ),
    coords:
      bot && bot.entity
        ? bot.entity.position
        : null,
    lastActivity: botState.lastActivity,
    reconnectAttempts: botState.reconnectAttempts,
    memoryUsage:
      process.memoryUsage().heapUsed / 1024 / 1024,
  });
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

// ============================================================
// LOGS
// ============================================================
app.get("/logs", (req, res) => {
  const logs = getLogs();

  const escapeHTML = (str) =>
    str.replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m]
    );

  const logCount = logs.length;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">

      <head>
        <title>${config.name} - Logs</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <style>
          body {
            font-family: Arial, sans-serif;
            background: #0d1117;
            color: #e6edf3;
            margin: 0;
            padding: 40px 24px;
          }

          main {
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
          }

          .back-btn {
            display: inline-block;
            color: #8b949e;
            text-decoration: none;
            background: #161b22;
            border: 1px solid #21262d;
            border-radius: 8px;
            padding: 7px 14px;
            margin-bottom: 32px;
          }

          h1 {
            color: #f0f6fc;
          }

          .log-card {
            background: #0d1117;
            border: 1px solid #21262d;
            border-radius: 12px;
            overflow: hidden;
          }

          .log-card-header {
            background: #161b22;
            border-bottom: 1px solid #21262d;
            padding: 12px 18px;
          }

          .log-body {
            padding: 16px 18px;
            max-height: 560px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 12.5px;
            line-height: 1.7;
          }

          .log-entry {
            display: block;
            padding: 1px 0;
            white-space: pre-wrap;
            word-break: break-all;
          }

          .log-entry.error {
            color: #ff7b72;
          }

          .log-entry.warn {
            color: #e3b341;
          }

          .log-entry.success {
            color: #3fb950;
          }

          .log-entry.control {
            color: #58a6ff;
          }

          .log-entry.default {
            color: #8b949e;
          }

          .console-row {
            display: flex;
            align-items: center;
            border-top: 1px solid #21262d;
            background: #0d1117;
            padding: 10px 18px;
            gap: 10px;
          }

          .console-prompt {
            color: #3fb950;
            font-weight: 700;
          }

          .console-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            font-family: monospace;
            color: #e6edf3;
          }

          .console-send {
            background: #0d2218;
            border: 1px solid #238636;
            color: #3fb950;
            padding: 5px 14px;
            border-radius: 6px;
            cursor: pointer;
          }
        </style>
      </head>

      <body>

        <main>

          <a href="/" class="back-btn">
            &#8592; Back to Dashboard
          </a>

          <h1>Bot Logs</h1>

          <div class="log-card">

            <div class="log-card-header">
              Bot log
            </div>

            <div class="log-body" id="log-body">

              ${
                logCount === 0
                  ? `<div>No log entries yet.</div>`
                  : logs
                      .map((l) => {
                        const escaped = escapeHTML(l);
                        const lower = l.toLowerCase();

                        let cls = "default";

                        if (
                          lower.includes("error") ||
                          lower.includes("fail")
                        ) {
                          cls = "error";
                        } else if (
                          lower.includes("warn")
                        ) {
                          cls = "warn";
                        } else if (
                          lower.includes("[control]")
                        ) {
                          cls = "control";
                        } else if (
                          lower.includes("connect") ||
                          lower.includes("join") ||
                          lower.includes("spawn")
                        ) {
                          cls = "success";
                        }

                        return `
                          <span class="log-entry ${cls}">
                            ${escaped}
                          </span>
                        `;
                      })
                      .join("")
              }

            </div>

            <div class="console-row">

              <span class="console-prompt">&gt;</span>

              <input
                id="console-input"
                class="console-input"
                type="text"
                placeholder="Type a command or message..."
                autocomplete="off"
              >

              <button
                id="console-send"
                class="console-send"
              >
                Send
              </button>

            </div>

          </div>

        </main>

        <script>
          const input =
            document.getElementById("console-input");

          const send =
            document.getElementById("console-send");

          function sendCommand() {
            const command = input.value.trim();

            if (!command) return;

            input.value = "";

            fetch("/command", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                command
              })
            })
            .then(r => r.json())
            .then(data => {
              if (data.msg) {
                alert(data.msg);
              }
            })
            .catch(() => {
              alert("Failed to send command.");
            });
          }

          send.addEventListener(
            "click",
            sendCommand
          );

          input.addEventListener(
            "keydown",
            e => {
              if (e.key === "Enter") {
                sendCommand();
              }
            }
          );
        </script>

      </body>
    </html>
  `);
});

// ============================================================
// BOT START / STOP
// ============================================================
let botRunning = true;

app.post("/start", (req, res) => {
  if (botRunning) {
    return res.json({
      success: false,
      msg: "Already running",
    });
  }

  botRunning = true;

  botState.reconnectAttempts = 0;
  botState.wasThrottled = false;

  createBot();

  addLog("[Control] Bot started");

  res.json({
    success: true,
  });
});

app.post("/stop", (req, res) => {
  if (!botRunning) {
    return res.json({
      success: false,
      msg: "Already stopped",
    });
  }

  botRunning = false;

  clearAllIntervals();
  clearBotTimeouts();

  if (bot) {
    try {
      bot.removeAllListeners();
      bot.end();
    } catch (e) {}

    bot = null;
  }

  botState.connected = false;
  isReconnecting = false;

  addLog("[Control] Bot stopped");

  res.json({
    success: true,
  });
});

// ============================================================
// COMMAND API
// ============================================================
app.post("/command", express.json(), (req, res) => {
  const cmd = (req.body.command || "").trim();

  if (!cmd) {
    return res.json({
      success: false,
      msg: "Empty command.",
    });
  }

  addLog(`[Console] > ${cmd}`);

  if (cmd === "/help") {
    const lines = [
      "Available commands:",
      "  /help          - Show help",
      "  /pos           - Show coordinates",
      "  /status        - Show status",
      "  /say <message> - Send chat",
      "  /<anything>    - Send Minecraft command",
      "  <text>         - Send plain chat",
    ];

    lines.forEach((l) =>
      addLog(`[Console] ${l}`)
    );

    return res.json({
      success: true,
      msg: lines.join("\n"),
    });
  }

  if (
    cmd === "/pos" ||
    cmd === "/coords"
  ) {
    const pos =
      bot && bot.entity
        ? bot.entity.position
        : null;

    const msg = pos
      ? `Position: X=${Math.floor(pos.x)} Y=${Math.floor(pos.y)} Z=${Math.floor(pos.z)}`
      : "Position unavailable.";

    addLog(`[Console] ${msg}`);

    return res.json({
      success: true,
      msg,
    });
  }

  if (cmd === "/status") {
    const status =
      botState.connected
        ? "Connected"
        : "Disconnected";

    const uptime =
      Math.floor(
        (Date.now() - botState.startTime) / 1000
      );

    const msg =
      `Status: ${status} | Uptime: ${uptime}s | Reconnects: ${botState.reconnectAttempts}`;

    addLog(`[Console] ${msg}`);

    return res.json({
      success: true,
      msg,
    });
  }

  if (
    !bot ||
    typeof bot.chat !== "function"
  ) {
    const msg = bot
      ? "Bot is still connecting."
      : "Bot is not running.";

    addLog(`[Console] ${msg}`);

    return res.json({
      success: false,
      msg,
    });
  }

  try {
    bot.chat(cmd);

    addLog(
      `[Console] Sent to server: ${cmd}`
    );

    return res.json({
      success: true,
      msg: `Sent: ${cmd}`,
    });
  } catch (err) {
    addLog(
      `[Console] Error: ${err.message}`
    );

    return res.json({
      success: false,
      msg: err.message,
    });
  }
});

// ============================================================
// HTTP SERVER
// ============================================================
const server = app.listen(
  PORT,
  "0.0.0.0",
  () => {
    addLog(
      `[Server] HTTP server started on port ${server.address().port}`
    );
  }
);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    const fallbackPort = PORT + 1;

    addLog(
      `[Server] Port ${PORT} in use - trying port ${fallbackPort}`
    );

    server.listen(
      fallbackPort,
      "0.0.0.0"
    );
  } else {
    addLog(
      `[Server] HTTP server error: ${err.message}`
    );
  }
});

// ============================================================
// FORMAT UPTIME
// ============================================================
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(
    (seconds % 3600) / 60
  );
  const s = seconds % 60;

  return `${h}h ${m}m ${s}s`;
}

// ============================================================
// SELF PING
// ============================================================
const SELF_PING_INTERVAL =
  10 * 60 * 1000;

function startSelfPing() {
  const renderUrl =
    process.env.RENDER_EXTERNAL_URL;

  if (!renderUrl) {
    addLog(
      "[KeepAlive] No RENDER_EXTERNAL_URL set - self-ping disabled"
    );

    return;
  }

  setInterval(() => {
    const protocol =
      renderUrl.startsWith("https")
        ? https
        : http;

    protocol
      .get(
        `${renderUrl}/ping`,
        () => {}
      )
      .on("error", (err) => {
        addLog(
          `[KeepAlive] Self-ping failed: ${err.message}`
        );
      });
  }, SELF_PING_INTERVAL);

  addLog(
    "[KeepAlive] Self-ping system started"
  );
}

startSelfPing();

// ============================================================
// MEMORY MONITOR
// ============================================================
setInterval(
  () => {
    const mem =
      process.memoryUsage();

    const heapMB =
      (
        mem.heapUsed /
        1024 /
        1024
      ).toFixed(2);

    addLog(
      `[Memory] Heap: ${heapMB} MB`
    );
  },
  5 * 60 * 1000
);

// ============================================================
// BOT / RECONNECT STATE
// ============================================================
let bot = null;
let activeIntervals = [];
let reconnectTimeoutId = null;
let connectionTimeoutId = null;
let isReconnecting = false;

// ============================================================
// CLEAR TIMEOUTS
// ============================================================
function clearBotTimeouts() {
  if (reconnectTimeoutId) {
    clearTimeout(
      reconnectTimeoutId
    );

    reconnectTimeoutId = null;
  }

  if (connectionTimeoutId) {
    clearTimeout(
      connectionTimeoutId
    );

    connectionTimeoutId = null;
  }
}

// ============================================================
// INTERVAL MANAGEMENT
// ============================================================
function clearAllIntervals() {
  addLog(
    `[Cleanup] Clearing ${activeIntervals.length} intervals`
  );

  activeIntervals.forEach(
    (id) => clearInterval(id)
  );

  activeIntervals = [];
}

function addInterval(
  callback,
  delay
) {
  const id = setInterval(
    callback,
    delay
  );

  activeIntervals.push(id);

  return id;
}

// ============================================================
// RECONNECT DELAY
// IMPORTANT:
// Aternos can temporarily block rapid reconnects.
// We now always wait at least 60 seconds.
// ============================================================
function getReconnectDelay() {
  if (botState.wasThrottled) {
    botState.wasThrottled = false;

    const throttleDelay =
      90000 +
      Math.floor(
        Math.random() * 30000
      );

    addLog(
      `[Bot] Aternos throttle detected - waiting ${Math.floor(throttleDelay / 1000)}s`
    );

    return throttleDelay;
  }

  // Minimum 60 seconds.
  // Maximum 120 seconds.
  const baseDelay = 60000;
  const maxDelay = 120000;

  const delay = Math.min(
    baseDelay *
      Math.pow(
        1.5,
        Math.min(
          botState.reconnectAttempts - 1,
          3
        )
      ),
    maxDelay
  );

  const jitter =
    Math.floor(
      Math.random() * 10000
    );

  return delay + jitter;
}

// ============================================================
// CREATE BOT
// ============================================================
function createBot() {
  // Do not create a bot if user pressed Stop.
  if (!botRunning) {
    addLog(
      "[Bot] Bot is stopped - skipping connection."
    );

    return;
  }

  if (isReconnecting) {
    addLog(
      "[Bot] Already reconnecting, skipping..."
    );

    return;
  }

  // Cleanup previous bot.
  if (bot) {
    clearAllIntervals();

    try {
      bot.removeAllListeners();
      bot.end();
    } catch (e) {
      addLog(
        `[Cleanup] Error ending previous bot: ${e.message}`
      );
    }

    bot = null;
  }

  addLog(
    "[Bot] Creating bot instance..."
  );

  addLog(
    `[Bot] Connecting to ${config.server.ip}:${config.server.port}`
  );

  try {
    const botVersion =
      config.server.version &&
      config.server.version.trim() !== ""
        ? config.server.version
        : false;

    bot =
      mineflayer.createBot({
        username:
          config["bot-account"].username,

        password:
          config["bot-account"].password ||
          undefined,

        auth:
          config["bot-account"].type,

        host:
          config.server.ip,

        port:
          config.server.port,

        version:
          botVersion,

        hideErrors: false,

        // Long timeout.
        checkTimeoutInterval:
          600000,
      });

    // ========================================================
    // IMPORTANT FIX:
    // NO PATHFINDER.
    //
    // The old code loaded mineflayer-pathfinder and started
    // movement immediately after spawn. This could cause:
    //
    // "Invalid move player packet received"
    //
    // We intentionally do NOT load pathfinder anymore.
    // ========================================================

    clearBotTimeouts();

    connectionTimeoutId =
      setTimeout(() => {
        if (
          !botState.connected &&
          botRunning
        ) {
          addLog(
            "[Bot] Connection timeout - no spawn received"
          );

          try {
            bot.removeAllListeners();
            bot.end();
          } catch (e) {}

          bot = null;

          scheduleReconnect();
        }
      }, 150000);

    let spawnHandled = false;

    // ========================================================
    // SPAWN
    // ========================================================
    bot.once("spawn", () => {
      if (spawnHandled) return;

      spawnHandled = true;

      clearBotTimeouts();

      botState.connected = true;
      botState.lastActivity =
        Date.now();

      botState.reconnectAttempts = 0;

      isReconnecting = false;

      addLog(
        `[Bot] [+] Successfully spawned on server! (Version: ${bot.version})`
      );

      if (
        config.discord &&
        config.discord.events &&
        config.discord.events.connect
      ) {
        sendDiscordWebhook(
          `[+] **Connected** to \`${config.server.ip}\``,
          0x4ade80
        );
      }

      // ======================================================
      // NO MOVEMENT MODULES
      // ======================================================
      //
      // We intentionally do NOT initialize:
      //
      // - pathfinder
      // - position movement
      // - circle walk
      // - random jump
      // - look around
      // - micro walk
      // - avoid mobs
      //
      // The bot stays stationary.
      //
      // This prevents invalid movement packets.
      // ======================================================

      initializeModules(
        bot,
        null,
        null
      );

      // ======================================================
      // CREATIVE MODE
      // ======================================================
      setTimeout(() => {
        if (
          bot &&
          botState.connected &&
          config.server["try-creative"]
        ) {
          try {
            bot.chat(
              "/gamemode creative"
            );

            addLog(
              "[INFO] Attempted to set creative mode (requires OP)"
            );
          } catch (e) {}
        }
      }, 3000);

      bot.on(
        "messagestr",
        (message) => {
          if (
            message.includes(
              "commands.gamemode.success.self"
            ) ||
            message.includes(
              "Set own game mode to Creative Mode"
            )
          ) {
            addLog(
              "[INFO] Bot is now in Creative Mode."
            );
          }
        }
      );
    });

    // ========================================================
    // KICKED
    // ========================================================
    bot.on(
      "kicked",
      (reason) => {
        const kickReason =
          typeof reason === "object"
            ? JSON.stringify(reason)
            : reason;

        addLog(
          `[Bot] Kicked: ${kickReason}`
        );

        botState.connected = false;

        botState.errors.push({
          type: "kicked",
          reason: kickReason,
          time: Date.now(),
        });

        clearAllIntervals();

        const reasonStr =
          String(kickReason).toLowerCase();

        // Detect Aternos login cooldown.
        if (
          reasonStr.includes("throttl") ||
          reasonStr.includes(
            "wait before logging-in"
          ) ||
          reasonStr.includes(
            "wait before reconnect"
          ) ||
          reasonStr.includes(
            "you must wait"
          ) ||
          reasonStr.includes(
            "too fast"
          )
        ) {
          addLog(
            "[Bot] Aternos reconnect cooldown detected."
          );

          botState.wasThrottled = true;
        }

        if (
          config.discord &&
          config.discord.events &&
          config.discord.events.disconnect
        ) {
          sendDiscordWebhook(
            `[!] **Kicked**: ${kickReason}`,
            0xff0000
          );
        }
      }
    );

    // ========================================================
    // END
    // ========================================================
    bot.on(
      "end",
      (reason) => {
        addLog(
          `[Bot] Disconnected: ${reason || "Unknown reason"}`
        );

        botState.connected = false;

        clearAllIntervals();

        spawnHandled = false;

        if (
          config.discord &&
          config.discord.events &&
          config.discord.events.disconnect
        ) {
          sendDiscordWebhook(
            `[-] **Disconnected**: ${reason || "Unknown"}`,
            0xf87171
          );
        }

        // IMPORTANT:
        // If the user pressed Stop, DO NOT reconnect.
        if (!botRunning) {
          addLog(
            "[Bot] Bot is stopped - no reconnect."
          );

          isReconnecting = false;

          return;
        }

        scheduleReconnect();
      }
    );

    // ========================================================
    // ERROR
    // ========================================================
    bot.on(
      "error",
      (err) => {
        const msg =
          err.message || "";

        addLog(
          `[Bot] Error: ${msg}`
        );

        botState.errors.push({
          type: "error",
          message: msg,
          time: Date.now(),
        });

        // Let "end" handle reconnect.
      }
    );

  } catch (err) {
    addLog(
      `[Bot] Failed to create bot: ${err.message}`
    );

    if (botRunning) {
      scheduleReconnect();
    }
  }
}

// ============================================================
// RECONNECT
// ============================================================
function scheduleReconnect() {
  if (!botRunning) {
    addLog(
      "[Bot] Bot stopped - reconnect cancelled."
    );

    return;
  }

  clearBotTimeouts();

  if (isReconnecting) {
    addLog(
      "[Bot] Reconnect already scheduled, skipping duplicate."
    );

    return;
  }

  isReconnecting = true;

  botState.reconnectAttempts++;

  const delay =
    getReconnectDelay();

  addLog(
    `[Bot] Reconnecting in ${Math.ceil(delay / 1000)}s (attempt #${botState.reconnectAttempts})`
  );

  reconnectTimeoutId =
    setTimeout(() => {
      reconnectTimeoutId = null;

      isReconnecting = false;

      if (!botRunning) {
        addLog(
          "[Bot] Reconnect cancelled because bot is stopped."
        );

        return;
      }

      createBot();
    }, delay);
}

// ============================================================
// MODULE INITIALIZATION
// ============================================================
function initializeModules(
  bot,
  mcData,
  defaultMove
) {
  addLog(
    "[Modules] Initializing safe AFK modules..."
  );

  // ========================================================
  // AUTO AUTH
  // ========================================================
  if (
    config.utils["auto-auth"] &&
    config.utils["auto-auth"].enabled
  ) {
    const password =
      config.utils["auto-auth"].password;

    let authHandled = false;

    const tryAuth = (type) => {
      if (
        authHandled ||
        !bot ||
        !botState.connected
      ) {
        return;
      }

      authHandled = true;

      try {
        if (type === "register") {
          bot.chat(
            `/register ${password} ${password}`
          );

          addLog(
            "[Auth] Detected register prompt - sent /register"
          );
        } else {
          bot.chat(
            `/login ${password}`
          );

          addLog(
            "[Auth] Detected login prompt - sent /login"
          );
        }
      } catch (e) {}
    };

    bot.on(
      "messagestr",
      (message) => {
        if (authHandled) return;

        const msg =
          message.toLowerCase();

        if (
          msg.includes("/register") ||
          msg.includes("register ") ||
          msg.includes(
            "지정된 비밀번호"
          )
        ) {
          tryAuth("register");
        } else if (
          msg.includes("/login") ||
          msg.includes("login ") ||
          msg.includes("로그인")
        ) {
          tryAuth("login");
        }
      }
    );

    // Failsafe login.
    setTimeout(() => {
      if (
        !authHandled &&
        bot &&
        botState.connected
      ) {
        try {
          addLog(
            "[Auth] No prompt detected after 10s, sending /login as failsafe"
          );

          bot.chat(
            `/login ${password}`
          );

          authHandled = true;
        } catch (e) {}
      }
    }, 10000);
  }

  // ========================================================
  // CHAT MESSAGES
  // ========================================================
  if (
    config.utils["chat-messages"] &&
    config.utils["chat-messages"].enabled
  ) {
    const messages =
      config.utils["chat-messages"].messages;

    if (
      Array.isArray(messages) &&
      messages.length > 0
    ) {
      if (
        config.utils["chat-messages"].repeat
      ) {
        let i = 0;

        addInterval(
          () => {
            if (
              bot &&
              botState.connected
            ) {
              try {
                bot.chat(
                  messages[i]
                );

                botState.lastActivity =
                  Date.now();

                i =
                  (i + 1) %
                  messages.length;
              } catch (e) {}
            }
          },
          config.utils["chat-messages"][
            "repeat-delay"
          ] * 1000
        );
      } else {
        messages.forEach(
          (msg, idx) => {
            setTimeout(() => {
              if (
                bot &&
                botState.connected
              ) {
                try {
                  bot.chat(msg);
                } catch (e) {}
              }
            }, idx * 1000);
          }
        );
      }
    }
  }

  // ========================================================
  // SAFE ANTI-AFK
  // ========================================================
  //
  // IMPORTANT:
  // NO walking.
  // NO jumping.
  // NO sneaking.
  // NO look movement.
  //
  // Only arm swing + hotbar changes.
  // ========================================================
  if (
    config.utils["anti-afk"] &&
    config.utils["anti-afk"].enabled
  ) {

    // ------------------------------------------------------
    // ARM SWING
    // ------------------------------------------------------
    addInterval(
      () => {
        if (
          !bot ||
          !botState.connected
        ) {
          return;
        }

        try {
          bot.swingArm();

          botState.lastActivity =
            Date.now();
        } catch (e) {}
      },
      30000 +
        Math.floor(
          Math.random() * 30000
        )
    );

    // ------------------------------------------------------
    // HOTBAR CYCLING
    // ------------------------------------------------------
    addInterval(
      () => {
        if (
          !bot ||
          !botState.connected
        ) {
          return;
        }

        try {
          const slot =
            Math.floor(
              Math.random() * 9
            );

          bot.setQuickBarSlot(
            slot
          );

          botState.lastActivity =
            Date.now();
        } catch (e) {}
      },
      60000 +
        Math.floor(
          Math.random() * 60000
        )
    );

    // ------------------------------------------------------
    // NO SNEAK
    // ------------------------------------------------------
    //
    // The original bot used setControlState("sneak").
    // We intentionally don't use it because we want the
    // bot to send as few movement-related packets as possible.
    //
  }

  // ========================================================
  // IMPORTANT:
  // NO MOVEMENT MODULES.
  //
  // The following are intentionally disabled:
  //
  // - position
  // - circle-walk
  // - random-jump
  // - look-around
  // - micro-walk
  // - avoidMobs
  //
  // ========================================================

  // ========================================================
  // COMBAT
  // ========================================================
  //
  // Combat doesn't automatically move the player in this
  // version, but we only activate it if explicitly enabled.
  //
  if (
    config.modules &&
    config.modules.combat
  ) {
    combatModule(
      bot,
      mcData
    );
  }

  // ========================================================
  // BEDS
  // ========================================================
  if (
    config.modules &&
    config.modules.beds
  ) {
    bedModule(
      bot,
      mcData
    );
  }

  // ========================================================
  // CHAT
  // ========================================================
  if (
    config.modules &&
    config.modules.chat
  ) {
    chatModule(bot);
  }

  addLog(
    "[Modules] Safe AFK modules initialized!"
  );

  addLog(
    "[Modules] Movement/pathfinder disabled to prevent invalid move packets."
  );
}

// ============================================================
// COMBAT MODULE
// ============================================================
function combatModule(
  bot,
  mcData
) {
  let lastAttackTime = 0;
  let lockedTarget = null;
  let lockedTargetExpiry = 0;

  bot.on(
    "physicsTick",
    () => {
      if (
        !bot ||
        !botState.connected
      ) {
        return;
      }

      if (
        !config.combat ||
        !config.combat["attack-mobs"]
      ) {
        return;
      }

      const now =
        Date.now();

      if (
        now - lastAttackTime <
        620
      ) {
        return;
      }

      try {
        if (
          lockedTarget &&
          now <
            lockedTargetExpiry &&
          bot.entities[
            lockedTarget.id
          ] &&
          lockedTarget.position
        ) {
          const dist =
            bot.entity.position.distanceTo(
              lockedTarget.position
            );

          if (dist < 4) {
            bot.attack(
              lockedTarget
            );

            lastAttackTime =
              now;

            return;
          }

          lockedTarget =
            null;
        }

        const mobs =
          Object.values(
            bot.entities
          ).filter(
            (e) =>
              e.type === "mob" &&
              e.position &&
              bot.entity.position.distanceTo(
                e.position
              ) < 4
          );

        if (
          mobs.length > 0
        ) {
          lockedTarget =
            mobs[0];

          lockedTargetExpiry =
            now + 3000;

          bot.attack(
            lockedTarget
          );

          lastAttackTime =
            now;
        }
      } catch (e) {
        addLog(
          `[Combat] Error: ${e.message}`
        );
      }
    }
  );

  // ========================================================
  // AUTO EAT
  // ========================================================
  bot.on(
    "health",
    () => {
      if (
        !config.combat ||
        !config.combat["auto-eat"]
      ) {
        return;
      }

      try {
        if (
          bot.food < 14
        ) {
          const food =
            bot.inventory
              .items()
              .find(
                (i) =>
                  i.foodPoints &&
                  i.foodPoints > 0
              );

          if (food) {
            bot
              .equip(
                food,
                "hand"
              )
              .then(() =>
                bot.consume()
              )
              .catch(
                (e) =>
                  addLog(
                    `[AutoEat] Error: ${e.message}`
                  )
              );
          }
        }
      } catch (e) {
        addLog(
          `[AutoEat] Error: ${e.message}`
        );
      }
    }
  );
}

// ============================================================
// BED MODULE
// ============================================================
function bedModule(
  bot,
  mcData
) {
  let isTryingToSleep =
    false;

  addInterval(
    async () => {
      if (
        !bot ||
        !botState.connected
      ) {
        return;
      }

      if (
        !config.beds ||
        !config.beds["place-night"]
      ) {
        return;
      }

      try {
        const isNight =
          bot.time.timeOfDay >=
            12500 &&
          bot.time.timeOfDay <=
            23500;

        if (
          isNight &&
          !isTryingToSleep
        ) {
          const bedBlock =
            bot.findBlock({
              matching:
                (block) =>
                  block.name.includes(
                    "bed"
                  ),
              maxDistance: 8,
            });

          if (bedBlock) {
            isTryingToSleep =
              true;

            try {
              await bot.sleep(
                bedBlock
              );

              addLog(
                "[Bed] Sleeping..."
              );
            } catch (e) {
              // Ignore sleep errors.
            } finally {
              isTryingToSleep =
                false;
            }
          }
        }
      } catch (e) {
        isTryingToSleep =
          false;

        addLog(
          `[Bed] Error: ${e.message}`
        );
      }
    },
    10000
  );
}

// ============================================================
// CHAT MODULE
// ============================================================
function chatModule(
  bot
) {
  bot.on(
    "chat",
    (username, message) => {
      if (
        !bot ||
        username === bot.username
      ) {
        return;
      }

      try {
        if (
          config.discord &&
          config.discord.enabled &&
          config.discord.events &&
          config.discord.events.chat
        ) {
          sendDiscordWebhook(
            `💬 **${username}**: ${message}`,
            0x7289da
          );
        }

        if (
          config.chat &&
          config.chat.respond
        ) {
          const lowerMsg =
            message.toLowerCase();

          if (
            lowerMsg.includes(
              "hello"
            ) ||
            lowerMsg.includes(
              "hi"
            )
          ) {
            bot.chat(
              `Hello, ${username}!`
            );
          }

          if (
            message.startsWith(
              "!tp "
            )
          ) {
            const target =
              message.split(
                " "
              )[1];

            if (target) {
              bot.chat(
                `/tp ${target}`
              );
            }
          }
        }
      } catch (e) {
        addLog(
          `[Chat] Error: ${e.message}`
        );
      }
    }
  );
}

// ============================================================
// CONSOLE
// ============================================================
const readline =
  require("readline");

const rl =
  readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

rl.on(
  "line",
  (line) => {
    if (
      !bot ||
      !botState.connected
    ) {
      addLog(
        "[Console] Bot not connected"
      );

      return;
    }

    const trimmed =
      line.trim();

    try {
      if (
        trimmed.startsWith(
          "say "
        )
      ) {
        bot.chat(
          trimmed.slice(4)
        );
      } else if (
        trimmed.startsWith(
          "cmd "
        )
      ) {
        bot.chat(
          "/" +
            trimmed.slice(4)
        );
      } else if (
        trimmed ===
        "status"
      ) {
        addLog(
          `Connected: ${botState.connected}, Uptime: ${formatUptime(
            Math.floor(
              (Date.now() -
                botState.startTime) /
                1000
            )
          )}`
        );
      } else {
        bot.chat(trimmed);
      }
    } catch (e) {
      addLog(
        `[Console] Error: ${e.message}`
      );
    }
  }
);

// ============================================================
// DISCORD WEBHOOK
// ============================================================
let lastDiscordSend = 0;

const DISCORD_RATE_LIMIT_MS =
  5000;

function sendDiscordWebhook(
  content,
  color = 0x0099ff
) {
  if (
    !config.discord ||
    !config.discord.enabled ||
    !config.discord.webhookUrl ||
    config.discord.webhookUrl.includes(
      "YOUR_DISCORD"
    )
  ) {
    return;
  }

  const now =
    Date.now();

  if (
    now - lastDiscordSend <
    DISCORD_RATE_LIMIT_MS
  ) {
    addLog(
      "[Discord] Rate limited - skipping webhook"
    );

    return;
  }

  lastDiscordSend =
    now;

  const protocol =
    config.discord.webhookUrl.startsWith(
      "https"
    )
      ? https
      : http;

  const urlParts =
    new URL(
      config.discord.webhookUrl
    );

  const payload =
    JSON.stringify({
      username: config.name,

      embeds: [
        {
          description:
            content,

          color: color,

          timestamp:
            new Date().toISOString(),

          footer: {
            text:
              "Slobos AFK Bot",
          },
        },
      ],
    });

  const options = {
    hostname:
      urlParts.hostname,

    port: 443,

    path:
      urlParts.pathname +
      urlParts.search,

    method: "POST",

    headers: {
      "Content-Type":
        "application/json",

      "Content-Length":
        Buffer.byteLength(
          payload,
          "utf8"
        ),
    },
  };

  const req =
    protocol.request(
      options,
      () => {}
    );

  req.on(
    "error",
    (e) => {
      addLog(
        `[Discord] Error sending webhook: ${e.message}`
      );
    }
  );

  req.write(payload);
  req.end();
}

// ============================================================
// CRASH RECOVERY
// ============================================================
process.on(
  "uncaughtException",
  (err) => {
    const msg =
      err.message ||
      "Unknown";

    addLog(
      `[FATAL] Uncaught Exception: ${msg}`
    );

    botState.errors.push({
      type: "uncaught",
      message: msg,
      time: Date.now(),
    });

    if (
      botState.errors.length >
      100
    ) {
      botState.errors =
        botState.errors.slice(
          -50
        );
    }

    const isNetworkError =
      msg.includes(
        "PartialReadError"
      ) ||
      msg.includes(
        "ECONNRESET"
      ) ||
      msg.includes(
        "EPIPE"
      ) ||
      msg.includes(
        "ETIMEDOUT"
      ) ||
      msg.includes(
        "timed out"
      ) ||
      msg.includes(
        "write after end"
      ) ||
      msg.includes(
        "This socket has been ended"
      );

    if (isNetworkError) {
      addLog(
        "[FATAL] Known network/protocol error - recovering..."
      );
    }

    clearAllIntervals();

    botState.connected =
      false;

    if (!botRunning) {
      return;
    }

    if (isReconnecting) {
      addLog(
        "[FATAL] Reconnect already scheduled."
      );

      return;
    }

    setTimeout(
      () => {
        if (
          botRunning &&
          !isReconnecting
        ) {
          scheduleReconnect();
        }
      },
      isNetworkError
        ? 5000
        : 10000
    );
  }
);

// ============================================================
// UNHANDLED REJECTION
// ============================================================
process.on(
  "unhandledRejection",
  (reason) => {
    const msg =
      String(reason);

    addLog(
      `[FATAL] Unhandled Rejection: ${msg}`
    );

    botState.errors.push({
      type: "rejection",
      message: msg,
      time: Date.now(),
    });

    if (
      botState.errors.length >
      100
    ) {
      botState.errors =
        botState.errors.slice(
          -50
        );
    }

    const isNetworkError =
      msg.includes(
        "ETIMEDOUT"
      ) ||
      msg.includes(
        "ECONNRESET"
      ) ||
      msg.includes(
        "EPIPE"
      ) ||
      msg.includes(
        "ENOTFOUND"
      ) ||
      msg.includes(
        "timed out"
      ) ||
      msg.includes(
        "PartialReadError"
      );

    if (
      isNetworkError &&
      !isReconnecting &&
      botRunning
    ) {
      addLog(
        "[FATAL] Network rejection - triggering reconnect..."
      );

      clearAllIntervals();

      botState.connected =
        false;

      if (bot) {
        try {
          bot.end();
        } catch (_) {}

        bot = null;
      }

      scheduleReconnect();
    }
  }
);

// ============================================================
// SIGNAL HANDLERS
// ============================================================
process.on(
  "SIGTERM",
  () => {
    addLog(
      "[System] SIGTERM received - ignoring, bot will stay alive."
    );
  }
);

process.on(
  "SIGINT",
  () => {
    addLog(
      "[System] SIGINT received - ignoring, bot will stay alive."
    );
  }
);

// ============================================================
// START
// ============================================================
addLog(
  "=".repeat(50)
);

addLog(
  "  Minecraft AFK Bot v2.6 - Safe Movement Edition"
);

addLog(
  "=".repeat(50)
);

addLog(
  `Server: ${config.server.ip}:${config.server.port}`
);

addLog(
  `Version: ${config.server.version || "Auto-detect"}`
);

addLog(
  `Auto-Reconnect: ${
    config.utils["auto-reconnect"]
      ? "Enabled"
      : "Disabled"
  }`
);

addLog(
  "Movement: DISABLED"
);

addLog(
  "Pathfinder: DISABLED"
);

addLog(
  "Safe AFK Mode: ENABLED"
);

addLog(
  "=".repeat(50)
);

createBot();
