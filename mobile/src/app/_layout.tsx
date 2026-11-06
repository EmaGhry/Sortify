import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SplashScreen, Tabs } from "expo-router";
import {
  useFonts as useFraunces,
  Fraunces_700Bold,
  Fraunces_900Black,
} from "@expo-google-fonts/fraunces";
import {
  useFonts as useArchivo,
  Archivo_500Medium,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from "@expo-google-fonts/archivo";
import {
  useFonts as useJetBrains,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { BookOpen, History, Leaf, ScanLine } from "lucide-react-native";
import { C, F } from "@/theme";
import { LanguageProvider, useI18n } from "@/lib/i18n";
import { AppStateProvider } from "@/lib/app-state";
import { ToastProvider } from "@/lib/toast";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [frauncesLoaded] = useFraunces({ Fraunces_700Bold, Fraunces_900Black });
  const [archivoLoaded] = useArchivo({ Archivo_500Medium, Archivo_700Bold, Archivo_800ExtraBold });
  const [jetbrainsLoaded] = useJetBrains({ JetBrainsMono_500Medium, JetBrainsMono_700Bold });

  useEffect(() => {
    if (frauncesLoaded && archivoLoaded && jetbrainsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [frauncesLoaded, archivoLoaded, jetbrainsLoaded]);

  if (!frauncesLoaded || !archivoLoaded || !jetbrainsLoaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <AppStateProvider>
        <ToastProvider>
          <RootTabs />
          <StatusBar style="dark" />
        </ToastProvider>
      </AppStateProvider>
    </LanguageProvider>
  );
}

function RootTabs() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.paper },
        tabBarActiveTintColor: C.leaf,
        tabBarInactiveTintColor: C.inkSoft,
        tabBarStyle: {
          backgroundColor: C.paper2,
          borderTopWidth: 1.5,
          borderTopColor: C.ink,
        },
        tabBarLabelStyle: {
          fontFamily: F.monoBold,
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.scan"),
          tabBarIcon: ({ color, focused }) => (
            <ScanLine size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("nav.history"),
          tabBarIcon: ({ color, focused }) => (
            <History size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="impact"
        options={{
          title: t("nav.impact"),
          tabBarIcon: ({ color, focused }) => (
            <Leaf size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: t("nav.guide"),
          tabBarIcon: ({ color, focused }) => (
            <BookOpen size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
