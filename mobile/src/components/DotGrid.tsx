import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";
import { C } from "@/theme";

/** Paper dot-grid texture as an absolute-fill background layer. */
export function DotGrid({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <Svg style={StyleSheetAbsolute} opacity={opacity}>
      <Defs>
        <Pattern id="dotgrid" width="22" height="22" patternUnits="userSpaceOnUse">
          <Circle cx="1.2" cy="1.2" r="1.1" fill="rgba(28,43,33,0.09)" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dotgrid)" />
    </Svg>
  );
}

const StyleSheetAbsolute = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
