import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import type { Material } from "@shared/types";
import { MATERIALS } from "@shared/types";
import { MATERIAL_PROFILES } from "@shared/materials";
import { formatGrams, timeAgo } from "@shared/utils";
import { useI18n } from "@/lib/i18n";
import { useAppState } from "@/lib/app-state";
import { useToast } from "@/lib/toast";
import { deleteScan, clearAll } from "@/lib/storage";
import { C, F, cardPrint } from "@/theme";
import { BandHeader } from "@/components/BandHeader";
import { MaterialIcon } from "@/components/MaterialIcon";

export default function HistoryScreen() {
  const { t, lang } = useI18n();
  const { state, remove, clear } = useAppState();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Material | null>(null);

  const presentMaterials = useMemo(
    () => MATERIALS.filter((m) => state.scans.some((s) => s.material === m)),
    [state.scans],
  );
  const filtered = useMemo(
    () => (filter ? state.scans.filter((s) => s.material === filter) : state.scans),
    [state.scans, filter],
  );

  const onRemove = (id: string) => {
    void remove(id);
    toast({ title: t("common.delete"), variant: "info" });
  };

  const onClear = () => {
    void clear();
    setFilter(null);
  };

  const status = state.scans.length > 0 ? (
    <Text style={{ fontFamily: F.monoBold, fontSize: 11, color: "#86EFAC" }}>
      {state.scans.length} {t("impact.scans").split(" ")[0].toUpperCase()}
    </Text>
  ) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={{ paddingBottom: 32 }}>
      <BandHeader number="02" title={t("history.title")} status={status} />

      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
        {state.scans.length > 0 ? (
          <PressButtonWrapper onPress={onClear} label={t("history.clear")} />
        ) : null}

        {/* Filters */}
        {presentMaterials.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <FilterChip active={filter === null} onPress={() => setFilter(null)} label={`${t("history.all")} · ${state.scans.length}`} />
            {presentMaterials.map((m) => {
              const count = state.scans.filter((s) => s.material === m).length;
              return (
                <FilterChip
                  key={m}
                  active={filter === m}
                  onPress={() => setFilter(m)}
                  label={`${MATERIAL_PROFILES[m].label[lang]} · ${count}`}
                />
              );
            })}
          </ScrollView>
        ) : null}

        {/* Ledger with bin-colour spines */}
        {filtered.length === 0 ? (
          <View style={[cardPrint, { alignItems: "center", padding: 40, gap: 10 }]}>
            <Trash2 size={26} color={C.inkSoft} />
            <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1.2 }}>
              {t("history.empty")}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((scan, idx) => {
              const profile = MATERIAL_PROFILES[scan.material];
              return (
                <View
                  key={scan.id}
                  style={[cardPrint, { flexDirection: "row", overflow: "hidden" }, { boxShadow: "2px 2px 0 0 #1C2B21" }]}
                >
                  {/* bin-colour spine */}
                  <View style={{ width: 6, backgroundColor: profile.id === "OTHER" ? C.inkSoft : profile.bin.color }} />
                  <View style={{ padding: 12, justifyContent: "center" }}>
                    {scan.thumb ? (
                      <Image source={{ uri: scan.thumb }} style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1.5, borderColor: C.ink }} />
                    ) : (
                      <MaterialIcon material={scan.material} size="sm" />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0, justifyContent: "center", gap: 3, paddingVertical: 12 }}>
                    <Text style={{ fontFamily: F.sansBold, fontSize: 14, color: C.ink }} numberOfLines={1}>
                      {scan.itemName}
                    </Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkSoft }} numberOfLines={1}>
                      <Text style={{ color: profile.id === "OTHER" ? C.inkSoft : profile.bin.color, fontFamily: F.monoBold }}>
                        {profile.label[lang]}
                      </Text>
                      {" · "}
                      {timeAgo(scan.createdAt, lang)}
                      {" · "}
                      {Math.round(scan.confidence * 100)}%
                      {scan.demo ? ` · ${t("common.demo")}` : ""}
                    </Text>
                  </View>
                  <View style={{ justifyContent: "center", alignItems: "flex-end", paddingRight: 8, gap: 2 }}>
                    <Text style={{ fontFamily: F.monoBold, fontSize: 13, color: C.leaf }}>+{scan.points}</Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 9, color: C.inkSoft }}>{formatGrams(scan.co2SavedG, lang)} CO2</Text>
                    <Pressable
                      onPress={() => onRemove(scan.id)}
                      accessibilityLabel={t("common.delete")}
                      hitSlop={6}
                      style={{ marginTop: 3 }}
                    >
                      <Trash2 size={14} color={C.inkSoft} />
                    </Pressable>
                  </View>
                  <Text
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 8,
                      fontFamily: F.monoBold,
                      fontSize: 8,
                      color: C.inkSoft,
                      opacity: 0.7,
                    }}
                  >
                    {String(filtered.length - idx).padStart(3, "0")}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function PressButtonWrapper({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderWidth: 1.5,
        borderColor: C.ink,
        borderRadius: 10,
        backgroundColor: pressed ? "rgba(179,64,31,0.1)" : C.paper2,
        paddingVertical: 12,
        transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : [],
        boxShadow: "3px 3px 0 0 #B3401F",
      })}
    >
      <Trash2 size={15} color={C.danger} />
      <Text style={{ fontFamily: F.monoBold, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: C.danger }}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterChip({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: active ? C.ink : "rgba(28,43,33,0.3)",
        backgroundColor: active ? C.ink : pressed ? C.paper : C.paper2,
        paddingHorizontal: 13,
        paddingVertical: 7,
        transform: pressed ? [{ translateX: 1 }, { translateY: 1 }] : [],
      })}
    >
      <Text
        style={{
          fontFamily: F.monoBold,
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: active ? C.paper : C.inkSoft,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
