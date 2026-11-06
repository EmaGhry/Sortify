import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Check, Info, TriangleAlert } from "lucide-react-native";
import { C, F, hardShadowSm } from "@/theme";

interface ToastInput {
  title: string;
  description?: string;
  variant?: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: <Check size={18} color={C.leaf} strokeWidth={2.6} />,
  error: <TriangleAlert size={18} color={C.danger} strokeWidth={2.4} />,
  info: <Info size={18} color={C.ink} strokeWidth={2.4} />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastInput | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: ToastInput) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(t);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
        setToast(null),
      );
    }, 3600);
  }, [opacity]);

  return (
    <ToastContext.Provider value={{ toast: showToast }}>
      <View style={{ flex: 1 }}>
        {children}
        {toast ? (
          <Animated.View
            style={[
              styles.toast,
              { opacity },
            ]}
            pointerEvents="none"
          >
            {ICONS[toast.variant ?? "info"]}
            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>{toast.title}</Text>
              {toast.description ? <Text style={styles.toastDesc}>{toast.description}</Text> : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.paper2,
    borderWidth: 1.5,
    borderColor: C.ink,
    borderRadius: 10,
    boxShadow: hardShadowSm,
    padding: 12,
    zIndex: 100,
  },
  toastTitle: { fontFamily: F.sansBold, fontSize: 13, color: C.ink },
  toastDesc: { fontFamily: F.mono, fontSize: 11, color: C.inkSoft, marginTop: 2 },
});
