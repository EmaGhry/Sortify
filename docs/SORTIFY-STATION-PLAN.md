# Sortify Station · plan de implementare

Pentru demo-ul de banc actual, urmați [README-ul](../README.md). Prototipul indică destinația cu LED și servo pe baza unei scanări declanșate din browser. Comanda ajunge la ESP32 prin HTTP pe rețeaua proprie a plăcii. Jgheabul, clapeta, senzorii, compartimentele și protocolul serial de mai jos aparțin planului inițial pentru aparatul complet.

Plan de lucru pentru prototip. Starea implementării se verifică în repo și în testele de banc. Documentul Word și planul intern anterior sunt materiale de referință. Dacă se contrazic cu acest plan, confirmați decizia înainte de a implementa modulul afectat.

## 1. Produsul și limita MVP-ului

**Sortify este un automat cu o singură gură de introducere și patru compartimente de colectare.** Persoana introduce un ambalaj pe rând. Camera internă îl vede în zona de scanare, modelul local recunoaște obiectul, iar ESP32 comandă un mecanism care îl direcționează spre compartiment. Ecranul arată ce se întâmplă și ce trebuie să facă utilizatorul dacă obiectul nu poate fi acceptat.

- **Prima locație** · zona de returnare a tăvilor dintr-o singură cantină. Administratorul locației este cumpărătorul ipotetic, iar personalul cantinei verifică și golește compartimentele. Pilotul urmărește câte ambalaje acceptate ajung unde trebuie, câte obiecte sunt refuzate și câtă intervenție necesită stația.
- **Obiecte de demo** · ambalaje goale, uscate, încadrate în dimensiunile și greutatea testate. Începem cu câteva forme cunoscute pentru fiecare destinație. Folosim sticlă reală doar după ce traseul și recipientul rezistă la cădere fără spargere. Până atunci, testăm recunoașterea separat și marcăm clar orice substitut folosit pentru mecanică.
- **Patru destinații fizice** · `glass`, `metal`, `plastic`, `paper`. `reject` înseamnă că stația păstrează obiectul accesibil utilizatorului și cere retragerea lui. `empty` este o observație a modelului. Niciuna dintre aceste stări nu are compartiment propriu.
- **Model și reguli** · modelul identifică obiectul vizibil. O configurație locală stabilește dacă acel tip de obiect e acceptat și în ce compartiment merge. Un pahar cu material neclar sau ambalaj cu resturi vizibile poate fi refuzat. Regulile unei cantine se validează cu administratorul și colectorul înainte de pilot.
- **Interfețe** · ecranul automatului este interfața principală. Un portal simplu pentru operator vine după ce traseul fizic funcționează. QR-ul și scanarea publică existentă sunt extensii. Conturile pe companii, rapoartele PDF, fluxul video, jocul, voucherele și marketplace-ul rămân în backlog.

## 2. Ce folosim din repo și din Word

| Subiect | Decizia pentru prototip |
| --- | --- |
| Web | Păstrăm Next.js, React, Tailwind, componentele și traducerile existente. Adăugăm `/kiosk`, apoi `/operator`. Scanarea publică existentă poate rămâne o funcție separată. |
| Android | Expo există în `mobile/` și folosește backendul web. Ecranul de pe automat rulează într-un browser pe laptop sau pe un ecran conectat la acesta. Aplicația Android nu este o dependență a stației. |
| AI | Camera din browser captează obiectul. Serviciul Python folosește endpointul modelului echipei, care rulează local pe laptopul colegului. |
| Backend | Pentru o stație, agentul Python deține camera, serialul, starea și SQLite. Next afișează informația prin API pe același PC. Astfel evităm migrarea la Vite și duplicarea backendului propuse în Word. |
| Hardware | Wordul adaugă o clapetă cu servo și un senzor de prezență. În schema primită se vede un singur SG90. Pentru fluxul complet, recomand o zonă de așteptare cu clapetă și un jgheab selector separat. |
| Contracte și rapoarte | Păstrăm simulatorul, testarea pe obiecte noi și corecția umană. Adăugăm ID pentru fiecare ciclu și separăm confirmarea fizică, succesul inferat și acuratețea verificată. |

## 3. Schema, mecanica și verificarea la banc

| Funcție | Etichetă în schemă | Folosire propusă |
| --- | --- | --- |
| LED alb | D33 | Stare/atenție. Interfața spune dacă se scanează sau trebuie retras obiectul. |
| LED verde | D25 | Sticlă |
| LED roșu | D26 | Metal |
| LED galben | D27 | Plastic |
| LED albastru | D14 | Hârtie/carton |
| SG90 | D13 indicat lângă conexiuni | Jgheab selector. Verificați în fișierul KiCad și cu multimetrul că semnalul servo este efectiv pe netul D13. |
| Condensator | C1, 470 µF | Pe alimentarea servo, cu plus la V+ și minus la GND. |

Numerotarea 1–34 din simbolul din captură identifică pinii simbolului. Confirmați etichetele și modelul plăcii înainte de a seta GPIO-urile în firmware. GPIO 18 pentru clapetă și GPIO 34 pentru senzorul de prezență sunt **propuneri din Word**, cu confirmare pe placa reală. Dacă placa este un ESP32 clasic și folosiți GPIO 34, planificați intrare de 3,3 V și rezistență externă dacă tipul ieșirii senzorului o cere. Confirmați separat pinul pentru senzorul de cădere, dacă îl adăugați.

**Înainte de alimentare**, verificați direcția LED-urilor. Simbolurile din captură sugerează catodul spre GPIO, în timp ce rezistențele merg la masă. Pentru ieșire activă HIGH, conectați `GPIO → anod → catod → 220 Ω → GND`. Verificați polaritatea pe piesele fizice și testați fiecare LED separat cu rezistența de 220 Ω din schemă. Luminozitatea se ajustează după verificarea curentului și a specificațiilor LED-ului.

Alimentați placa prin USB și servo-urile de la o sursă externă stabilizată, în domeniul specificat de servo-urile voastre și dimensionată pentru vârfurile de curent. Legați masele. Țineți plusul sursei servo separat de `VIN`/`5V` al plăcii în această configurație și verificați polaritatea condensatorului. Confirmați pe banc compatibilitatea PWM de 3,3 V, tensiunea sub sarcină și dacă ESP32 se resetează la pornirea servo-urilor. TowerPro specifică 4,8 V și alimentare externă pentru SG90 analog. Verificați ghidul plăcii exacte pentru opțiunile de alimentare. [TowerPro SG90](https://towerpro.com.tw/product/sg90-analog/) · [Espressif ESP32-DevKitC](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp-dev-kits-en-master-esp32.pdf)

**Mecanica minimă**

1. O tavă sau clapetă ține un obiect într-o zonă cu lumină fixă. Intrarea îl lasă accesibil până la eliberare și ține mâna departe de servo și jgheab. Testați fizic poziția la pornire și la pierderea alimentării. O comandă software de închidere nu poate ține singură obiectul dacă actuatorul rămâne fără curent.
2. Jgheabul se aliniază pe unul dintre patru canale. Calibrați cele patru poziții pe ansamblul real, pornind cu mișcări scurte și fără obiect. Dimensionați servo-ul după pârghie și sarcină. SG90 se validează întâi pentru un jgheab ușor.
3. Clapeta eliberează obiectul doar după aliniere. Un senzor de prezență declanșează ciclul, iar un senzor opțional pe traseu confirmă trecerea. Confirmarea compartimentului exact necesită senzor pe destinație sau observație manuală. Un singur servo poate demonstra selectorul cu eliberare manuală. Etichetați acel mod ca **demo asistat** până verificați mecanismul automat complet.
4. Testați pe rând alimentarea, LED-urile, servo-urile fără sarcină, opritoarele, apoi căderea către fiecare recipient. După fiecare blocaj, operatorul oprește alimentarea actuatorului înainte de a umbla în mecanism. Țineți pentru demo un set de obiecte care a trecut deja testul fizic.

## 4. Arhitectura software

```text
Camera USB → agent Python pe PC → modelul echipei → regulile stației
                       ↕ USB serial                        │
                 ESP32 → LED-uri, servo-uri și senzori     │
                       └────── starea ciclului ────────────┘
                                      ↓
                           SQLite + API pe loopback
                                      ↓
                       Next.js /kiosk și apoi /operator
```

- `firmware/` · PlatformIO cu Arduino C++, configurație cu pinii, pozițiile, timpii și polaritățile confirmate. Buclă neblocantă, debounce și un singur ciclu activ. Blochează eliberarea dacă rezultatul, starea sau ID-ul sunt invalide. Modul de calibrare este disponibil prin serial doar în stare inactivă, cu tavă goală.
- `station/` · serviciul Python primește cadrele, apelează endpointul modelului echipei, trimite destinația la ESP32 și salvează metadatele în SQLite. Pentru mecanismul complet, senzorul poate declanșa capturarea unui cadru proaspăt.
- `app/kiosk/` și `app/operator/` · UI în Next.js. Ecranul public primește numai starea ciclului și mesajul pentru utilizator. Portalul arată starea stației, ultimele evenimente, corecții și export CSV. Pentru MVP, portalul este pe PC-ul local. Accesul din rețea necesită autentificare, autorizare și configurare explicită. Interfața publică nu are acces la serial sau la comenzi de mișcare.
- `config/station.example.json` · configurație de referință pentru ID stație, mapare clasă–destinație, praguri de acceptare, etichete RO/EN și limite pentru demo. Firmware-ul rămâne sursa de adevăr pentru pini și poziții. Testul de integrare verifică maparea cu etichetele de pe compartimente.
- `docs/` · schema revizuită, protocolul, pașii de instalare, raportul de test și scenariul de demo. Dacă aveți fișierul KiCad, păstrați sursa schematicii și un PDF sau PNG exportat, ca diferențele față de cablaj să fie verificabile.

### Ciclul și tratarea erorilor

1. ESP32 pornește cu eliberarea blocată și trimite `READY` după verificarea stării inițiale. Ecranul afișează **„Introdu un obiect”** când agentul vede camera, modelul, serialul și tava liberă.
2. Senzorul detectează obiectul, firmware-ul emite `OBJ` și păstrează tava blocată. Agentul rulează detecția locală, apoi trimite o destinație validă sau `REJECT`.
3. Pentru o destinație validă, ESP32 aliniază jgheabul, așteaptă timpul calibrat, eliberează, închide și verifică dacă tava este liberă. LED-ul indică destinația. Pentru `REJECT`, ecranul cere retragerea obiectului și ciclul rămâne blocat până când tava este liberă.
4. Dacă expiră timpul, cade legătura sau obiectul rămâne în mecanism, opriți ciclul și afișați starea. Dacă o întrerupere are loc după ce eliberarea a început, marcați rezultatul ca neconfirmat și cereți verificare înaintea următorului ciclu. Reconectarea nu reexecută o comandă veche.

### Contract serial propus

USB, 115200 baud, mesaje ASCII terminate cu newline, un singur obiect activ. `cycle_id` include identificatorul sesiunii ESP32 și un contor de ciclu. Mesajele cu ID vechi, clase nepermise sau linii invalide sunt respinse. Secvența este verificată de ambele capete.

| Direcție | Mesaj | Interpretare |
| --- | --- | --- |
| ESP32 → PC | `READY <session_id>` | Firmware pregătit. Agentul poate trata sesiunile schimbate ca reset. |
| ESP32 → PC | `OBJ <cycle_id>` | Senzorul a declanșat ciclul. |
| PC → ESP32 | `CLS <cycle_id> <glass|metal|plastic|paper>` | Destinație validă pentru ciclul curent. |
| PC → ESP32 | `REJECT <cycle_id> <reason>` | Păstrează obiectul pe tavă și așteaptă retragerea. |
| ESP32 → PC | `DONE <cycle_id> <pass_detected|unverified>` | Secvența mecanică s-a terminat. Tipul spune dacă un senzor a observat trecerea. |
| ESP32 → PC | `REJECTED <cycle_id> <reason>` / `ERR <cycle_id> <code>` | Refuz finalizat după retragere sau eroare care trebuie tratată. |

Pentru fiecare ID, agentul salvează cel mult un rezultat final. Stocați clasa prezisă, scorul, destinația, starea, eventualul rezultat observat manual, timpii, versiunea modelului și sursa `live`/`sim`. În caz de serial deconectat, starea de mișcare e indisponibilă până la resincronizare. Dacă SQLite sau UI se opresc, agentul păstrează controlul ciclului și semnalizează pierderea telemetriei. Pentru demo, datele simulate sunt separate și au banner vizibil. Simulatorul nu poate comanda portul serial.

### Ecranele și indicatorii

- `/kiosk` · fullscreen. Stările sunt **Pregătit**, **Se scanează**, **Se sortează**, **Retrage obiectul** și **Stație indisponibilă**. Text mare și iconuri. Mesajul folosește denumirea materialului împreună cu culoarea. Camera este orientată spre tavă, iar pentru MVP agentul procesează cadrele în memorie.
- `/operator` · o stație, starea curentă, lista de evenimente, filtre, confirmare/corectare și export CSV. Agentul poate publica heartbeat la 5 s, iar UI poate marca stația indisponibilă după 15 s fără heartbeat. Heartbeat-ul funcționează și în repaus. Valorile sunt praguri inițiale configurabile.
- **Rată de rutare automată** = cicluri cu rutare executată / cicluri reale inițiate. Afișați separat câte treceri au fost confirmate de senzor, câte au fost refuzate și câte au avut eroare. **Acuratețe de clasificare** = predicții corecte / obiecte cu etichetă verificată. **Corectitudinea sortării fizice** se măsoară prin destinația observată, inclusiv dacă obiectul nu a ajuns nicăieri. Pentru fiecare procent afișați și numitorul. Comparați cu sortarea manuală doar pe probe și criterii comparabile. Cântărirea și raportarea în kg intră după măsurare.

## 5. Ordinea de implementare și criteriile de trecere

| Fază | Livrabil | Condiție de trecere |
| --- | --- | --- |
| 0. Fixăm contractul | Poză cu placa exactă, schemă corectată, BOM cu piese existente/lipsă, desenul traseului, patru destinații, setul de obiecte, protocolul. | Echipa confirmă cum rămâne obiectul pe tavă și cum îl retrage utilizatorul. |
| 1. Mișcare | Firmware cu LED, poziții calibrate și test controlat al mecanismului. Agentul simulat poate lucra în paralel pentru UI. | Patru trasee testate manual, zece repetări pe fiecare cu obiecte din setul de banc. Orice blocaj se notează și se remediază. |
| 2. Lanț pe USB | Senzor, agent cu rezultate deterministe de test, ESP32 și tava. Rezultatul de test comandă hardware doar în modul de banc armat explicit. | Testați succes, refuz, timeout, ID duplicat, obiect neretras, restart PC/ESP și deconectare. Un ciclu invalid nu eliberează un obiect. |
| 3. AI real și kiosk | Model local pe PC, configurare, UI, stare și log. Colectarea imaginilor începe de la faza 0, pe camera și în lumina reală. | Modelul este evaluat pe obiecte fizice diferite de cele din antrenare. Kiosk-ul vede evenimente reale, cu internetul oprit. |
| 4. Repetiție | Un scenariu live, instrucțiuni de pornire/calibrare și măsurători. | Rulați 40 de obiecte acceptate, 10 pe clasă, și 10 probe necunoscute sau neacceptate. Păstrați rezultatele pe clasă și motivul fiecărui eșec. |
| 5. Operator și pilot | Istoric persistent, corecții, export, apoi test într-o cantină. | Personalul poate prelua, verifica și goli compartimentele. Comparați sortarea cu o probă manuală și notați durata, erorile și intervențiile. |

**Ținte propuse, de măsurat** · cel puțin 34 din 40 de obiecte acceptate în compartimentul corect, toate cele 10 obiecte din setul de refuz recuperabile fără rutare și p95 sub 3 s de la detectare la terminarea ciclului mecanic pentru obiectele rutate. Raportați rata de refuz inclusiv pentru obiectele acceptate și separați latența modelului de latența întregului ciclu. Scrieți rezultatele reale, chiar dacă o țintă este ratată. Orice video de rezervă trebuie să arate o rulare reală și să fie prezentat ca înregistrare.

Pentru model, separați seturile după **obiect fizic**, nu după cadru. Includeți rotiri, obiecte deformate, cadre goale și obiecte care trebuie refuzate. Fixați versiunea modelului și ordinea claselor, dimensiunea și normalizarea imaginii. Calibrați pragurile pe validare. Folosiți setul de test la final și păstrați matricea de confuzie și rata de acceptare a obiectelor neeligibile.

## 6. README și fișierele din Git

README-ul public poate începe astfel, cu starea actualizată odată cu fiecare livrare:

> **Sortify Station** este un prototip de automat care recunoaște ambalaje cu o cameră și le direcționează în patru compartimente cu un ESP32. Recunoașterea stației este proiectată să ruleze local pe PC. Repo-ul conține în prezent scannerul web Next.js și clientul Expo. Stația fizică și integrarea locală sunt descrise în planul de implementare.

Sub descriere, adăugați în această ordine:

1. **Demo și stare** · o poză sau un clip real, cele patru destinații și un tabel „implementat / planificat”. Menționați în mod explicit când datele sunt simulate sau eliberarea e manuală.
2. **Pornirea proiectului** · `npm ci`, apoi `npm run dev` și `http://localhost:3000`. README documentează exemplele demo și conectarea modelului echipei pentru clasificare.
3. **Pornirea stației** · după implementare, listați versiunile testate de Node, Python, PlatformIO și model, comenzile pentru flash și pornire, camera, portul COM, modelul și comanda simulatorului. Ordinea recomandată este alimentare și calibrare, agent, apoi Next și `/kiosk`. Link separat către schema și pașii de verificare de banc.
4. **Verificare și depanare** · `npm run build`, `npm run i18n:validate`, compilarea firmware-ului, testele stației și lista de verificare fizică. Includeți camera ocupată, COM greșit, model incompatibil, ESP32 resetat, servo blocat și diferența între „trecere detectată” și „destinație verificată”.

**Păstrăm regulile existente** pentru env-uri, build-uri Next, APK-uri, copia locală `/s/` și planurile interne. Extensia de mai jos este gata de adăugat în `.gitignore` când apar modulele. Folderul `docs/` rămâne vizibil pentru echipă și poate fi urmărit în Git.

```gitignore
# Python și firmware
.venv/
__pycache__/
*.py[cod]
.pytest_cache/
.ruff_cache/
.pio/

# Configurație locală, date și artefacte ale stației
/config/station.local.json
/station/data/
/station/captures/
/station/datasets/
/station/runs/
/station/models/*.onnx
/station/models/*.onnx.data
/station/models/*.tflite
/station/models/*.pt
/station/models/*.pth
/station/models/*.ckpt
/station/models/*.safetensors
```

Urmăriți în Git codul, `platformio.ini`, lockfile-urile, fișierele `*.example`, schema sursă, fixture-urile mici și manifestul modelului. Puneți baza SQLite, fișierele ei auxiliare și logurile în `station/data/`. Distribuiți greutățile modelului printr-un release sau un spațiu al echipei, cu licență, checksum și instrucțiuni de instalare. Pentru un model mic ales intenționat ca artefact de demo, documentați excepția sau folosiți Git LFS dacă echipa îl are configurat. Verificați regulile înainte de primul commit cu `git check-ignore -v` pe fișiere reprezentative și `git status --short --ignored`.

## 7. Deciziile rămase înainte de implementare

- Modelul exact de ESP32 și fișierul KiCad original, polaritatea LED-urilor, legătura D13 și tensiunea de alimentare sub sarcină.
- Mecanismul real pentru reținere și retragere, al doilea servo, tipul senzorului de prezență și eventuala confirmare a trecerii.
- Dimensiunea și masa acceptate, schema fizică a celor patru ieșiri și setul sigur pentru demo.
- Laptopul, camera și versiunea exportată a modelului. Ținta de latență și pragurile se validează pe acel ansamblu.
- Cine este prima cantină sau locație pilot și cine confirmă regulile pentru fiecare ambalaj.
