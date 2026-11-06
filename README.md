<div align="center">

# 🌱 Sortify

**AI-powered recycling assistant** — *Scan it. Sort it. Save the planet.*

Recunoașterea obiectelor reciclabile prin cameră, cu recomandări de sortare adaptate pentru România / UE.

**Built by ByteForce**

</div>

---

## 💡 Ce face Sortify

**Sortify** este o aplicație inteligentă bazată pe inteligență artificială, care permite recunoașterea și identificarea obiectelor reciclabile prin intermediul camerei foto. Utilizatorul fotografiază un obiect, iar sistemul analizează imaginea și identifică tipul de material din care este realizat (plastic, hârtie, sticlă, metal etc.), oferind recomandări privind modul corect de reciclare.

Scopul proiectului este de a facilita colectarea selectivă, de a reduce poluarea și de a încuraja comportamente responsabile față de mediu, folosind tehnologia AI.

### ♻️ Bucla de date — de la cetățean la AI industrial

Aplicația pentru cetățeni nu e doar un produs standalone — e **motorul de date** al platformei. Fiecare fotografie scanată (anonimizată) devine material de antrenament și evaluare pentru **AI-ul de sortare industrială** folosit de companiile de salubritate (Sortify Operator). Cu alte cuvinte: cu cât mai multă people scanează pentru XP și badge-uri, cu atât clasificatorul de pe benzile de sortare devine mai precis. **Cetățenii se distrează → AI-ul învață → companiile sortează mai bine.**

### Funcționalități principale

| Funcționalitate | Detalii |
|---|---|
| 📷 **Scanare AI** | Cameră live sau upload de fotografie → material identificat în câteva secunde, cu scor de încredere |
| 🗑️ **Ghid de sortare** | Colectorul corect (culori UE/RO), pași de sortare, ce merge / ce nu merge |
| 📊 **Impact personal** | CO2 evitat (cu echivalente: km mașină, încărcări telefon, zile de copac), distribuție pe materiale |
| 🏅 **Gamificare** | XP, niveluri (Boboc verde → Campion circular), 13 insigne, serii zilnice (streak) |
| 🕓 **Istoric** | Toate scanările salvate local, cu miniaturi, filtre pe materiale și statistici |
| 🌍 **7 limbi + auto-detect** | Română, English, Deutsch, **Magyar**, Français, Italiano, Español — limba se detectează automat din browser la prima vizită; AI-ul răspunde în limba selectată. Instrucțiunile rămân ancoreate în sistemul de colectare din România — turistul german primește colectorul *românesc* corect, explicat *în germană* |
| 📱 **PWA-ready** | Manifest + icon, instalabil pe telefon, responsive până la 320px |

## 🏗️ Arhitectură

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js 16 (App Router)                  │
│                                                              │
│  UI (React 19 + TS + Tailwind v4)      API Routes (Node)     │
│  ├── Scanare (camera + upload)   ───►  /api/analyze          │
│  │      ├─ CameraCapture                  │  validare zod    │
│  │      ├─ ScanResultCard                 ▼                  │
│  │      └─ RecentScans             AI Layer (Local-first)    │
│  ├── Istoric (localStorage)              ├─ Model Local ───► │
│  ├── Impact (XP, badges, streak)         ├─ Fallback API     │
│  └── Ghid (knowledge base)               └─ Demo Mode        │
│                                               │ JSON strict  │
│                                               ▼              │
│                               Knowledge Base (lib/materials) │
│                               colectoare, CO2, instrucțiuni  │
└──────────────────────────────────────────────────────────────┘
```

**Decizii cheie de arhitectură:**

- **Model Local (Local-First)** — clasificarea rulează local (model vision dedicat), fără dependență obligatorie de API-uri cloud terțe sau costuri per cerere.
- **Prompt & schemă strictă cu validare Zod** — modelul clasifică strict în categoriile de colectare selectivă; niciun răspuns invalid nu ajunge în UI.
- **Enrichment server-side** — colectorul, regulile de sortare și estimările CO2 vin din *knowledge base-ul propriu al aplicației* (nu din model), pentru consistență garantată conform standardelor din România / UE.
- **Fallback în lanț** — Model Local → Cloud API (Gemini / OpenAI opțional) → **Demo Mode** offline fără internet, ideal pentru demo-uri de hackathon.
- **Persistență locală (localStorage)** — zero infrastructură de backend greoaie; istoricul, XP-ul și insignele funcționează offline, cu miniaturi comprimate.

## 🚀 Ghid de Pornire Pas cu Pas

### 1. 💻 Pornirea aplicației Web & Backend (Next.js)

Backend-ul Next.js servește atât interfața web în browser, cât și endpoint-ul de clasificare AI (`/api/analyze`) utilizat de aplicația mobilă.

#### Pasul 1: Instalare dependențe
În directorul principal al proiectului:
```bash
npm install
```

#### Pasul 2: Configurare (Opțional)
Aplicația funcționează direct cu **model local** și modul **Demo**:
```bash
cp .env.example .env.local
```
- **Model Local / Demo Mode**: Rulează direct fără nicio cheie de API extern! Butonul *„Încearcă un exemplu”* oferă scanări instantanee complete.
- **Cloud API Fallback (Opțional)**: Dacă dorești fallback suplimentar pe cloud, poți seta în `.env.local`:
  ```env
  GOOGLE_AI_API_KEY=cheia_ta_aici   # de la https://aistudio.google.com/apikey (gratuit)
  # sau OPENAI_API_KEY=cheia_ta_aici
  ```

#### Pasul 3: Rularea aplicației
```bash
npm run dev
```
Aplicația web este accesibilă în browser la: **`http://localhost:3000`**.

---

### 2. 📱 Aplicația Mobilă (Expo / React Native)

Aplicația mobilă se află în folderul `mobile/` și oferă o experiență nativă completă (cameră nativă, haptic feedback, mod offline).

#### Rulare rapidă pe telefon (cu Expo Go — fără compilare APK)
Cea mai rapidă cale de a testa pe un telefon fizic:

1. Instalează gratuit aplicația **Expo Go** pe telefon (din [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) sau [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)).
2. În terminal, mergi în folderul `mobile`:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
3. Conectează **telefonul și laptopul la aceeași rețea Wi-Fi**.
4. Scanează codul QR din terminal cu aplicația Expo Go (Android) sau cu camera foto (iOS).
> **Auto-Discovery:** În modul Expo Go, aplicația detectează automat IP-ul laptopului din rețeaua locală și se conectează la `http://<ip-laptop>:3000`.

---

### 3. 📦 Ghid APK Android (Generare și Instalare)

Fișierele APK sunt build artifact-uri native (ignorate de git pentru a păstra repo-ul curat). Poți genera un APK gata de instalat în câteva minute.

#### Cum generezi APK-ul:

##### Opțiunea A: Compilare Cloud prin Expo EAS (Recomandat — fără Android Studio / Java)
Nu ai nevoie de Android Studio, SDK-uri sau Java instalat pe calculator:
```bash
# 1. Instalează global EAS CLI (dacă nu îl ai)
npm install -g eas-cli

# 2. Conectează-te cu un cont gratuit Expo (creează pe https://expo.dev)
npx eas login

# 3. Pornește compilarea în cloud a APK-ului
cd mobile
npm run build:apk:eas
```
Expo EAS va compila aplicația în cloud și îți va afișa în terminal un link direct pentru descărcarea fișierului `.apk`.

##### Opțiunea B: Compilare Locală (Dacă ai Android SDK și Java JDK)
Dacă ai configurat Android Studio / SDK pe PC:
1. În `mobile/.env.local`, setează IP-ul LAN al laptopului tău (`ipconfig` pe Windows):
   ```env
   EXPO_PUBLIC_API_URL=http://<IP-UL-TAU-LOCAL>:3000
   ```
2. Compilează APK-ul:
   ```bash
   cd mobile
   npm run build:apk:local
   ```
   Fișierul APK generat se va afla în:
   `mobile/android/app/build/outputs/apk/release/app-release.apk`

#### Cum instalezi APK-ul pe telefon:
1. **Transferă fișierul `.apk` pe telefon** (prin cablu USB, Google Drive, WhatsApp ca Document sau Email).
2. Deschide fișierul din managerul de fișiere al telefonului.
3. Dacă Android solicită permisiune, apasă pe **Setări** și activează **Permite instalarea din această sursă** (Install unknown apps).
4. Apasă pe **Instalare**. La prima deschidere, acordă permisiunea pentru **Cameră foto**.
5. Modul demo funcționează 100% offline direct pe telefon, iar scanările live comunică cu backend-ul din rețeaua locală.

---

### 4. 🔍 Depanare & Probleme Frecvente (Troubleshooting)

- **Eroare „Network request failed” în APK:**
  - Asigură-te că telefonul și laptopul sunt pe **același Wi-Fi**.
  - Verifică **Windows Defender Firewall**: permite conexiunile de intrare pentru Node.js sau portul `3000`.
  - Verifică în browserul telefonului link-ul `http://<IP-laptop>:3000/api/status`.
- **Permisiuni cameră:**
  - Dacă camera nu pornește, verifică în *Setări telefon → Aplicații → Sortify → Permisiuni* ca accesul la Cameră să fie permis.
- **Expo Go nu se conectează:**
  - Rulează `npx expo start -c` (clear cache) sau folosește tunelul: `npx expo start --tunnel`.

## 🧱 Stack

| Layer | Tehnologie |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Stil | Tailwind CSS v4, design system „eco-print" (paper + ink + leaf green) |
| Tipografie | Fraunces (display) · Archivo (text) · JetBrains Mono (etichete/numere) |
| Localizare | 7 locale (RO/EN/DE/HU/FR/IT/ES) în `locales/dict.*.json` + **pipeline de traducere AI** (`npm run i18n:translate`) + auto-detect browser |
| AI | Model Local de clasificare (Vision) · Fallback opțional Cloud (Gemini / OpenAI) · Demo offline |
| Validare | Zod (răspunsuri AI + body API) |
| Stare | localStorage versionat (`sortify:v1`) |
| Iconițe | lucide-react |
| PWA | `app/manifest.ts` + SVG icon |

## 📁 Structura proiectului

```
app/
  api/analyze/route.ts    # clasificare AI + enrichment
  api/demo/route.ts       # rezultate demo (offline)
  api/status/route.ts     # ce provider e activ
  page.tsx                # Scanare (fluxul principal)
  history/ impact/ guide/
components/
  scan/                   # cameră, preview, card rezultat, recente
  impact/ history/ guide/
lib/
  ai/                     # prompt, gemini, openai, demo, orchestrare
  materials.ts            # knowledge base: colectoare RO/UE, CO2, do/don't
  gamification.ts         # XP, niveluri, 13 insigne
  storage.ts              # persistență locală + statistici
  i18n.tsx                # RO/EN
```

## 🎯 Demo Mode vs. Clasificare AI

| | Demo Mode | Clasificare AI |
|---|---|---|
| Recunoaștere | exemple pre-definite (marcate „EXEMPLU”) | orice obiect reciclat, analizat în timp real |
| Mod funcționare | offline, instantaneu | Model Local (vision) / Fallback Cloud opțional |
| Dependență API | nu e nevoie | nu este obligatoriu (prioritar local-first) |
| Restul aplicației | ✅ identic (istoric, XP, impact) | ✅ identic |

## 🌱 Estimările de CO2

Valorile (per obiect tipic) sunt estimări conservatoare, cu factori publici (ex: ~1.9 kg CO2/kg PET reciclat, ~9 kg CO2/kg aluminiu), folosite doar pentru copy prietenos — nu reprezintă un audit LCA.

## 🌍 Pipeline de traducere (i18n)

Tot conținutul localizat (UI, knowledge base, badge-uri, nivele, demo) trăiește în `locales/dict.{lang}.json`. `dict.en.json` + `dict.ro.json` sunt sursele de adevăr; celelalte 5 limbi se generează cu AI, la build time:

```bash
# adaugă/modifică o cheie în dict.en.json (și dict.ro.json), apoi:
npm run i18n:translate            # tradu ce lipsește în DE/HU/FR/IT/ES via Gemini
npm run i18n:translate -- --all   # regenerează complet (rescrie tot)
npm run i18n:translate -- --lang=de --dry   # preview fără scriere
npm run i18n:validate             # verifică chei lipsă/extrase/goale (rulează fără cheie — CI-safe)
```

Cum funcționează: scriptul trimite batch-uri de 40 chei (EN + context RO) către Gemini cu un prompt de traducere din domeniul reciclării (termeni-păstrat: Sortify, PET, XP, CO2; simboluri ◆ → —; sistemul de colectare **românesc** rămâne ancora în orice limbă), validează răspunsul (toate cheile prezente, non-empty, un retry pentru ratate), apoi scrie fișierele. Tu faci review la diff și commit — la runtime traducerile sunt statice: instant, gratis, și merg offline dacă cade wifi-ul la demo. `npm run i18n:validate` garantează la compile/CI că nicio limbă nu rămâne pe jumătate tradusă.

---

<div align="center">

**ByteForce** — *Scan it. Sort it. Save the planet.* 🌍

</div>
