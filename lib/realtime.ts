import { useEffect, useRef } from "react";
import type { RealtimeEvent } from "./types";

export type { RealtimeEvent };

const ENDPOINT = "/api/events";
const MAX_RETRY_DELAY_MS = 15_000;

/**
 * Membuka koneksi SSE ke `/api/events`.
 * EventSource otomatis reconnect untuk error sementara; reconnect manual
 * dilakukan hanya saat koneksi ditutup permanen (mis. HTTP 401).
 */
export function connectRealtime(
  onEvent: (event: RealtimeEvent) => void,
): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => undefined;
  }

  let source: EventSource | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let stopped = false;

  function scheduleRetry() {
    if (stopped || retryTimer !== null) return;
    const delay = Math.min(1000 * 2 ** attempts, MAX_RETRY_DELAY_MS);
    attempts += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      open();
    }, delay);
  }

  function open() {
    if (stopped) return;
    source?.close();

    const next = new EventSource(ENDPOINT);
    source = next;

    next.addEventListener("open", () => {
      attempts = 0;
    });
    next.addEventListener("message", (raw) => {
      try {
        onEvent(JSON.parse(raw.data) as RealtimeEvent);
      } catch {
        // abaikan payload yang tidak valid
      }
    });
    next.addEventListener("error", () => {
      if (stopped || source !== next) return;
      // CONNECTING berarti EventSource masih mencoba sendiri;
      // CLOSED berarti koneksi gagal permanen, jadwalkan ulang.
      if (next.readyState === EventSource.CLOSED) scheduleRetry();
    });
  }

  open();

  return () => {
    stopped = true;
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
    source?.close();
    source = null;
  };
}

/**
 * Subscribe ke event realtime selama komponen ter-mount.
 * Handler terbaru selalu dipakai lewat ref, jadi koneksi tidak perlu
 * dibuka-tutup saat handler berubah tiap render.
 */
export function useRealtimeEvents(
  handler: (event: RealtimeEvent) => void,
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    return connectRealtime((event) => handlerRef.current(event));
  }, []);
}
