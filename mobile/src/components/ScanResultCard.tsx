import { Text, View } from "react-native";
import { Lightbulb, XCircle, Zap } from "lucide-react-native";
import type { AnalysisResult } from "@shared/types";
import { MATERIAL_PROFILES } from "@shared/materials";
import { formatGrams } from "@shared/utils";
import { useI18n } from "@/lib/i18n";
import { C, F, cardPrint, hardShadow } from "@/theme";
import { MaterialIcon, hexA } from "./MaterialIcon";
import { ConfRing } from "./ConfRing";
import { PressButton, Stamp } from "./ui";

/**
 * Result card v2 — the poster moment: a full bin-colour header band with the
 * material name in Fraunces + confidence ring, over an ink-bordered body.
 */
export function ScanResultCard({
  result,
  onScanAgain,
}: {
  result: AnalysisResult;
  onScanAgain: () => void;
}) {
  const { t, lang } = useI18n();
  const profile = MATERIAL_PROFILES[result.material];
  const confidencePct = Math.round(result.confidence * 100);
  const binColor = profile.bin.color;

  return (
    <View style={[cardPrint, { boxShadow: hardShadow, overflow: "hidden" }]}>
      {/* Bin-colour header band */}
      <View style={{ backgroundColor: binColor, padding: 16, flexDirection: "row", gap: 12 }}>
        <MaterialIcon material={result.material} size="md" />
        <View style={{ flex: 1, gap: 7 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <Stamp text={profile.label[lang]} rotate={-1.5} solid />
            {result.demo ? <Stamp text={t("result.demoBadge")} rotate={1} /> : null}
          </View>
          <Text
            style={{ fontFamily: F.display, fontSize: 25, lineHeight: 25, color: C.ink, textTransform: "capitalize" }}
          >
            {result.itemName}
          </Text>
        </View>
        <ConfRing progress={result.confidence} size={58} stroke={6}>
          <Text style={{ fontFamily: F.monoBold, fontSize: 12, color: C.ink }}>{confidencePct}%</Text>
        </ConfRing>
      </View>

      <View style={{ padding: 16, gap: 14, backgroundColor: C.paper2 }}>
        {/* reasoning */}
        {result.reasoning ? (
          <Text style={{ fontFamily: F.mono, fontSize: 10, lineHeight: 14, color: C.inkSoft }}>
            {t("result.reasoning")}: {result.reasoning}
          </Text>
        ) : null}

        {/* Bin */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 13,
            borderWidth: 1.5,
            borderColor: C.ink,
            borderRadius: 10,
            backgroundColor: C.paper,
            padding: 13,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 7,
              borderWidth: 1.5,
              borderColor: C.ink,
              backgroundColor: binColor,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.monoBold, fontSize: 9, letterSpacing: 1.8, color: C.inkSoft, textTransform: "uppercase" }}>
              {t("result.bin")}
            </Text>
            <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.ink, marginTop: 1 }}>
              {result.binLabel || profile.bin.label[lang]}
            </Text>
          </View>
          {!result.recyclable ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, borderWidth: 1.5, borderColor: C.ink, backgroundColor: "rgba(179,64,31,0.12)", paddingHorizontal: 8, paddingVertical: 4 }}>
              <XCircle size={11} color={C.danger} />
              <Text style={{ fontFamily: F.monoBold, fontSize: 8, color: C.danger, textTransform: "uppercase" }}>
                {t("result.notRecyclable")}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Steps + tips */}
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={stylesHeader}>{t("result.instructions")}</Text>
            {result.instructions.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 7 }}>
                <Text style={{ fontFamily: F.monoBold, fontSize: 10, color: C.leaf, marginTop: 1 }}>
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <Text style={{ fontFamily: F.sans, fontSize: 12, lineHeight: 16, color: C.ink, flex: 1 }}>{step}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={stylesHeader}>{t("result.tips")}</Text>
            {result.aiTips.map((tip, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 7, marginBottom: 7 }}>
                <Zap size={12} color={C.leaf} strokeWidth={2.4} style={{ marginTop: 2 }} />
                <Text style={{ fontFamily: F.sans, fontSize: 12, lineHeight: 16, color: C.ink, flex: 1 }}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Eco fact */}
        {result.ecoFact ? (
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              borderLeftWidth: 4,
              borderLeftColor: C.leaf,
              borderWidth: 1.5,
              borderColor: C.ink,
              borderRadius: 8,
              backgroundColor: C.paper,
              padding: 11,
            }}
          >
            <Lightbulb size={16} color={C.leaf} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.monoBold, fontSize: 9, letterSpacing: 1.6, color: C.leaf, textTransform: "uppercase" }}>
                {t("result.ecoFact")}
              </Text>
              <Text style={{ fontFamily: F.sans, fontSize: 12, lineHeight: 16, color: C.ink, marginTop: 3 }}>
                {result.ecoFact}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Stats */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <View style={stylesStatChip}>
            <Text style={stylesStatText}>
              {t("result.co2")}: <Text style={{ color: C.leaf, fontFamily: F.monoBold }}>{formatGrams(result.co2SavedG, lang)}</Text>
            </Text>
          </View>
          <View style={stylesStatChip}>
            <Text style={stylesStatText}>
              {t("result.points")}: <Text style={{ color: C.leaf, fontFamily: F.monoBold }}>+{result.points}</Text>
            </Text>
          </View>
        </View>

        <PressButton label={t("result.scanAgain")} onPress={onScanAgain} small />
      </View>
    </View>
  );
}

const stylesHeader = {
  fontFamily: F.monoBold,
  fontSize: 10,
  letterSpacing: 1.8,
  color: C.ink,
  textTransform: "uppercase" as const,
  borderBottomWidth: 1.5,
  borderBottomColor: C.ink,
  paddingBottom: 6,
  marginBottom: 9,
};

const stylesStatChip = {
  flexDirection: "row" as const,
  borderWidth: 1.5,
  borderColor: C.ink,
  borderRadius: 6,
  backgroundColor: C.paper,
  paddingHorizontal: 11,
  paddingVertical: 6,
};

const stylesStatText = {
  fontFamily: F.mono,
  fontSize: 11,
  color: C.inkSoft,
};
