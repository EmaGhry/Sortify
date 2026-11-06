# Sortify · ByteForce

Sortify recunoaște ambalaje cu AI și alege destinația de colectare. În prototipul de banc, laptopul scanează un obiect, ESP32 aprinde LED-ul materialului, iar servo-ul arată direcția pe patru cartonașe. Randarea automatului reprezintă conceptul în care un jgheab va transporta fizic obiectul.

| Interfață | Rol |
| --- | --- |
| `/kiosk` | Stația pe același PC. Cameră în browser, scanare manuală sau automată, rezultat AI și confirmare ESP32. |
| `/operator` | Ultimele 50 de scanări și totaluri din istoricul local. |
| `/` | Scannerul web existent, cu exemple demo și analiză live prin Gemini sau OpenAI dacă este configurată. |
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
.\.venv\Scripts\python.exe -m pip install --no-cache-dir -r station/requirements.txt
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
| Cameră și model ONNX, fără ESP32 | `.\.venv\Scripts\python.exe -m station --preview` |
| Cameră, model ONNX și ESP32 | `.\.venv\Scripts\python.exe -m station --esp` |
| Modelul colegului prin LAN și ESP32 | `.\.venv\Scripts\python.exe -m station --esp --model-url http://192.168.4.2:8000/predict` |

Pentru modurile cu ESP32, conectați laptopul la rețeaua **Sortify-Bench**. Adresa modelului colegului din tabel este un exemplu. După schimbarea modului, reîncărcați kiosk-ul.

Pentru ONNX, rulați o dată `.\.venv\Scripts\python.exe -m station.download_model`. Scriptul descarcă și verifică un model de referință extern [WasteWise](https://huggingface.co/SriramRokkam/wastewise-garbage-cls). După instalare, inferența ONNX pe CPU poate rula offline. Pentru modelul echipei folosiți `--model <cale.onnx>` dacă exportul respectă același contract: RGB, intrare float32 `[1,3,224,224]` în [0,1], opt probabilități în ordinea `battery, biological, cardboard, glass, metal, paper, plastic, trash`. Înainte de prezentare, testați obiectele reale pe camera și lumina din sală. `--threshold` modifică pragul implicit de 0,75. Scorul modelului este util pentru filtrare. Performanța se măsoară separat pe obiecte etichetate.

Pentru scannerul public porniți `npm run dev` și vizitați `/`. `.env.example` documentează cheile opționale. Exemplele demo sunt disponibile fără cheie.

## Modelul colegului prin rețea

Modelul poate rula pe laptopul colegului dacă și el se conectează la **Sortify-Bench**. Folosiți IP-ul pe care îl primește în acea rețea, porniți serverul modelului pe interfața de rețea și permiteți accesul la portul lui. Dacă endpointul este în cloud, PC-ul stației are nevoie și de o conexiune la internet, de exemplu prin Ethernet în paralel cu Wi-Fi-ul către ESP32. Cereți URL-ul complet, portul și formatul răspunsului. Contractul implementat este:

```http
POST /predict
Content-Type: image/jpeg

<bytes JPEG>
```

```json
{"label":"plastic","score":0.94}
```

Etichetele acceptate sunt cele opt clase ONNX de mai sus plus `other`, `unknown`, `empty` și `reject`. `cardboard` merge la hârtie. Clasele neacceptate și scorurile mici indică `other` pe placă. Stația trimite un singur cadru JPEG decupat la fiecare apăsare a butonului de scanare. În modul de rețea, imaginea merge la adresa modelului, iar laptopul stației trimite doar materialul către ESP32 prin HTTP. Pentru un endpoint găzduit folosiți HTTPS și, dacă serverul cere autentificare, setați `SORTIFY_MODEL_TOKEN` în terminalul stației. Ajustați adaptorul dacă modelul colegului folosește alt contract.

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
4. Folosiți un exemplu verificat în prealabil pentru refuz. Ecranul arată **Obiect neacceptat**, LED-ul alb se aprinde și săgeata rămâne pe loc.
5. Arătați [istoricul operatorului](http://127.0.0.1:3000/operator) și randarea cu eticheta **Conceptul aparatului final**. Păstrați un clip al unei rulări reale pentru situația în care montajul are probleme în sală.

Folosiți lumină constantă și o singură filă cu camera. Detectarea prezenței se bazează pe diferența față de cadrul gol. Recalibrați dacă schimbați camera, poziția sau lumina. **Scanează obiectul** rămâne disponibil după oprirea automatizării. La eroare de model, comandă neconfirmată, cameră deconectată sau filă ascunsă, automatizarea se oprește și se rearmează manual.

În modurile ONNX și model prin rețea, stația păstrează local metadatele scanării în `station/data/station.sqlite3`. Simulările sunt excluse. Afișajul operatorului separă previzualizările de comenzile ESP32. Folosiți `--history <cale.sqlite3>` pentru o bază separată de test.

```powershell
npm run build
npm run i18n:validate
node --test app/kiosk/presence.test.mts
.\.venv\Scripts\python.exe -m unittest discover -s station/tests
```

[Planul stației automate](docs/SORTIFY-STATION-PLAN.md) descrie etapa ulterioară cu clapetă, senzori, jgheab și compartimente.
