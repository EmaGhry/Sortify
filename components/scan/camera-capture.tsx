"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraOff, ScanLine, SwitchCamera, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type CameraError = "denied" | "unavailable" | null;

export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<CameraError>(null);
  const [starting, setStarting] = useState(true);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async (mode: "environment" | "user") => {
    setStarting(true);
    setError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStarting(false);
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") setError("denied");
      else setError("unavailable");
      setStarting(false);
    }
  }, [stopStream]);

  useEffect(() => {
    void start(facing);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const maxSide = 1024;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopStream();
    onCapture(dataUrl);
  }, [facing, onCapture, stopStream]);

  return (
    <div className="relative overflow-hidden border-[1.5px] border-ink shadow-hard">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn("aspect-[4/3] w-full bg-[#10160f] object-cover", facing === "user" && "scale-x-[-1]")}
      />

      {/* framing guides */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 aspect-square border-2 border-dashed border-paper/40 shadow-[0_0_0_100vmax_rgba(16,22,15,0.35)]" />
        <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 aspect-square animate-pulse-soft">
          <span className="absolute -top-px -left-px size-6 rounded-tl-lg border-t-[3px] border-l-[3px] border-leaf" />
          <span className="absolute -top-px -right-px size-6 rounded-tr-lg border-t-[3px] border-r-[3px] border-leaf" />
          <span className="absolute -bottom-px -left-px size-6 rounded-bl-lg border-b-[3px] border-l-[3px] border-leaf" />
          <span className="absolute -bottom-px -right-px size-6 rounded-br-lg border-b-[3px] border-r-[3px] border-leaf" />
        </div>
        <span className="absolute left-3 top-3 font-semibold text-xs uppercase tracking-wider text-paper/80">
          SORTIFY CAM · 01
        </span>
      </div>

      <button
        onClick={onClose}
        aria-label={t("common.close")}
        className="absolute right-3 top-3 grid size-9 place-items-center border-[1.5px] border-ink bg-paper2 text-ink shadow-hard-sm btn-press"
      >
        <X className="size-4" strokeWidth={2.4} />
      </button>

      {error ? (
        <div className="absolute inset-4 grid place-items-center border-[1.5px] border-ink bg-paper2 px-6 text-center">
          <div className="animate-fade-up">
            <span className="mx-auto grid size-12 place-items-center border-[1.5px] border-ink bg-danger/15 text-danger">
              <CameraOff className="size-6" />
            </span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
              {error === "denied" ? t("scan.cameraDenied") : t("scan.cameraUnavailable")}
            </p>
            <button
              onClick={() => void start(facing)}
              className="btn-press mt-4 border-[1.5px] border-ink bg-leaf px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper shadow-hard-sm"
            >
              {t("scan.cameraRetry")}
            </button>
          </div>
        </div>
      ) : starting ? (
        <div className="absolute inset-0 grid place-items-center bg-[#10160f]/70">
          <ScanLine className="size-10 animate-pulse-soft text-leaf" />
        </div>
      ) : null}

      {!error && !starting ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
          <button
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            aria-label="Switch camera"
            className="grid size-11 place-items-center border-[1.5px] border-paper/70 bg-[#10160f]/60 text-paper backdrop-blur transition hover:bg-[#10160f]/80"
          >
            <SwitchCamera className="size-5" strokeWidth={1.8} />
          </button>
          <button
            onClick={() => void capture()}
            aria-label={t("scan.capture")}
            className="grid size-16 place-items-center border-[2px] border-paper bg-leaf text-paper shadow-hard-sm transition hover:brightness-110 active:scale-95"
          >
            <ScanLine className="size-7" strokeWidth={2.2} />
          </button>
          <span className="size-11" />
        </div>
      ) : null}
    </div>
  );
}
