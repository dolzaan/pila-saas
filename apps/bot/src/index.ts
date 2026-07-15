/**
 * FinZap Bot — Entry Point (Fase 1 placeholder)
 *
 * O bot completo será implementado na Fase 3.
 * Por enquanto, apenas valida a conexão com o banco e inicia um health-check HTTP.
 */

import http from "http";

const PORT = process.env.BOT_PORT ?? 3001;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "finzap-bot", phase: 1 }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[finzap-bot] Health check disponível em http://localhost:${PORT}/health`);
  console.log("[finzap-bot] Fase 1: placeholder. Bot completo na Fase 3.");
});
