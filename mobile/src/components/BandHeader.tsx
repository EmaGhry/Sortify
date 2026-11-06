import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Check, Leaf } from "lucide-react-native";
import { C, F } from "@/theme";
import { useI18n } from "@/lib/i18n";
import { LOCALES } from "@shared/types";
import { Ticker } from "./Ticker";

/**
 * Full-bleed ink band header — the poster moment every screen opens with:
 * ticker strip, logo + working language picker, numbered kicker and giant
 * Fraunces title in paper on ink. Status slot sits at the right.
 */
export function BandHeader({
  number,
  title,
  status,
}: {
  number: string;
  title: string;
  status?: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <View style={{ marginHorizontal: -16, marginTop: -14 }}>
      <Ticker />
      <View style={{ backgroundColor: C.ink, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(244,241,233,0.18)",
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: C.leaf,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Leaf size={17} color={C.paper} strokeWidth={2.2} />
            </View>
            <Text style={{ fontFamily: F.sansBlack, fontSize: 17, color: C.paper, letterSpacing: -0.4 }}>
              SORT<Text style={{ color: "#86EFAC" }}>IFY</Text>
            </Text>
          </View>
          <LanguageChip />
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.monoBold, fontSize: 11, letterSpacing: 2.4, color: "#86EFAC", textTransform: "uppercase" }}>
              {number}
            </Text>
            <Text
              style={{
                fontFamily: F.display,
                fontSize: 44,
                lineHeight: 41,
                color: C.paper,
                marginTop: 8,
              }}
            >
              {title}
            </Text>
          </View>
          {status}
        </View>
      </View>
    </View>
  );
}

function LanguageChip() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const native = LOCALES.find((l) => l.code === lang)?.native ?? lang;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="Language / Limbă"
        hitSlop={8}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          borderWidth: 1,
          borderColor: pressed ? C.paper : "rgba(244,241,233,0.4)",
          borderRadius: 6,
          paddingHorizontal: 9,
          paddingVertical: 5,
          backgroundColor: pressed ? "rgba(244,241,233,0.12)" : "transparent",
        })}
      >
        <Text
          style={{
            fontFamily: F.monoBold,
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: C.paper,
          }}
        >
          {native}
        </Text>
        <Text style={{ color: C.paper, fontSize: 9 }}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(28,43,33,0.55)", justifyContent: "center", padding: 24 }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: C.paper2,
              borderWidth: 1.5,
              borderColor: C.ink,
              borderRadius: 12,
              maxHeight: 430,
              overflow: "hidden",
            }}
          >
            <ScrollView>
              {LOCALES.map((l, i) => (
                <Pressable
                  key={l.code}
                  onPress={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 18,
                    paddingVertical: 14,
                    backgroundColor: pressed ? C.paper : C.paper2,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: C.inkFaint,
                  })}
                >
                  <Text style={{ fontFamily: F.sansBold, fontSize: 15, color: C.ink }}>{l.native}</Text>
                  {lang === l.code ? <Check size={18} color={C.leaf} strokeWidth={2.6} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
