# 📱 Sortify Mobile

**React Native (Expo) app** — same AI recycling assistant, native camera, same eco-print design.
Shares ~90% of its brain with the web app: the recycling knowledge base, all 7 language
dictionaries, gamification rules, CO₂ factors and the offline demo engine are **imported
directly from the repo root** (`../lib`, `../locales`) — one source of truth, zero duplication.

## Run it (Expo Go — no native build needed)

```bash
# 1. from the repo root, start the API backend
npm run dev            # Next.js API on :3000

# 2. in another terminal
cd mobile
npm install
npx expo start         # scan the QR with Expo Go (phone & laptop on the same wifi)
```

The app **auto-discovers the API** in Expo Go: it derives the laptop's LAN IP from the
Expo host URI and calls `http://<laptop-ip>:3000`. To point it elsewhere:

```bash
cp .env.example .env   # then set EXPO_PUBLIC_API_URL=https://your-sortify.vercel.app
```

> **Offline-proof demo:** "Try an example" runs the demo engine *inside the app*
> (`@shared/ai/demo`) — no network needed. Live scans hit `/api/analyze` on the server,
> so the AI key never touches the phone.

## Instalare reală pe telefon (APK, fără Expo Go)

Fișierele `.apk` sunt build artifact-uri native (ignorate de git pentru a păstra repo-ul ușor). Poți genera un APK gata de instalat rapid:

### Varianta A — build local (ai Java + Android SDK)

```bash
npm run build:apk:local
# → android/app/build/outputs/apk/release/app-release.apk
```

Trimite `app-release.apk` pe telefon (email/Drive/USB) și instalează-l
(permite „instalare din surse necunoscute" la prima instalare).

**Important:** înainte de build, URL-ul API-ului este copt în APK din `.env.local`:

```
EXPO_PUBLIC_API_URL=http://<IP-LAN-al-laptopului>:3000
```

Setează-l pe IP-ul LAN al laptopului tău (`ipconfig` → adaptorul Wi-Fi). Telefonul trebuie să fie pe **același wifi**
cu laptopul când demonezi, iar serverul pornit (`npm run dev` din rădăcină).
Prima dată, Windows Firewall poate cere permisiune pentru Node — acceptă.

> `usesCleartextTraffic` e activat (necesar pentru HTTP către LAN pe Android 9+).
> Pentru producție: backend pe Vercel (HTTPS) și scoate flag-ul.

### Varianta B — EAS Build (cloud, cont Expo gratuit)

```bash
npm i -g eas-cli
npx eas login          # cont gratuit pe expo.dev
npm run build:apk:eas  # build în cloud -> link de download pentru APK
```

Setează `EXPO_PUBLIC_API_URL` în `eas.json` (ex: URL-ul Vercel).

### iOS?

Fără Mac, un APK Android e calea realistă. iOS cere cont Apple Developer ($99/an)
pentru TestFlight — sau folosește Expo Go pe iPhone pentru demo.

## Architecture

```
mobile/src
├── app/            # expo-router: 4 tabs (Scan / History / Impact / Guide)
├── components/     # eco-print UI: TopBar, ConfRing, MaterialIcon, PressButton, Stamps
├── lib/
│   ├── api.ts      # typed API client (key stays server-side) + offline-aware errors
│   ├── app-state.tsx  # AsyncStorage-backed scan history + badge evaluation
│   ├── i18n.tsx    # reuses locales/dict.*.json — device-locale auto-detect
│   ├── storage.ts  # AsyncStorage mirror of the web localStorage schema (sortify:v1)
│   ├── image.ts    # expo-image-manipulator downscale/thumbnails
│   └── toast.tsx   # ink-bordered toast overlays
└── theme.ts        # eco-print tokens: paper/ink/leaf, Fraunces/Archivo/JetBrains Mono,
                     # hard offset shadows, print borders
```

Shared modules (imported from the repo root — do not duplicate):
`@shared/* → ../lib/*` · `@locales/* → ../locales/*` (see `tsconfig.json` paths + `metro.config.js`).

## Scripts

```bash
npx expo start        # dev server + Expo Go QR
npx tsc --noEmit      # type check (includes ../lib shared modules)
npx expo export       # production JS bundle proof
```
