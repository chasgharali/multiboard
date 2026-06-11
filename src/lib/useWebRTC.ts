"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSound } from "./sound";

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export interface ChatMessage {
  from: string;
  name: string;
  text: string;
  ts: number;
  mine?: boolean;
}

export interface RemotePeer {
  stream: MediaStream | null;
  state: RTCPeerConnectionState;
}

export interface Peer {
  id: string;
  name: string;
}

/**
 * Full-mesh WebRTC among the room's players.
 * - Signaling is relayed through MongoDB (`/api/rooms/[code]/signal`) and polled.
 * - Each pair connects once; the peer with the smaller id is the offerer (no glare).
 * - Audio/video tracks ride the connection; text chat rides a data channel.
 */
export function useWebRTC({
  code,
  myId,
  myName,
  peers,
  active,
  localStream,
}: {
  code: string;
  myId: string;
  myName: string;
  peers: Peer[];
  active: boolean;
  localStream: MediaStream | null;
}) {
  const [remote, setRemote] = useState<Record<string, RemotePeer>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const channels = useRef(new Map<string, RTCDataChannel>());
  const pendingCandidates = useRef(new Map<string, RTCIceCandidateInit[]>());
  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localStream;

  const send = useCallback(
    (to: string, data: unknown) => {
      fetch(`/api/rooms/${code}/signal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: myId, to, data }),
      }).catch(() => {});
    },
    [code, myId]
  );

  const addMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m].slice(-300));
  }, []);

  const setRemoteState = useCallback((id: string, patch: Partial<RemotePeer>) => {
    setRemote((prev) => ({
      ...prev,
      [id]: { stream: prev[id]?.stream ?? null, state: prev[id]?.state ?? "new", ...patch },
    }));
  }, []);

  const setupChannel = useCallback(
    (peerId: string, ch: RTCDataChannel) => {
      channels.current.set(peerId, ch);
      ch.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          addMessage({ from: peerId, name: d.name || "Player", text: d.text, ts: d.ts });
          playSound("chat");
        } catch {}
      };
    },
    [addMessage]
  );

  const makeOffer = useCallback(
    async (peerId: string) => {
      const pc = pcs.current.get(peerId);
      if (!pc || pc.signalingState !== "stable") return;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send(peerId, { type: "offer", sdp: pc.localDescription });
      } catch {}
    },
    [send]
  );

  const createPeer = useCallback(
    (peer: Peer, asInitiator: boolean) => {
      if (pcs.current.has(peer.id)) return pcs.current.get(peer.id)!;
      const pc = new RTCPeerConnection(ICE);
      pcs.current.set(peer.id, pc);
      pendingCandidates.current.set(peer.id, []);

      const ls = localStreamRef.current;
      if (ls) ls.getTracks().forEach((t) => pc.addTrack(t, ls));

      pc.onicecandidate = (e) => {
        if (e.candidate) send(peer.id, { type: "candidate", candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => setRemoteState(peer.id, { stream: e.streams[0] });
      pc.onconnectionstatechange = () => setRemoteState(peer.id, { state: pc.connectionState });

      if (asInitiator) {
        setupChannel(peer.id, pc.createDataChannel("chat"));
        makeOffer(peer.id);
      } else {
        pc.ondatachannel = (e) => setupChannel(peer.id, e.channel);
      }
      return pc;
    },
    [send, setRemoteState, setupChannel, makeOffer]
  );

  const flushCandidates = useCallback(async (peerId: string) => {
    const pc = pcs.current.get(peerId);
    const queue = pendingCandidates.current.get(peerId);
    if (!pc || !queue) return;
    while (queue.length) {
      const c = queue.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {}
    }
  }, []);

  const handleSignal = useCallback(
    async (from: string, data: any) => {
      let pc = pcs.current.get(from);
      if (!pc) {
        // Unknown peer offered us — accept as receiver.
        const name = peers.find((p) => p.id === from)?.name || "Player";
        pc = createPeer({ id: from, name }, false);
      }
      if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await flushCandidates(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send(from, { type: "answer", sdp: pc.localDescription });
      } else if (data.type === "answer") {
        if (pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await flushCandidates(from);
        }
      } else if (data.type === "candidate") {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch {}
        } else {
          pendingCandidates.current.get(from)?.push(data.candidate);
        }
      }
    },
    [peers, createPeer, flushCandidates, send]
  );

  // Poll for incoming signals while the call is active.
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const poll = async () => {
      if (stop) return;
      try {
        const res = await fetch(`/api/rooms/${code}/signal?to=${myId}`, { cache: "no-store" });
        const items = (await res.json()) as { from: string; data: any }[];
        for (const it of items) await handleSignal(it.from, it.data);
      } catch {}
      if (!stop) setTimeout(poll, 1000);
    };
    poll();
    return () => {
      stop = true;
    };
  }, [active, code, myId, handleSignal]);

  // Reconcile peer connections with the current player list.
  useEffect(() => {
    if (!active) return;
    const ids = new Set(peers.map((p) => p.id));
    peers.forEach((p) => {
      if (p.id !== myId && !pcs.current.has(p.id)) createPeer(p, myId < p.id);
    });
    for (const [id, pc] of pcs.current) {
      if (!ids.has(id)) {
        pc.close();
        pcs.current.delete(id);
        channels.current.delete(id);
        pendingCandidates.current.delete(id);
        setRemote((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
      }
    }
  }, [active, peers, myId, createPeer]);

  // Re-offer to initiator peers that haven't connected yet (late joiners / dropped signals).
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      for (const [id, pc] of pcs.current) {
        const connected = pc.connectionState === "connected";
        if (myId < id && !connected && pc.signalingState === "stable") makeOffer(id);
      }
    }, 4000);
    return () => clearInterval(t);
  }, [active, myId, makeOffer]);

  // Tear everything down when the call ends / component unmounts.
  useEffect(() => {
    if (active) return;
    pcs.current.forEach((pc) => pc.close());
    pcs.current.clear();
    channels.current.clear();
    pendingCandidates.current.clear();
    setRemote({});
  }, [active]);

  useEffect(() => {
    return () => {
      pcs.current.forEach((pc) => pc.close());
      pcs.current.clear();
    };
  }, []);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const ts = Date.now();
      const payload = JSON.stringify({ name: myName, text: trimmed, ts });
      channels.current.forEach((ch) => {
        if (ch.readyState === "open") {
          try {
            ch.send(payload);
          } catch {}
        }
      });
      addMessage({ from: myId, name: myName, text: trimmed, ts, mine: true });
    },
    [myId, myName, addMessage]
  );

  return { remote, messages, sendChat };
}
