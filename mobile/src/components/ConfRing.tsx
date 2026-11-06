import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C } from "@/theme";

/** Progress ring (confidence / level) — SVG mirror of the web Ring. */
export function ConfRing({
  progress,
  size = 64,
  stroke = 7,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }], position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(28,43,33,0.12)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={C.leaf}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
        />
      </Svg>
      <View style={{ position: "absolute", width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        {children}
      </View>
    </View>
  );
}
