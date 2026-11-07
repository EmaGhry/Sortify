import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Check, Leaf, Search, X } from "lucide-react-native";
import { MATERIAL_PROFILES, type MaterialProfile } from "@shared/materials";
import { STATION_MATERIALS, type Material } from "@shared/types";
import { formatGrams } from "@shared/utils";
import { useI18n } from "@/lib/i18n";
import { C, F, cardPrint } from "@/theme";
import { BandHeader } from "@/components/BandHeader";
import { MaterialIcon } from "@/components/MaterialIcon";

const ALL: readonly Material[] = STATION_MATERIALS;

export default function GuideScreen() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const profiles = ALL.map((m) => MATERIAL_PROFILES[m]);
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.label[lang].toLowerCase().includes(q) ||
        p.description[lang].toLowerCase().includes(q) ||
        p.dos[lang].join(" ").toLowerCase().includes(q),
    );
  }, [query, lang]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={{ paddingBottom: 32 }}>
      <BandHeader number="04" title={t("guide.title")} />

      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            borderWidth: 1.5,
            borderColor: C.ink,
            borderRadius: 10,
            backgroundColor: C.paper2,
            paddingHorizontal: 14,
            paddingVertical: 12,
            boxShadow: "3px 3px 0 0 #1C2B21",
          }}
        >
          <Search size={16} color={C.inkSoft} strokeWidth={2.2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("guide.search")}
            placeholderTextColor={C.inkSoft}
            style={{ flex: 1, fontFamily: F.mono, fontSize: 13, color: C.ink, padding: 0 }}
            autoCorrect={false}
          />
        </View>

        {filtered.length === 0 ? (
          <View style={[cardPrint, { alignItems: "center", padding: 40, gap: 10 }]}>
            <Leaf size={26} color={C.leaf} />
            <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft }}>{t("impact.noData")}</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {filtered.map((profile) => (
              <GuideCard key={profile.id} profile={profile} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function GuideCard({ profile }: { profile: MaterialProfile }) {
  const { t, lang } = useI18n();
  const binColor = profile.bin.color;

  return (
    <View style={[cardPrint, { overflow: "hidden" }, { boxShadow: "4px 4px 0 0 #1C2B21" }]}>
      {/* Bin-colour header band (like the result card) */}
      <View style={{ backgroundColor: binColor, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
        <MaterialIcon material={profile.id} size="md" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.displayBold, fontSize: 17, color: C.ink }}>{profile.label[lang]}</Text>
          <Text
            style={{
              fontFamily: F.monoBold,
              fontSize: 9,
              letterSpacing: 1,
              color: C.ink,
              textTransform: "uppercase",
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {profile.bin.label[lang]}
          </Text>
        </View>
        <Text style={{ fontFamily: F.monoBold, fontSize: 10, color: C.ink, opacity: 0.75 }}>
          {formatGrams(profile.co2PerItemG, lang)}
        </Text>
      </View>

      <View style={{ padding: 15, gap: 12, backgroundColor: C.paper2 }}>
        <Text style={{ fontFamily: F.sans, fontSize: 12, lineHeight: 17, color: C.inkSoft }}>
          {profile.description[lang]}
        </Text>

        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={stylesColGood}>{t("guide.whatGoes")}</Text>
            {profile.dos[lang].map((item, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                <Check size={12} color={C.leaf} strokeWidth={2.4} style={{ marginTop: 1 }} />
                <Text style={{ fontFamily: F.sans, fontSize: 11, lineHeight: 15, color: C.ink, flex: 1 }}>{item}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={stylesColBad}>{t("guide.whatDoesnt")}</Text>
            {profile.donts[lang].map((item, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                <X size={12} color={C.danger} strokeWidth={2.4} style={{ marginTop: 1 }} />
                <Text style={{ fontFamily: F.sans, fontSize: 11, lineHeight: 15, color: C.ink, flex: 1 }}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const stylesColGood = {
  fontFamily: F.monoBold,
  fontSize: 9,
  letterSpacing: 1.8,
  color: C.leaf,
  textTransform: "uppercase" as const,
  marginBottom: 8,
};

const stylesColBad = {
  fontFamily: F.monoBold,
  fontSize: 9,
  letterSpacing: 1.8,
  color: C.danger,
  textTransform: "uppercase" as const,
  marginBottom: 8,
};
