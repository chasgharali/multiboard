"use client";

// Lightweight sound effects synthesized with the Web Audio API — no asset files.
// Respects a persisted mute flag and only runs after a user gesture (browser rule).

let ctx: AudioContext | null = null;
const MUTE_KEY = "mb_muted";

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(m: boolean) {
  if (typeof window !== "undefined") localStorage.setItem(MUTE_KEY, m ? "1" : "0");
}

function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; when?: number } = {}
) {
  const c = getCtx();
  if (!c) return;
  const { type = "sine", gain = 0.14, when = 0 } = opts;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + when;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export type SoundName =
  | "move"
  | "capture"
  | "dice"
  | "turn"
  | "win"
  | "lose"
  | "chat"
  | "join";

export function playSound(name: SoundName) {
  if (isMuted()) return;
  if (!getCtx()) return;
  switch (name) {
    case "move":
      tone(380, 0.08, { type: "triangle", gain: 0.12 });
      tone(520, 0.07, { type: "triangle", gain: 0.1, when: 0.05 });
      break;
    case "capture":
      tone(180, 0.16, { type: "sawtooth", gain: 0.16 });
      tone(120, 0.2, { type: "square", gain: 0.12, when: 0.04 });
      break;
    case "dice":
      [0, 0.06, 0.12, 0.18].forEach((w, i) =>
        tone(260 + i * 70, 0.05, { type: "square", gain: 0.08, when: w })
      );
      break;
    case "turn":
      tone(660, 0.12, { type: "sine", gain: 0.13 });
      tone(880, 0.1, { type: "sine", gain: 0.11, when: 0.09 });
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(f, 0.16, { type: "triangle", gain: 0.14, when: i * 0.12 })
      );
      break;
    case "lose":
      [440, 330, 247].forEach((f, i) =>
        tone(f, 0.18, { type: "sawtooth", gain: 0.12, when: i * 0.13 })
      );
      break;
    case "chat":
      tone(880, 0.06, { type: "sine", gain: 0.09 });
      break;
    case "join":
      tone(523, 0.1, { type: "sine", gain: 0.12 });
      tone(784, 0.1, { type: "sine", gain: 0.1, when: 0.08 });
      break;
  }
}
