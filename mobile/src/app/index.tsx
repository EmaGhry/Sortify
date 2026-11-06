import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { CameraOff, ImagePlus, ScanLine, ShieldCheck, Upload, WifiOff } from "lucide-react-native";
import type { AnalysisResult } from "@shared/types";
import { MATERIAL_PROFILES } from "@shared/materials";
import { demoResult } from "@shared/ai/demo";
import { formatGrams } from "@shared/utils";
import { BADGES } from "@shared/gamification";
import { useI18n } from "@/lib/i18n";
import { useAppState } from "@/lib/app-state";
import { useToast } from "@/lib/toast";
import { analyzeImage, ApiError, ERROR_KEYS, fetchStatus } from "@/lib/api";
import { downscaleToBase64, makeThumbDataUrl } from "@/lib/image";
import { C, F, cardPrint, hardShadow } from "@/theme";
import { BandHeader } from "@/components/BandHeader";
import { DotGrid } from "@/components/DotGrid";
import { ScanResultCard } from "@/components/ScanResultCard";
import { PressButton, SpecStrip } from "@/components/ui";

type Phase = "idle" | "camera" | "preview" | "busy" | "result";

const STEP_KEYS = ["scan.step.uploading", "scan.step.identifying", "scan.step.matching"] as const;

export default function ScanScreen() {
  const { t, lang } = useI18n();
  const { state, stats, commit } = useAppState();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("idle");
  const [live, setLive] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    fetchStatus().then((s) => setLive(s.live));
  }, []);

  useEffect(() => {
    if (phase !== "busy") return;
    setStepIndex(0);
    const timer = setInterval(() => setStepIndex((i) => Math.min(i + 1, STEP_KEYS.length - 1)), 1400);
    return () => clearInterval(timer);
  }, [phase]);

  const onBadges = useCallback(
    (badgeIds: string[]) => {
      for (const id of badgeIds) {
        const badge = BADGES.find((b) => b.id === id);
        if (badge) {
          toast({ title: t("badge.toastTitle"), description: badge.name[lang], variant: "success" });
        }
      }
    },
    [toast, t, lang],
  );

  const acceptCapture = useCallback(
    async (uri: string) => {
      try {
        const b64 = await downscaleToBase64(uri, 1024, 0.85);
        setImageUri(uri);
        setImageB64(b64);
        setPhase("preview");
      } catch {
        toast({ title: t("toast.errorTitle"), description: t("error.generic"), variant: "error" });
      }
    },
    [toast, t],
  );

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: Platform.OS === "android" });
      if (photo?.uri) await acceptCapture(photo.uri);
    } catch {
      toast({ title: t("toast.errorTitle"), description: t("error.generic"), variant: "error" });
    }
  }, [acceptCapture, toast, t]);

  const pickFromGallery = useCallback(async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!res.canceled && res.assets[0]?.uri) await acceptCapture(res.assets[0].uri);
  }, [acceptCapture]);

  const commitResult = useCallback(
    (res: AnalysisResult) => {
      void (async () => {
        const thumb = imageUri ? await makeThumbDataUrl(imageUri) : undefined;
        const newBadges = commit(res, thumb);
        onBadges(newBadges);
      })();
    },
    [imageUri, commit, onBadges],
  );

  const analyze = useCallback(async () => {
    if (!imageB64) return;
    setPhase("busy");
    try {
      const data = await analyzeImage(imageB64, lang);
      setResult(data);
      commitResult(data);
      setPhase("result");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "GENERIC";
      if (code === "OFFLINE") {
        const demo = demoResult(lang);
        setResult(demo);
        commitResult(demo);
        setPhase("result");
        toast({ title: t("toast.errorTitle"), description: t("error.provider"), variant: "error" });
        return;
      }
      toast({ title: t("toast.errorTitle"), description: t(ERROR_KEYS[code]), variant: "error" });
      setPhase("preview");
    }
  }, [imageB64, lang, commitResult, toast, t]);

  const runLocalDemo = useCallback(() => {
    setPhase("busy");
    setTimeout(() => {
      const demo = demoResult(lang);
      setResult(demo);
      commitResult(demo);
      setPhase("result");
    }, 1500);
  }, [lang, commitResult]);

  const reset = useCallback(() => {
    setImageUri(null);
    setImageB64(null);
    setResult(null);
    setPhase("idle");
  }, []);

  const statusPill =
    live === false ? (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(244,241,233,0.4)", borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 }}>
        <WifiOff size={12} color="#FDE68A" />
        <Text style={{ fontFamily: F.monoBold, fontSize: 9, color: "#FDE68A", textTransform: "uppercase", letterSpacing: 1.2 }}>{t("common.demo")}</Text>
      </View>
    ) : live ? (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 6, backgroundColor: C.leaf, paddingHorizontal: 9, paddingVertical: 5 }}>
        <ShieldCheck size={12} color={C.paper} />
        <Text style={{ fontFamily: F.monoBold, fontSize: 9, color: C.paper, textTransform: "uppercase", letterSpacing: 1.2 }}>{t("scan.liveReady")}</Text>
      </View>
    ) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={{ paddingBottom: 32 }}>
      <BandHeader number="01" title={t("scan.title")} status={statusPill} />

      <View style={{ paddingHorizontal: 16, marginTop: -18 }}>
        <SpecStrip
          cells={[
            { label: t("impact.scans"), value: String(stats.total) },
            { label: t("impact.co2"), value: formatGrams(stats.co2TotalG, lang), highlight: true },
            { label: t("common.xp"), value: String(stats.pointsTotal) },
          ]}
        />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
        {/* Capture area */}
        {phase === "camera" ? (
          <CameraPanel
            facing={facing}
            setFacing={setFacing}
            cameraRef={cameraRef}
            permission={permission}
            requestPermission={requestPermission}
            onCapture={() => void capture()}
            onClose={reset}
          />
        ) : phase === "preview" || phase === "busy" ? (
          <View style={[cardPrint, { overflow: "hidden" }, { boxShadow: hardShadow }]}>
            <View style={{ position: "relative" }}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: "100%", aspectRatio: 4 / 3 }} resizeMode="cover" />
              ) : null}
              {phase === "busy" ? (
                <>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(16,22,15,0.55)" }]} />
                  <View style={[StyleSheet.absoluteFill, { justifyContent: "center" }]} pointerEvents="none">
                    <View style={{ height: 46, backgroundColor: "rgba(30,122,70,0.35)", borderTopWidth: 2, borderBottomWidth: 2, borderTopColor: C.leaf, borderBottomColor: C.leaf }} />
                  </View>
                  <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                    <View style={{ width: 240, borderWidth: 1.5, borderColor: C.paper, borderRadius: 10, backgroundColor: C.paper2, padding: 16, alignItems: "center", gap: 10 }}>
                      <Text style={{ fontFamily: F.monoBold, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: C.ink }}>
                        {t(STEP_KEYS[stepIndex])}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {STEP_KEYS.map((_, i) => (
                          <View key={i} style={{ height: 6, width: 28, borderRadius: 2, backgroundColor: i <= stepIndex ? C.leaf : "rgba(28,43,33,0.15)" }} />
                        ))}
                      </View>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", gap: 10, padding: 14, borderTopWidth: 1.5, borderTopColor: C.ink }}>
              <View style={{ flex: 1 }}>
                <PressButton label={phase === "busy" ? t("scan.analyzing") : t("scan.analyze")} onPress={() => void analyze()} disabled={phase === "busy"} small />
              </View>
              <PressButton label={t("scan.retake")} onPress={reset} variant="secondary" small disabled={phase === "busy"} />
            </View>
          </View>
        ) : phase === "result" && result ? (
          <View style={[cardPrint, { overflow: "hidden" }, { boxShadow: hardShadow }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={{ width: "100%", aspectRatio: 4 / 3 }} resizeMode="cover" />
            ) : (
              <View style={{ aspectRatio: 4 / 3, alignItems: "center", justifyContent: "center", backgroundColor: C.paper }}>
                <ScanLine size={40} color={C.leaf} />
              </View>
            )}
            <View style={{ padding: 14, borderTopWidth: 1.5, borderTopColor: C.ink }}>
              <PressButton label={t("result.scanAgain")} onPress={reset} small />
            </View>
          </View>
        ) : (
          /* Scanner device — idle */
          <View style={[cardPrint, { overflow: "hidden" }, { boxShadow: hardShadow }]}>
            <View style={{ position: "relative", height: 280 }}>
              <DotGrid opacity={0.6} />
              <Text
                style={{
                  position: "absolute",
                  top: 10,
                  left: 12,
                  fontFamily: F.monoBold,
                  fontSize: 9,
                  letterSpacing: 2,
                  color: C.inkSoft,
                  textTransform: "uppercase",
                }}
              >
                Sortify Scanner · v1
              </Text>
              {/* viewfinder corners */}
              {[
                { top: 34, left: 18, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
                { top: 34, right: 18, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
                { bottom: 74, left: 18, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
                { bottom: 74, right: 18, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
              ].map((corner, i) => (
                <View key={i} style={[{ position: "absolute", width: 30, height: 30, borderColor: C.leaf }, corner]} />
              ))}
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                <View
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: C.ink,
                    backgroundColor: C.leaf,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ rotate: "-3deg" }],
                    boxShadow: hardShadow,
                  }}
                >
                  <ScanLine size={42} color={C.paper} strokeWidth={2} />
                </View>
                <Text style={{ fontFamily: F.monoBold, fontSize: 10, letterSpacing: 2, color: C.inkSoft, textTransform: "uppercase", marginTop: 18 }}>
                  {t("app.tagline")}
                </Text>
              </View>
            </View>
            <View style={{ padding: 16, gap: 12, borderTopWidth: 1.5, borderTopColor: C.ink, backgroundColor: C.paper2 }}>
              <PressButton
                label={t("scan.startCamera")}
                onPress={() =>
                  void (permission?.granted
                    ? setPhase("camera")
                    : requestPermission().then((p) => (p.granted ? setPhase("camera") : null)))
                }
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PressButton label={t("scan.upload")} onPress={() => void pickFromGallery()} variant="secondary" small icon={<Upload size={14} color={C.ink} />} />
                </View>
                <View style={{ flex: 1 }}>
                  <PressButton label={t("scan.tryExample")} onPress={runLocalDemo} variant="secondary" small icon={<ImagePlus size={14} color={C.leaf} />} />
                </View>
              </View>
              <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1.4, textAlign: "center" }}>
                {t("scan.uploadHint")}
              </Text>
            </View>
          </View>
        )}

        {/* Result */}
        {result && phase === "result" ? <ScanResultCard result={result} onScanAgain={reset} /> : null}

        {/* Recent scans */}
        <View style={{ gap: 10, marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontFamily: F.monoBold, fontSize: 11, letterSpacing: 2, color: C.ink, textTransform: "uppercase" }}>
              {t("scan.recent")}
            </Text>
            <View style={{ flex: 1, height: 1.5, backgroundColor: C.ink }} />
          </View>
          {state.scans.length === 0 ? (
            <View style={[cardPrint, { padding: 16 }]}>
              <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft }}>{t("scan.recentEmpty")}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {state.scans.slice(0, 10).map((scan, i) => {
                const profile = MATERIAL_PROFILES[scan.material];
                return (
                  <View key={scan.id} style={[cardPrint, { width: 142, overflow: "hidden" }]}>
                    {scan.thumb ? (
                      <Image source={{ uri: scan.thumb }} style={{ height: 64 }} resizeMode="cover" />
                    ) : (
                      <View style={{ height: 64, backgroundColor: C.paper, alignItems: "center", justifyContent: "center" }}>
                        <ScanLine size={20} color={C.inkSoft} />
                      </View>
                    )}
                    <View style={{ padding: 9, gap: 3, borderTopWidth: 1.5, borderTopColor: C.ink }}>
                      <Text style={{ fontFamily: F.monoBold, fontSize: 9, color: C.inkSoft }}>
                        #{String(i + 1).padStart(2, "0")}
                      </Text>
                      <Text style={{ fontFamily: F.sansBold, fontSize: 12, color: C.ink }} numberOfLines={1}>
                        {scan.itemName}
                      </Text>
                      <Text
                        style={{
                          fontFamily: F.monoBold,
                          fontSize: 9,
                          color: profile.id === "OTHER" ? C.inkSoft : profile.bin.color,
                          textTransform: "uppercase",
                        }}
                        numberOfLines={1}
                      >
                        {profile.label[lang]}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function CameraPanel({
  facing,
  setFacing,
  cameraRef,
  permission,
  requestPermission,
  onCapture,
  onClose,
}: {
  facing: "back" | "front";
  setFacing: (f: "back" | "front") => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cameraRef: React.RefObject<any>;
  permission: { granted: boolean } | null;
  requestPermission: () => Promise<{ granted: boolean }>;
  onCapture: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();

  if (!permission?.granted) {
    return (
      <View style={[cardPrint, { alignItems: "center", gap: 14, padding: 28 }]}>
        <CameraOff size={36} color={C.danger} />
        <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.inkSoft, textAlign: "center", lineHeight: 19 }}>
          {t("scan.cameraDenied")}
        </Text>
        <PressButton label={t("scan.cameraRetry")} onPress={() => void requestPermission()} small />
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 12, borderWidth: 1.5, borderColor: C.ink, overflow: "hidden", boxShadow: hardShadow }}>
      <View style={{ position: "relative" }}>
        <CameraView ref={cameraRef} style={{ width: "100%", aspectRatio: 4 / 3 }} facing={facing} mode="picture" />
        {[
          { top: 10, left: 10, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
          { top: 10, right: 10, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
          { bottom: 10, left: 10, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
          { bottom: 10, right: 10, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
        ].map((corner, i) => (
          <View key={i} style={[{ position: "absolute", width: 26, height: 26, borderColor: C.paper }, corner]} />
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, backgroundColor: C.paper2, borderTopWidth: 1.5, borderTopColor: C.ink }}>
        <Pressable
          onPress={onClose}
          accessibilityLabel={t("common.close")}
          style={{ width: 42, height: 42, borderRadius: 8, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.paper2, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: F.monoBold, fontSize: 13, color: C.ink }}>✕</Text>
        </Pressable>
        <Pressable
          onPress={onCapture}
          accessibilityLabel={t("scan.capture")}
          style={({ pressed }) => ({
            width: 64,
            height: 64,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: C.paper,
            backgroundColor: C.leaf,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pressed ? 0.94 : 1 }],
            boxShadow: hardShadow,
          })}
        >
          <ScanLine size={27} color={C.paper} strokeWidth={2.2} />
        </Pressable>
        <Pressable
          onPress={() => setFacing(facing === "back" ? "front" : "back")}
          accessibilityLabel="Switch camera"
          style={{ width: 42, height: 42, borderRadius: 8, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.paper2, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: F.monoBold, fontSize: 13, color: C.ink }}>⇅</Text>
        </Pressable>
      </View>
    </View>
  );
}
