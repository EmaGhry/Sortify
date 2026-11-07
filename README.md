# Sortify · ByteForce

Sortify este un prototip de stație pentru cantine și zone de pauză. Camera scanează un obiect, modelul echipei identifică materialul, iar ESP32 primește categoria prin Wi‑Fi. Placa aprinde LED-ul corespunzător și servo-ul indică destinația pe unul dintre cele cinci cartonașe. Pentru **Altele**, se aprinde LED-ul alb, iar servo-ul indică poziția dedicată.

Pentru prezentare, porniți de la montajul cu care ați verificat deja traseul **cameră → model → ESP32**. Carcasa, jgheabul și cele cinci compartimente sunt prezentate separat ca **[proiect pentru aparatul final](docs/SORTIFY-STATION-PLAN.md)**.

| Interfață | Rol |
| --- | --- |
| `/kiosk` | Stația pe același PC. Cameră în browser, scanare manuală sau automată, rezultat AI și confirmare ESP32. |
| `/operator` | Ultimele 50 de scanări și totaluri din istoricul local. |
| `/` | Prezentarea stației, a prototipului și a conceptului de aparat. |
| `/scan` | Scannerul web cu exemple demo și analiză prin modelul echipei. Scanarea de aici nu comandă placa. |
| [Expo Android](mobile/README.md) | Clientul mobil existent pentru scannerul public. |

## Pornire locală pe Windows

Comenzile au fost verificate cu Node.js 24 și Python 3.14. Rulați-le în PowerShell, din rădăcina proiectului:

```powershell
$env:TEMP = Join-Path $PWD '.cache\tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
npm ci --cache .cache/npm
python -m venv .venv
```

**Terminalul 1 · Site-ul**

```powershell
$env:SORTIFY_BENCH = '1'
npm run dev -- --hostname 127.0.0.1
```

Pentru demo fără internet, rulați `npm run build` cât încă aveți internet. În sala de prezentare, folosiți `npm start -- --hostname 127.0.0.1` în același terminal, cu `SORTIFY_BENCH=1`.

**Terminalul 2 · Serviciul stației**

| Mod | Comandă |
| --- | --- |
| Interfață cu rezultate predefinite | `.\.venv\Scripts\python.exe -m station --simulate` |
| Modelul colegului prin LAN, fără ESP32 | `.\.venv\Scripts\python.exe -m station --preview --model-url http://192.168.4.2:8000/predict` |
| Modelul colegului prin LAN și ESP32 | `.\.venv\Scripts\python.exe -m station --esp --model-url http://192.168.4.2:8000/predict` |

Rulați o singură comandă din tabel. Pentru modul cu ESP32, conectați laptopul la rețeaua creată de placa echipei (**SortBot** în sketch-ul Emei). Înlocuiți adresa modelului din exemplu cu URL-ul primit de la coleg. Dacă placa folosește altă adresă decât `http://192.168.4.1`, treceți adresa ei după `--esp`. La schimbarea modului, opriți comanda anterioară cu **Ctrl+C**. Serviciul folosește portul local `8765`.

Deschideți [kiosk-ul](http://127.0.0.1:3000/kiosk) pe PC-ul care rulează site-ul și serviciul stației. Reîncărcați pagina după schimbarea modului. În modurile cu cameră, permiteți accesul când îl cere browserul.

Pentru scannerul public vizitați `/scan`. Analiza reală folosește serviciul local al stației și același endpoint al echipei. Exemplele demo sunt disponibile fără model.

## Modelul colegului prin rețea

Pentru două laptopuri, conectați-le la rețeaua ESP32. Colegul pornește serverul modelului pe `0.0.0.0` și vă dă URL-ul complet, cu IP-ul primit în acea rețea, portul și ruta. Dacă site-ul și modelul rulează pe același laptop, adresa modelului poate folosi `127.0.0.1`. Endpointul acceptă un POST cu JPEG și răspunde cu JSON:

```http
POST /predict
Content-Type: image/jpeg

<bytes JPEG>
```

```json
{"label":"plastic","score":0.94}
```

Modelul trimite exact una dintre cele cinci etichete: `glass` (Sticlă), `metal` (Metal), `plastic` (PET/plastic), `paper` (Hârtie/carton) sau `other` (Altele). Pragul implicit este 0,75 și se poate regla cu `--threshold`. La `other` sau sub prag, stația trimite `other` la placă. Imaginea merge doar la endpointul modelului, iar ESP32 primește doar materialul prin HTTP.

## Firmware de referință și montaj

Acești pași sunt pentru montajele care folosesc firmware-ul de referință din repo. Pentru placa echipei, folosiți firmware-ul Emei și adresa serverului ESP32. Profilul PlatformIO este pentru ESP32 DevKit clasic cu `esp32dev`. În PowerShell, din rădăcina repo-ului:

```powershell
$env:PLATFORMIO_CORE_DIR = Join-Path $PWD '.pio'
$env:TEMP = Join-Path $PWD '.cache\tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
.\.venv\Scripts\python.exe -m pip install --no-cache-dir platformio==6.2.0
if (-not (Test-Path firmware/include/wifi_secrets.h)) {
    Copy-Item firmware/include/wifi_secrets.example.h firmware/include/wifi_secrets.h
}
.\.venv\Scripts\python.exe -m platformio device list
```

Setați parola Wi‑Fi în fișierul local `firmware/include/wifi_secrets.h`. Fișierul este ignorat în Git. Înlocuiți `COM5` cu portul care apare când conectați placa prin USB și rulați:

```powershell
.\.venv\Scripts\python.exe -m platformio run -d firmware -t upload --upload-port COM5
```

USB-ul este folosit la flash. După flash, alimentați placa independent de laptop, conectați laptopul la **Sortify-Bench** și verificați ieșirile:

```powershell
curl.exe --fail http://192.168.4.1/health
.\.venv\Scripts\python.exe -m station.esp_link
```

În testul de ieșiri, scrieți `glass`, `metal`, `plastic`, `paper` sau `other` și apăsați Enter. Puteți introduce materiale în orice ordine, de oricâte ori. Apăsați **Ctrl+C** pentru oprire. Calibrați servo-ul fără sarcină înainte de a fixa săgeata din carton.

| Destinație | GPIO LED | Culoare |
| --- | ---: | --- |
| Sticlă | 25 | Verde |
| Metal | 26 | Roșu |
| PET/plastic | 27 | Galben |
| Hârtie/carton | 14 | Albastru |
| Altele | 33 | Alb |

Semnalul servo este pe GPIO 13. Verificați continuitatea și polaritatea LED-urilor în montaj. Profilul folosește LED-uri active HIGH, cu anodul către GPIO și rezistența spre masă. Alimentați servo-ul separat conform fișei lui, cu masă comună. Păstrați plusul sursei servo separat de alimentarea plăcii. [Ghid ESP32 DevKitC](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp-dev-kits-en-master-esp32.pdf) · [TowerPro SG90](https://towerpro.com.tw/product/sg90-analog/)

Aplicația verifică legătura cu adresa ESP32 și trimite `GET /sort?type=plastic`, cu headerul `X-Sortify-Bench: 1`. Valorile sunt `glass`, `metal`, `plastic`, `paper` și `other`. Pentru confirmare, placa răspunde, de exemplu, cu `{"material":"plastic"}`. Poziția servo pentru **Altele** se configurează în firmware-ul plăcii. Verificați mișcarea cu `python -m station.esp_link` pe montajul real.

## Demo pentru juriu

1. Așezați cinci cartonașe în dreptul pozițiilor calibrate și deschideți kiosk-ul.
2. Fixați camera spre un fundal simplu și porniți-o. Goliți cadrul și apăsați **Calibrează cu zona goală**. În modul hardware, kiosk-ul verifică mai întâi că ESP32 răspunde.
3. Când apare **Pregătit**, apăsați **Mod prezentare**. Rugați un jurat să aleagă între două ambalaje testate și să-l țină nemișcat în centru. Arătați rezultatul, LED-ul și săgeata. Retrageți obiectul complet și așteptați din nou **Prezintă ambalajul** înainte de al doilea. **Configurare** sau Escape readuce panoul cu camera și calibrarea.
4. Folosiți un exemplu verificat în prealabil pentru **Altele**. LED-ul alb se aprinde și săgeata indică al cincilea cartonaș.
5. Arătați [istoricul operatorului](http://127.0.0.1:3000/operator) și randarea cu eticheta **Conceptul aparatului final**. Păstrați un clip al unei rulări reale pentru situația în care montajul are probleme în sală.

Folosiți lumină constantă și o singură filă cu camera. Detectarea prezenței se bazează pe diferența față de cadrul gol. Recalibrați dacă schimbați camera, poziția sau lumina. **Scanează obiectul** rămâne disponibil după oprirea automatizării. La eroare de model, comandă neconfirmată, cameră deconectată sau filă ascunsă, automatizarea se oprește și se rearmează manual.

Pentru o repetiție fără model sau placă, porniți serviciul cu `--simulate`. În **Mod prezentare**, apăsați **Simulează o doză** și apoi **Reia simularea** ca să vedeți ecranul de așteptare. Ecranul indică explicit că ieșirile fizice sunt dezactivate.

Stația păstrează local metadatele scanării în `station/data/station.sqlite3`. Simulările sunt excluse. Afișajul operatorului separă previzualizările de comenzile ESP32. Folosiți `--history <cale.sqlite3>` pentru o bază separată de test.

## Verificarea proiectului

```powershell
npm run build
npm run i18n:validate
node --test app/kiosk/presence.test.mts
.\.venv\Scripts\python.exe -m unittest discover -s station/tests
```
