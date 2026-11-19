/* Akademik Kokpit · onay penceresi
   Kokpit bu sayfayı küçük bir pencerede açar. Sayfa cihazın kendi doğrulayıcısıyla
   (Touch ID, Face ID, Windows Hello ya da cihaz şifresi) ya bir anahtar tanımlar
   ya da Kokpit'in verdiği onay özetini imzalar, sonucu Kokpit'e geri verir ve kapanır.
   Sayfa hiçbir veri saklamaz ve hiçbir yere göndermez; yalnızca kendisini açan Kokpit
   penceresine yanıt verir. Özel anahtar cihazdan çıkmaz. */
"use strict";
const SURUM = "1.0.0";
const RP_AD = "Akademik Kokpit";
/* Yanıt yalnızca claude.ai üzerinde açılan Kokpit çerçevesine verilir. */
const IZINLI_KOKEN = /^https:\/\/[0-9a-f-]{36}\.frame\.claudeusercontent\.com$/;

const $ = id => document.getElementById(id);
const b64u = buf => {
  const b = new Uint8Array(buf); let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64uCoz = s => {
  s = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const t = atob(s), b = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i);
  return b;
};
function durum(metin, sinif) { const d = $("durum"); d.textContent = metin; d.className = "durum" + (sinif ? " " + sinif : ""); }

function istekOku() {
  const h = location.hash.slice(1);
  if (!h) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(b64uCoz(new URLSearchParams(h).get("p"))));
    if (!p || (p.tur !== "kayit" && p.tur !== "onay")) return null;
    if (typeof p.n !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(p.n)) return null;
    if (p.tur === "onay" && (typeof p.c !== "string" || b64uCoz(p.c).length !== 32)) return null;
    if (p.tur === "onay" && (!Array.isArray(p.cid) || !p.cid.length || p.cid.length > 10)) return null;
    p.ozet = String(p.ozet || "").slice(0, 600);
    p.cihaz = String(p.cihaz || "").slice(0, 60);
    return p;
  } catch (e) { return null; }
}

function yanitVer(p, yanit) {
  const ileti = Object.assign({ kokpitOnay: 1, surum: SURUM, n: p.n, tur: p.tur }, yanit);
  const koken = typeof p.o === "string" && IZINLI_KOKEN.test(p.o) ? p.o : null;
  let gonderildi = false;
  if (koken && window.opener) {
    try { window.opener.postMessage(ileti, koken); gonderildi = true; } catch (e) {}
  }
  if (gonderildi) {
    durum("Tamam. Kokpit'e iletildi; pencere kapanıyor.", "ok");
    setTimeout(() => { try { window.close(); } catch (e) {} }, 1200);
  } else {
    durum("İmza hazır.", "ok");
    $("kod").value = b64u(new TextEncoder().encode(JSON.stringify(ileti)));
    $("kopya").hidden = false;
  }
}

async function kayit(p) {
  const kullanici = crypto.getRandomValues(new Uint8Array(16));
  const k = await navigator.credentials.create({ publicKey: {
    rp: { id: location.hostname, name: RP_AD },
    user: { id: kullanici, name: "Yönetici" + (p.cihaz ? " · " + p.cihaz : ""), displayName: "Yönetici" },
    challenge: new TextEncoder().encode(p.n),
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
    attestation: "none",
    timeout: 120000
  }});
  const r = k.response;
  const acik = typeof r.getPublicKey === "function" ? r.getPublicKey() : null;
  if (!acik) throw new Error("Bu tarayıcı anahtarın açık kısmını vermiyor; başka bir tarayıcıda deneyin.");
  return {
    credId: b64u(k.rawId),
    acikAnahtar: b64u(acik),
    alg: typeof r.getPublicKeyAlgorithm === "function" ? r.getPublicKeyAlgorithm() : null,
    clientDataJSON: b64u(r.clientDataJSON),
    rpId: location.hostname,
    cihaz: p.cihaz
  };
}

async function onay(p) {
  const k = await navigator.credentials.get({ publicKey: {
    rpId: location.hostname,
    challenge: b64uCoz(p.c),
    allowCredentials: p.cid.map(id => ({ type: "public-key", id: b64uCoz(id) })),
    userVerification: "required",
    timeout: 120000
  }});
  const r = k.response;
  return {
    credId: b64u(k.rawId),
    authenticatorData: b64u(r.authenticatorData),
    clientDataJSON: b64u(r.clientDataJSON),
    imza: b64u(r.signature),
    rpId: location.hostname
  };
}

function goster(p) {
  $("surum").textContent = SURUM;
  if (!p) { $("ozet").textContent = "Bu pencere yalnızca Akademik Kokpit'ten açılır."; return; }
  if (!window.PublicKeyCredential) { $("ozet").textContent = "Bu tarayıcı parmak izi onayını desteklemiyor."; return; }
  const dugme = $("dugme");
  if (p.tur === "kayit") {
    $("baslik").textContent = "Parmak izini tanımla";
    $("ozet").textContent = "Bu cihazı Akademik Kokpit onayları için tanımlayacaksınız." + (p.cihaz ? "\nCihaz: " + p.cihaz : "");
    dugme.textContent = "Parmak izimle tanımla";
  } else {
    $("baslik").textContent = "Onay";
    $("ozet").textContent = p.ozet || "Kokpit'teki işlemi onaylıyorsunuz.";
    const dl = $("ayrinti");
    if (p.ayrinti && typeof p.ayrinti === "object") {
      for (const [a, v] of Object.entries(p.ayrinti).slice(0, 8)) {
        const dt = document.createElement("dt"); dt.textContent = String(a).slice(0, 40);
        const dd = document.createElement("dd"); dd.textContent = String(v).slice(0, 300);
        dl.append(dt, dd);
      }
      dl.hidden = !dl.children.length;
    }
    dugme.textContent = "Parmak izimle onayla";
  }
  dugme.hidden = false;
  dugme.addEventListener("click", async () => {
    dugme.disabled = true; durum("Parmak izi bekleniyor…");
    try {
      const y = p.tur === "kayit" ? await kayit(p) : await onay(p);
      yanitVer(p, y);
    } catch (e) {
      dugme.disabled = false;
      const ad = e && e.name;
      durum(ad === "NotAllowedError" ? "Onay verilmedi ya da süre doldu. Yeniden deneyebilirsiniz."
        : "Olmadı: " + String((e && e.message) || e).slice(0, 160), "hata");
    }
  });
  $("kopyala").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("kod").value); durum("Kopyalandı.", "ok"); }
    catch (e) { $("kod").select(); }
  });
}

goster(istekOku());
