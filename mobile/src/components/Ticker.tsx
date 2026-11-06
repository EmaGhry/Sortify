import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { C, F } from "@/theme";

/** Kinetic marquee — recycling facts scrolling forever (ink on leaf). */
export function Ticker() {
  const { t } = useI18n();
  const items = t("ticker.items");
  const [halfWidth, setHalfWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (halfWidth <= 0) return;
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue: -halfWidth,
        duration: Math.max(8000, halfWidth * 14),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [halfWidth, x]);

  return (
    <View style={{ backgroundColor: C.leaf, overflow: "hidden", paddingVertical: 5 }}>
      <Animated.View
        style={{ flexDirection: "row", transform: [{ translateX: x }] }}
        onLayout={(e) => setHalfWidth(e.nativeEvent.layout.width / 2)}
      >
        {[0, 1].map((copy) => (
          <Text
            key={copy}
            style={{
              fontFamily: F.monoBold,
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: C.paper,
              paddingRight: 24,
            }}
          >
            {items}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}
