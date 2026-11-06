const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

// Sortify needs exactly: INTERNET, CAMERA, ACCESS_NETWORK_STATE (+ the
// autolinking signature permission). The Expo base template and some
// libraries inject more (RECORD_AUDIO via expo-camera, storage perms via
// expo-file-system/image-picker, SYSTEM_ALERT_WINDOW via the template).
//
// Two-layer defence:
//  1. filter the app manifest entries
//  2. add tools:node="remove" markers so the AGP manifest merger strips
//     the same permissions that LIBRARY manifests re-inject at build time.
const KEEP = new Set([
  "android.permission.INTERNET",
  "android.permission.CAMERA",
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.POST_NOTIFICATIONS",
]);

const REMOVE = [
  "android.permission.RECORD_AUDIO",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.VIBRATE",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
];

module.exports = function withPermissionsCleanup(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const usesPermission = manifest.manifest["uses-permission"] ?? [];

    // 1) filter what's already declared
    const filtered = usesPermission.filter((perm) => {
      const name = perm.$?.["android:name"];
      if (!name) return false;
      if (REMOVE.includes(name)) return false;
      if (name.startsWith("com.broscoi.sortify.")) return true; // signature perms
      return KEEP.has(name);
    });

    // 2) merger-level removal markers (tools:node="remove")
    const removals = REMOVE.map((name) => ({
      $: {
        "android:name": name,
        "tools:node": "remove",
      },
    }));

    manifest.manifest["uses-permission"] = [...filtered, ...removals];
    return mod;
  });
};
