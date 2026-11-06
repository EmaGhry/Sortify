/**
 * Eco-print design system, translated from the web (globals.css) to RN.
 * Paper background, ink borders, hard offset shadows, mono labels.
 */

export const C = {
  paper: "#F4F1E9",
  paper2: "#FCFAF4",
  ink: "#1C2B21",
  inkSoft: "#5C6B60",
  inkFaint: "rgba(28, 43, 33, 0.16)",
  leaf: "#1E7A46",
  leafDeep: "#14532D",
  danger: "#B3401F",
  warning: "#9A6A1B",
} as const;

/** Font family tokens — wired in app/_layout.tsx after useFonts(). */
export const F = {
  display: "Fraunces_900Black",
  displayBold: "Fraunces_700Bold",
  sans: "Archivo_500Medium",
  sansBold: "Archivo_700Bold",
  sansBlack: "Archivo_800ExtraBold",
  mono: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

/** Hard offset shadow (paper-print aesthetic) — RN 0.76+ cross-platform boxShadow. */
export const hardShadow = "5px 5px 0 0 #1C2B21";
export const hardShadowSm = "3px 3px 0 0 #1C2B21";

export const cardPrint = {
  backgroundColor: C.paper2,
  borderColor: C.ink,
  borderWidth: 1.5,
  borderRadius: 12,
} as const;

export const S = {
  /** numbered kicker, e.g. "01 / AI VISION" */
  kicker: {
    fontFamily: F.monoBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: C.leaf,
    textTransform: "uppercase",
  } as const,
  h1: {
    fontFamily: F.display,
    fontSize: 34,
    lineHeight: 34,
    color: C.ink,
  } as const,
  body: {
    fontFamily: F.sans,
    fontSize: 14,
    lineHeight: 20,
    color: C.inkSoft,
  } as const,
  label: {
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2,
    color: C.inkSoft,
    textTransform: "uppercase",
  } as const,
  sectionBorder: {
    borderColor: C.ink,
    borderWidth: 1.5,
  } as const,
} as const;
