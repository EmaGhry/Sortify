import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  BatteryCharging,
  Car,
  Cpu,
  Crown,
  Flame,
  Globe,
  Leaf,
  Lock,
  Medal,
  Recycle,
  Smartphone,
  Sparkles,
  Star,
  Target,
  TreeDeciduous,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { MATERIALS } from "@shared/types";
import { MATERIAL_PROFILES } from "@shared/materials";
import { BADGES, levelFor } from "@shared/gamification";
import { co2Equivalents } from "@shared/co2";
import { formatGrams } from "@shared/utils";
import { useI18n } from "@/lib/i18n";
import { useAppState } from "@/lib/app-state";
import { C, F, cardPrint, hardShadow } from "@/theme";
import { BandHeader } from "@/components/BandHeader";
import { MaterialIcon, hexA } from "@/components/MaterialIcon";
import { ConfRing } from "@/components/ConfRing";

const BADGE_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  recycle: Recycle,
  leaf: Leaf,
  flame: Flame,
  crown: Crown,
  target: Target,
  star: Star,
  trophy: Trophy,
  zap: Zap,
  cpu: Cpu,
  battery: BatteryCharging,
  globe: Globe,
  medal: Medal,
};

const EQUIV_ICONS = { car: Car, smartphone: Smartphone, tree: TreeDeciduous } as const;

export default function ImpactScreen() {
  const { t, lang } = useI18n();
  const { state, stats, loaded } = useAppState();

  const { level, next, progress } = levelFor(stats.pointsTotal);
  const equivalents = useMemo(() => co2Equivalents(stats.co2TotalG), [stats.co2TotalG]);
  const maxMaterial = Math.max(1, ...MATERIALS.map((m) => stats.perMaterial[m] ?? 0));

  const streakDays = useMemo(() => {
    const set = new Set(state.scans.map((s) => new Date(s.createdAt).toDateString()));
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return { date: d, active: set.has(d.toDateString()) };
    });
  }, [state.scans]);

  const noData = loaded && stats.total === 0;

  const status = (
    <Text style={{ fontFamily: F.monoBold, fontSize: 11, color: "#86EFAC" }}>
      {state.badges.length}/{BADGES.length} ★
    </Text>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={{ paddingBottom: 32 }}>
      <BandHeader number="03" title={t("impact.title")} status={status} />

      {noData ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={[cardPrint, { alignItems: "center", padding: 40, gap: 10 }]}>
            <Leaf size={28} color={C.leaf} />
            <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft, textAlign: "center", letterSpacing: 1 }}>
              {t("impact.noData")}
            </Text>
          </View>
        </View>
      ) : (
        <>
          {/* Green hero band — giant CO2 numeral */}
          <View style={{ backgroundColor: C.leaf, paddingHorizontal: 16, paddingVertical: 22, marginTop: -2 }}>
            <Text style={{ fontFamily: F.monoBold, fontSize: 10, letterSpacing: 2.4, color: "#BBF7D0", textTransform: "uppercase" }}>
              {t("impact.co2")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 6 }}>
              <Text style={{ fontFamily: F.display, fontSize: 76, lineHeight: 66, color: C.paper }}>
                {stats.co2TotalG >= 1000 ? (stats.co2TotalG / 1000).toFixed(2) : Math.round(stats.co2TotalG)}
              </Text>
              <Text style={{ fontFamily: F.displayBold, fontSize: 26, color: C.paper, paddingBottom: 6 }}>
                {stats.co2TotalG >= 1000 ? "kg" : "g"}
              </Text>
            </View>
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: "#BBF7D0", marginTop: 8 }}>
              {stats.total} {t("impact.scans").toLowerCase()} · {Math.round(stats.recyclableRate * 100)}% {t("impact.recyclableRate").toLowerCase()}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 16 }}>
            {/* Level + punch card */}
            <View style={[cardPrint, { padding: 18, gap: 18 }, { boxShadow: "4px 4px 0 0 #1C2B21" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <ConfRing progress={progress} size={96} stroke={9}>
                  <Text style={{ fontFamily: F.monoBold, fontSize: 19, color: C.ink }}>{stats.pointsTotal}</Text>
                  <Text style={{ fontFamily: F.monoBold, fontSize: 8, letterSpacing: 1.6, color: C.inkSoft, textTransform: "uppercase" }}>
                    {t("common.xp")}
                  </Text>
                </ConfRing>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.monoBold, fontSize: 9, letterSpacing: 1.8, color: C.inkSoft, textTransform: "uppercase" }}>
                    {t("impact.level")}
                  </Text>
                  <Text style={{ fontFamily: F.displayBold, fontSize: 21, color: C.ink, marginTop: 2 }}>
                    {level.name[lang]}
                  </Text>
                  {next ? (
                    <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkSoft, marginTop: 5 }}>
                      {Math.max(0, next.min - stats.pointsTotal)} XP → {next.name[lang]}
                    </Text>
                  ) : (
                    <Text style={{ fontFamily: F.monoBold, fontSize: 11, color: C.leaf, marginTop: 5 }}>MAX</Text>
                  )}
                </View>
                <Flame size={22} color={stats.streakDays > 0 ? C.leaf : C.inkSoft} strokeWidth={2.2} />
              </View>

              <View>
                <Text style={stylesSectionHeader}>{t("impact.streakTitle")}</Text>
                <View style={{ flexDirection: "row", gap: 5 }}>
                  {streakDays.map(({ date, active }, i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        height: 26,
                        borderRadius: 4,
                        borderWidth: 1.5,
                        borderColor: C.ink,
                        backgroundColor: active ? C.leaf : C.paper2,
                      }}
                    />
                  ))}
                </View>
                <Text style={{ fontFamily: F.mono, fontSize: 9, color: C.inkSoft, marginTop: 8, textTransform: "uppercase", letterSpacing: 1.2 }}>
                  {t("impact.streak")}: {stats.streakDays} {t("impact.days")}
                </Text>
              </View>
            </View>

            {/* Equivalents */}
            <View style={[cardPrint, { overflow: "hidden" }]}>
              <View style={{ backgroundColor: C.ink, paddingHorizontal: 18, paddingVertical: 12 }}>
                <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.paper }}>{t("impact.equivalents")}</Text>
              </View>
              {equivalents.length === 0 ? (
                <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft, padding: 18 }}>{t("impact.noData")}</Text>
              ) : (
                equivalents.map((eq, i) => {
                  const Icon = EQUIV_ICONS[eq.icon];
                  return (
                    <View
                      key={eq.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                        paddingHorizontal: 18,
                        paddingVertical: 13,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: C.inkFaint,
                      }}
                    >
                      <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: C.ink, backgroundColor: hexA(C.leaf, 0.12), alignItems: "center", justifyContent: "center" }}>
                        <Icon size={18} color={C.leaf} strokeWidth={2} />
                      </View>
                      <Text style={{ flex: 1, fontFamily: F.sans, fontSize: 13, lineHeight: 17, color: C.inkSoft }}>
                        <Text style={{ fontFamily: F.monoBold, fontSize: 17, color: C.leaf }}>{eq.value}</Text> {eq.label[lang]}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* Distribution */}
            <View style={[cardPrint, { overflow: "hidden" }]}>
              <View style={{ backgroundColor: C.ink, paddingHorizontal: 18, paddingVertical: 12 }}>
                <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.paper }}>{t("impact.distribution")}</Text>
              </View>
              <View style={{ padding: 18, gap: 10 }}>
                {MATERIALS.filter((m) => (stats.perMaterial[m] ?? 0) > 0).map((m) => {
                  const count = stats.perMaterial[m] ?? 0;
                  const profile = MATERIAL_PROFILES[m];
                  return (
                    <View key={m} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <MaterialIcon material={m} size="sm" />
                      <Text style={{ width: 90, fontFamily: F.monoBold, fontSize: 9, letterSpacing: 1, color: C.ink, textTransform: "uppercase" }} numberOfLines={1}>
                        {profile.label[lang]}
                      </Text>
                      <View style={{ flex: 1, height: 13, borderRadius: 3, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.paper2 }}>
                        <View
                          style={{
                            height: "100%",
                            width: `${(count / maxMaterial) * 100}%`,
                            borderRadius: 1,
                            backgroundColor: profile.bin.color,
                          }}
                        />
                      </View>
                      <Text style={{ width: 26, textAlign: "right", fontFamily: F.monoBold, fontSize: 13, color: C.ink }}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Badges */}
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: F.monoBold, fontSize: 11, letterSpacing: 2, color: C.ink, textTransform: "uppercase" }}>
                  {t("impact.badges")}
                </Text>
                <View style={{ flex: 1, height: 1.5, backgroundColor: C.ink }} />
                <View style={{ borderRadius: 6, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.leaf, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: F.monoBold, fontSize: 10, color: C.paper }}>
                    {state.badges.length}/{BADGES.length}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {BADGES.map((badge, i) => {
                  const unlocked = state.badges.includes(badge.id);
                  const Icon = BADGE_ICONS[badge.icon];
                  return (
                    <View
                      key={badge.id}
                      style={{
                        width: "31%",
                        flexGrow: 1,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderStyle: unlocked ? "solid" : "dashed",
                        borderColor: unlocked ? C.ink : "rgba(28,43,33,0.4)",
                        backgroundColor: unlocked ? hexA(C.leaf, 0.1) : C.paper2,
                        padding: 12,
                        opacity: unlocked ? 1 : 0.6,
                        transform: unlocked ? [{ rotate: i % 2 === 0 ? "-0.7deg" : "0.7deg" }] : [],
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          borderWidth: 1.5,
                          borderColor: unlocked ? C.ink : "rgba(28,43,33,0.3)",
                          backgroundColor: unlocked ? C.leaf : C.paper,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {unlocked ? (
                          <Icon size={16} color={C.paper} strokeWidth={2} />
                        ) : (
                          <Lock size={14} color={C.inkSoft} strokeWidth={2} />
                        )}
                      </View>
                      <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: C.ink, marginTop: 8 }} numberOfLines={1}>
                        {badge.name[lang]}
                      </Text>
                      <Text style={{ fontFamily: F.mono, fontSize: 9, lineHeight: 12, color: C.inkSoft, marginTop: 3 }} numberOfLines={2}>
                        {badge.desc[lang]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const stylesSectionHeader = {
  fontFamily: F.monoBold,
  fontSize: 10,
  letterSpacing: 1.8,
  color: C.ink,
  textTransform: "uppercase" as const,
  borderBottomWidth: 1.5,
  borderBottomColor: C.ink,
  paddingBottom: 7,
  marginBottom: 10,
};
