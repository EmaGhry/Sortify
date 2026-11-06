# Sortify · ByteForce

Sortify recunoaște ambalaje cu AI și alege destinația de colectare. În prototipul de banc, laptopul scanează un obiect, ESP32 aprinde LED-ul materialului, iar servo-ul arată direcția pe patru cartonașe. Randarea automatului reprezintă conceptul în care un jgheab va transporta fizic obiectul.

| Interfață | Rol |
| --- | --- |
| `/kiosk` | Stația pe același PC. Cameră în browser, scanare manuală sau automată, rezultat AI și confirmare ESP32. |
| `/operator` | Ultimele 50 de scanări și totaluri din istoricul local. |
| `/` | Prezentarea stației, a prototipului și a conceptului de aparat. |
| `/scan` | Scannerul web cu exemple demo și analiză prin modelul echipei. Scanarea de aici nu comandă placa. |
| [Expo Android](mobile/README.md) | Clientul mobil existent pentru scannerul public. |

## Pornire rapidă pe Windows

Din rădăcina proiectului, instalați Node.js și Python 3.12–3.14, apoi rulați în PowerShell:

```powershell
$env:PLATFORMIO_CORE_DIR = Join-Path $PWD '.pio'
$env:TEMP = Join-Path $PWD '.cache\tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
npm ci --cache .cache/npm
python -m venv .venv
```

Terminalul web:

```powershell
$env:SORTIFY_BENCH = '1'
npm run dev -- --hostname 127.0.0.1
```

Deschideți [http://127.0.0.1:3000/kiosk](http://127.0.0.1:3000/kiosk). Stația și interfața de banc se pornesc pe același PC. La prima rulare permiteți accesul camerei în browser.

Pentru demo fără internet, rulați `npm run build` cât încă aveți internet. În sala de prezentare, folosiți `npm start -- --hostname 127.0.0.1` cu `SORTIFY_BENCH=1` în loc de serverul de dezvoltare.

Într-un al doilea terminal alegeți **un singur mod**:

| Mod | Comandă |
| --- | --- |
| Interfață cu rezultate predefinite | `.\.venv\Scripts\python.exe -m station --simulate` |
| Modelul colegului prin LAN, fără ESP32 | `.\.venv\Scripts\python.exe -m station --preview --model-url http://192.168.4.2:8000/predict` |
| Modelul colegului prin LAN și ESP32 | `.\.venv\Scripts\python.exe -m station --esp --model-url http://192.168.4.2:8000/predict` |

Pentru modurile cu ESP32, conectați laptopul la rețeaua **Sortify-Bench**. Adresa modelului colegului din tabel este un exemplu. După schimbarea modului, reîncărcați kiosk-ul.

Pentru scannerul public vizitați `/scan`. Analiza reală folosește serviciul local al stației și același endpoint al echipei. Exemplele demo sunt disponibile fără model.

## Modelul colegului prin rețea

Modelul rulează pe laptopul colegului. În modul cu ESP32, conectați ambele laptopuri la **Sortify-Bench**. Folosiți IP-ul primit de laptopul colegului în acea rețea și porniți serverul modelului pe interfața de rețea. Contractul implementat este:

```http
POST /predict
Content-Type: image/jpeg

<bytes JPEG>
```

```json
{"label":"plastic","score":0.94}
```

Modelul trimite exact una dintre cele cinci etichete: `glass` (Sticlă), `metal` (Metal), `plastic` (PET/plastic), `paper` (Hârtie/carton) sau `other` (Altele). Pragul implicit este 0,75 și se poate regla cu `--threshold`. La `other` sau sub prag, stația trimite `other` la placă. Imaginea merge doar la endpointul modelului, iar ESP32 primește doar materialul prin HTTP.

## Firmware și montaj

Profilul PlatformIO este pentru ESP32 DevKit clasic cu `esp32dev`. Confirmați modelul plăcii înainte de flash. Copiați exemplul și schimbați parola în fișierul local `wifi_secrets.h` înainte de compilare. Acel fișier este ignorat în Git.

```powershell
.\.venv\Scripts\python.exe -m pip install --no-cache-dir platformio==6.2.0
if (-not (Test-Path firmware/include/wifi_secrets.h)) {
    Copy-Item firmware/include/wifi_secrets.example.h firmware/include/wifi_secrets.h
}
# Editează parola înainte de build și upload.
.\.venv\Scripts\python.exe -m platformio run -d firmware
.\.venv\Scripts\python.exe -m platformio device list
.\.venv\Scripts\python.exe -m platformio run -d firmware -t upload --upload-port COM5
```

USB-ul este folosit la flash. După flash, alimentați placa independent de laptop, conectați laptopul la **Sortify-Bench** și verificați ieșirile:

```powershell
curl.exe --fail http://192.168.4.1/health
.\.venv\Scripts\python.exe -m station.esp_link
```

Testul de ieșiri cere Enter înainte de fiecare comandă. Calibrați servo-ul fără sarcină înainte de a fixa săgeata din carton. Rulați comenzile PlatformIO din terminalul în care ați setat `PLATFORMIO_CORE_DIR`, `TEMP` și `TMP` către folderul proiectului.

| Destinație | GPIO LED | Culoare |
| --- | ---: | --- |
| Sticlă | 25 | Verde |
| Metal | 26 | Roșu |
| Plastic | 27 | Galben |
| Hârtie/carton | 14 | Albastru |
| Altele | 33 | Alb |

Semnalul servo este pe GPIO 13. Verificați continuitatea și polaritatea LED-urilor în montaj. Profilul folosește LED-uri active HIGH, cu anodul către GPIO și rezistența spre masă. Alimentați servo-ul separat conform fișei lui, cu masă comună. Păstrați plusul sursei servo separat de alimentarea plăcii. [Ghid ESP32 DevKitC](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp-dev-kits-en-master-esp32.pdf) · [TowerPro SG90](https://towerpro.com.tw/product/sg90-analog/)

ESP32 creează propriul Wi-Fi cu parolă și primește `GET /sort?type=plastic`, cu headerul `X-Sortify-Bench: 1`. Valorile sunt `glass`, `metal`, `plastic`, `paper` și `other`. Placa răspunde, de exemplu, cu `{"material":"plastic"}` după ce setează ieșirile. `other` aprinde albul și lasă poziția servo neschimbată. Confirmarea dovedește că firmware-ul a aplicat comanda. Mișcarea săgeții se verifică vizual.

## Demo pentru juriu

1. Așezați patru cartonașe în dreptul pozițiilor calibrate și deschideți kiosk-ul în ecran complet.
2. Fixați camera spre un fundal simplu și porniți-o. Goliți cadrul și apăsați **Calibrează cu zona goală**. În modul hardware, kiosk-ul verifică mai întâi că ESP32 răspunde.
3. Când apare **Pregătit**, rugați un jurat să aleagă între două ambalaje testate și să-l țină nemișcat în centru. Arătați rezultatul, LED-ul și săgeata. Retrageți obiectul complet și așteptați din nou **Pregătit** înainte de al doilea ambalaj.
4. Folosiți un exemplu verificat în prealabil pentru **Altele**. LED-ul alb se aprinde și săgeata rămâne pe loc.
5. Arătați [istoricul operatorului](http://127.0.0.1:3000/operator) și randarea cu eticheta **Conceptul aparatului final**. Păstrați un clip al unei rulări reale pentru situația în care montajul are probleme în sală.

Folosiți lumină constantă și o singură filă cu camera. Detectarea prezenței se bazează pe diferența față de cadrul gol. Recalibrați dacă schimbați camera, poziția sau lumina. **Scanează obiectul** rămâne disponibil după oprirea automatizării. La eroare de model, comandă neconfirmată, cameră deconectată sau filă ascunsă, automatizarea se oprește și se rearmează manual.

Stația păstrează local metadatele scanării în `station/data/station.sqlite3`. Simulările sunt excluse. Afișajul operatorului separă previzualizările de comenzile ESP32. Folosiți `--history <cale.sqlite3>` pentru o bază separată de test.

```powershell
npm run build
npm run i18n:validate
node --test app/kiosk/presence.test.mts
.\.venv\Scripts\python.exe -m unittest discover -s station/tests
```

[Planul stației automate](docs/SORTIFY-STATION-PLAN.md) descrie etapa ulterioară cu clapetă, senzori, jgheab și compartimente.
