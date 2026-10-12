// Sobra: guarda a página e as bibliotecas para abrir sem internet.
// Os dados (contas, pagamentos) ficam no aparelho pelo próprio app; aqui só entra o que é arquivo.
const VERSAO = "sobra-v7";
const BASE = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/logo.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Apps Script: sempre pela rede (o app cuida da cópia offline dos dados).
  if (url.hostname.endsWith("script.google.com") || url.hostname.endsWith("googleusercontent.com")) return;
  // Página e arquivos do próprio site: rede primeiro, para pegar a versão nova; sem rede, a cópia guardada.
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(VERSAO).then((c) => c.put(req.mode === "navigate" ? "./index.html" : req, cp)); }
      return r;
    }).catch(() => caches.match(req.mode === "navigate" ? "./index.html" : req, { ignoreSearch: true })));
    return;
  }
  // Bibliotecas e fontes (cdnjs, Google Fonts): cópia guardada primeiro.
  if (/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((m) => m || fetch(req).then((r) => {
      if (r.ok || r.type === "opaque") { const cp = r.clone(); caches.open(VERSAO).then((c) => c.put(req, cp)); }
      return r;
    })));
  }
});
