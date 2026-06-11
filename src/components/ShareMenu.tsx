"use client";

import { useEffect, useRef, useState } from "react";

export default function ShareMenu({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setCanNative(typeof navigator !== "undefined" && !!navigator.share), []);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function url() {
    return `${window.location.origin}/g/${code}`;
  }
  function message() {
    return `Join my MultiBoard game! Room ${code}: ${url()}`;
  }

  function copy() {
    navigator.clipboard?.writeText(url()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(message())}`, "_blank", "noopener");
    setOpen(false);
  }
  function messenger() {
    // Messenger app deep link (mobile); desktop falls back to the FB share dialog.
    const link = encodeURIComponent(url());
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const target = isMobile
      ? `fb-messenger://share/?link=${link}`
      : `https://www.facebook.com/dialog/send?app_id=140586622674265&link=${link}&redirect_uri=${link}`;
    window.open(target, "_blank", "noopener");
    setOpen(false);
  }
  async function native() {
    try {
      await navigator.share({ title: "MultiBoard", text: "Join my MultiBoard game!", url: url() });
    } catch {}
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn-primary btn-sm" onClick={() => setOpen((o) => !o)}>
        🔗 Share link
      </button>
      {open && (
        <div className="share-menu">
          <button onClick={copy}>{copied ? "✅ Copied!" : "📋 Copy link"}</button>
          <button onClick={whatsapp}>
            <span style={{ color: "#25D366" }}>●</span> WhatsApp
          </button>
          <button onClick={messenger}>
            <span style={{ color: "#0084FF" }}>●</span> Messenger
          </button>
          {canNative && <button onClick={native}>📤 More…</button>}
        </div>
      )}
    </div>
  );
}
