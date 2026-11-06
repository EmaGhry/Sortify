import { Text, View } from "react-native";
import { C, F, hardShadow, hardShadowSm } from "@/theme";

/** Spec-sheet stat cell (paper box, mono value, uppercase label). */
export function SpecCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.paper2,
        borderWidth: 1.5,
        borderColor: C.ink,
        padding: 14,
        gap: 4,
      }}
    >
      <Text
        style={{
          fontFamily: F.monoBold,
          fontSize: 20,
          color: highlight ? C.leaf : C.ink,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: F.monoBold,
          fontSize: 8,
          letterSpacing: 1.6,
          color: C.inkSoft,
          textTransform: "uppercase",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export function SpecStrip({
  cells,
}: {
  cells: Array<{ label: string; value: string; highlight?: boolean }>;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 1.5 }}>
      {cells.map((c, i) => (
        <View key={i} style={{ flex: 1, borderWidth: 1.5, borderColor: C.ink }}>
          <SpecCell {...c} />
        </View>
      ))}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger";

/** Press-physics button: translates into its hard shadow when pressed. */
export function PressButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  icon,
  small,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: React.ReactNode;
  small?: boolean;
}) {
  const bg = variant === "primary" ? C.leaf : variant === "danger" ? C.paper2 : C.paper2;
  const fg = variant === "primary" ? C.paper : variant === "danger" ? C.danger : C.ink;

  return (
    <PressableLike
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }: { pressed: boolean }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: bg,
        borderWidth: 1.5,
        borderColor: C.ink,
        borderRadius: 10,
        paddingHorizontal: small ? 16 : 24,
        paddingVertical: small ? 10 : 14,
        opacity: disabled ? 0.5 : 1,
        boxShadow: pressed ? undefined : small ? hardShadowSm : hardShadow,
        transform: pressed ? [{ translateX: 3 }, { translateY: 3 }] : [],
      })}
    >
      {icon}
      <Text
        style={{
          fontFamily: F.monoBold,
          fontSize: small ? 11 : 13,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: fg,
        }}
      >
        {label}
      </Text>
    </PressableLike>
  );
}

// Small indirection so PressButton can use the function-style style prop.
import { Pressable } from "react-native";
function PressableLike({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  style: (props: { pressed: boolean }) => object;
  children: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => style({ pressed })}>
      {children}
    </Pressable>
  );
}

/** Rotated stamp chip (material / demo badge). */
export function Stamp({
  text,
  color,
  rotate = -1,
  solid,
}: {
  text: string;
  color?: string;
  rotate?: number;
  solid?: boolean;
}) {
  return (
    <View
      style={{
        transform: [{ rotate: `${rotate}deg` }],
        borderWidth: 1.5,
        borderColor: C.ink,
        borderRadius: 6,
        backgroundColor: solid ? C.ink : color ? `${color}55` : C.paper,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontFamily: F.monoBold,
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: solid ? C.paper : C.ink,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
