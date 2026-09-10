# Prism Desk · 棱镜

<img src="src/assets/prism-icon.svg" width="80" height="80" alt="Prism Desk">

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [العربية](README.ar.md)

Entwickelt von [Shixi Lin](https://shixilin.com/).

Prism Desk ist eine Windows-Arbeitsumgebung für CLIs mit Abonnement. Wenn das Kontingent eines Kontos aufgebraucht ist, können Sie die Aufgabe an ein anderes Konto übergeben, ohne den Gesprächsverlauf und die Fortschrittsnotizen von Hand rekonstruieren zu müssen. Der Projektordner bleibt derselbe.

Wenn Prism dir Zeit spart, kannst du [die Weiterentwicklung unterstützen](https://shixilin.com/support?lang=de).

### Versionen und Downloads

**[Neueste Version](https://github.com/shixi-11/prism-desk/releases/latest)** · **[Installationsanleitung](#install)**

Prism wird derzeit als **Installation aus dem Quellcode für Windows** bereitgestellt. Es gibt kein veröffentlichtes eigenständiges `.exe`- oder `.msi`-Installationsprogramm. Die „Source code“-Downloads auf GitHub enthalten Quelldateien; folgen Sie der Installationsanleitung, um die Desktop-App zu bauen und zu starten. Jede stabile Version hat genau ein Versions-Tag und eine Seite mit vollständigen Änderungshinweisen auf Englisch und in vereinfachtem Chinesisch.

### Was Sie tun können

| Funktion | In der Praxis |
| --- | --- |
| Dieselbe Aufgabe fortsetzen | Halten Sie die ursprüngliche Anfrage, den Gesprächsverlauf, die Fortschrittsnotizen und die aufgezeichneten Werkzeugergebnisse zusammen, wenn Sie die Arbeit an ein anderes Konto übergeben. |
| Ein Ausführungskonto auswählen | Wählen Sie ein konfiguriertes CLI-Profil für Codex, Claude oder Grok. Jedes verwendet ein eigenes Anmeldeverzeichnis. Entfernen Sie ungenutzte Konten im Kontenbereich; der Aufgabenverlauf und die lokalen Anmeldeordner bleiben erhalten. |
| Modell und Denkaufwand ändern | Passen Sie beide Einstellungen während einer Aufgabe an. Änderungen gelten für die nächste Ausführung und werden innerhalb der Aufgabe für jedes Konto gespeichert. |
| Codex-Fast-Modus | Beschleunigt Antworten unterstützter Modelle bei höherem Credit-Verbrauch. Standardmäßig deaktiviert; wird pro Konto innerhalb jeder Aufgabe gespeichert und gilt ab der nächsten Ausführung, ohne die Denkstufe zu ändern. |
| Kontingent prüfen | Sehen Sie die vom Anbieter gemeldeten verfügbaren Prozentwerte, Kontingentzeiträume und Rücksetzzeitpunkte ein. Bei Codex-Reset-Guthaben werden die jeweiligen Ablaufdaten angezeigt, sofern sie zurückgegeben werden. |
| Nach Erschöpfung des Kontingents übergeben | Aktivieren Sie die automatische Übergabe oder wählen Sie das nächste Konto selbst. Prism wartet auf das Ende der vorherigen Ausführung, bevor es fortfährt. |
| Lokale Skills und Werkzeuge verwenden | Geben Sie in Prism Assistentenanweisungen, einen Skills-Ordner und installierte Anwendungen an. Prüfen Sie erkannte Einstiegspunkte und unterstützte Anwendungsoperationen. |
| Ihre Arbeit lokal aufbewahren | Wählen Sie einen dauerhaften Ordner zur Aufgabenspeicherung, fügen Sie Fortschrittsnotizen hinzu und exportieren Sie ein Gesprächsprotokoll als Markdown. |
| In Ihrer Sprache arbeiten | Wählen Sie eine von neun Oberflächensprachen, darunter Arabisch mit Darstellung von rechts nach links, und wechseln Sie zwischen dem hellen und dunklen Wüstendesign. |

<a id="install"></a>

### Installation

Diese Befehle installieren die stabile Version **v0.1.17**. Den aktuellen Versionsstand und die zweisprachigen Änderungshinweise finden Sie in der [neuesten Veröffentlichung](https://github.com/shixi-11/prism-desk/releases/latest).

Sie benötigen Windows, Git, Node.js 22.12 oder neuer, npm und die offiziellen CLIs der gewählten Anbieter. Melden Sie sich bei jedem CLI separat an.

```powershell
git clone --branch v0.1.17 https://github.com/shixi-11/prism-desk.git
cd prism-desk
npm install
npm run build
npm run build:desktop
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-host.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
```

Das Build-Skript kompiliert den Windows-Prozesshost, mit dem CLI-Unterprozesse gemeinsam beendet werden. Es verwendet den in Windows enthaltenen .NET-Framework-Compiler.

### Vor Ihrer ersten Aufgabe

Installieren Sie für jeden gewünschten Anbieter das offizielle CLI und melden Sie sich anschließend darüber an. Eine Anmeldung auf einer Website oder in einer Desktop-App allein richtet Prism nicht ein.

- **Codex:** Folgen Sie der [CLI-Installationsanleitung](https://developers.openai.com/codex/cli/) und melden Sie sich mit Ihrem ChatGPT-Konto an.
- **Claude:** Installieren Sie [Claude Code](https://code.claude.com/docs/en/setup) und [melden Sie sich anschließend an](https://code.claude.com/docs/en/authentication) mit einem unterstützten Claude-Abonnement. Prism prüft vor der Ausführung die Abonnement-Anmeldung und die Einstellungen zur Zusatznutzung; die Zusatznutzung muss deaktiviert sein.
- **Grok:** Installieren Sie das offizielle Grok CLI und melden Sie sich mit Ihrem Abonnementkonto an.

Öffnen Sie **Konten → Konto verbinden**, wählen Sie Codex, Claude oder Grok und geben Sie dem Konto einen Namen. **Speichern und weiter → Anmeldelink anfordern → Anmeldelink kopieren** startet den Autorisierungsvorgang des offiziellen CLI. Fügen Sie den Link in die Adressleiste Ihres Browsers ein. Falls Claude einen Autorisierungscode anzeigt, fügen Sie den vollständigen Code in **Autorisierungscode** ein und wählen Sie **Code senden**. Der Code wird ausschließlich an das wartende offizielle CLI gesendet und danach aus dem Eingabefeld gelöscht. Nach Ihrer Autorisierung prüft Prism die Abonnement-Anmeldung und stellt das Konto ohne Neustart bereit. Auf der Seite können Sie außerdem eine vorhandene Anmeldung prüfen, die Autorisierung abbrechen oder den Link erneut kopieren, Profile umbenennen und Konten deaktivieren oder aktivieren. Beim Deaktivieren bleiben frühere Aufgaben und Anmeldedaten erhalten. In den erweiterten Einstellungen können Sie die ausführbare Datei des offiziellen CLI auswählen oder ein bestehendes unabhängiges Anmeldeverzeichnis importieren; bereits eingerichtete Kontoverzeichnisse und Plattformidentitäten lassen sich nicht ändern. Bei fehlenden CLIs führen Links zu den offiziellen Installationsanleitungen. Künftige Plattformen benötigen eigene Anbieter- und Ausführungsadapter.

### Eine typische Aufgabe

1. Klicken Sie auf **Neue Aufgabe** und geben Sie ihr einen Namen. Der Projektordner ist optional; bleibt das Feld leer, wird ein separater, dauerhafter Arbeitsbereich für die Aufgabe erstellt.
2. Wählen Sie ein Ausführungskonto, ein Modell und den Denkaufwand. Verwenden Sie **Nur lesen** für eine Prüfung oder **Projekt bearbeiten** für Änderungen.
3. Geben Sie Ihre Anfrage ein und senden Sie sie mit **Ctrl + Enter**. Verfolgen Sie während der Arbeit den Gesprächsverlauf und das Ausführungsprotokoll.
4. Ergänzen Sie wichtige Entscheidungen oder noch ausstehende Arbeiten in den Fortschrittsnotizen. Um das Konto zu wechseln, wählen Sie das nächste Konto und verwenden Sie die Übergabefunktion; beenden Sie bei Bedarf zuerst die laufende Ausführung.
5. Benennen Sie eine Aufgabe über die Stiftschaltfläche, per Doppelklick oder mit **F2** um. Drücken Sie **Enter** zum Speichern oder **Esc** zum Abbrechen.
6. Arbeiten Sie in derselben Aufgabe weiter. Exportieren Sie ihr Protokoll, wenn Sie eine Markdown-Kopie benötigen, oder öffnen Sie den Ordner zur Aufgabenspeicherung, um die lokalen Dateien zu finden.

Das nächste Konto erhält den gespeicherten Gesprächsverlauf, die Fortschrittsnotizen und die Werkzeugprotokolle. Der interne Modellzustand eines Anbieters wird nicht übertragen.

### Nachrichten, Einstellungen und Vorschauen

#### Ziele und Pläne

Die kompakte **Zielleiste** oberhalb des Eingabebereichs zeigt das gespeicherte Ziel, den Ausführungsstatus und die aufgelaufene Ausführungszeit. Über die Leiste können Sie das Ziel bearbeiten, pausieren, fortsetzen oder löschen; klappen Sie sie auf, um das vollständige Ziel, den bearbeitbaren Plan und die Ausführungsdetails zu sehen. Eine Pause stoppt die aktuelle Ausführung und hält Nachrichten in der Warteschlange zurück. Beim Löschen wird gewartet, bis die Ausführung beendet ist. Anschließend wird das Ziel entfernt, und ausstehende Nachrichten werden zur Prüfung zurückgehalten; Gesprächsprotokolle und Dateien im Arbeitsbereich bleiben verfügbar. Der Zeitmesser zählt Pausen, Leerlaufzeiten und Zeiten mit geschlossener App nicht mit. Eine offiziell gemeldete Erschöpfung des Kontingents wird getrennt von Netzwerk- oder Anmeldefehlern angezeigt.

Codex kann Ziele über die nativen Werkzeuge von Prism speichern, wenn Sie es auffordern, ein Ziel festzulegen oder zu ändern. Andere Einstiegspunkte können ein Ziel vorschlagen, das Sie in der Oberfläche übernehmen können. Eine Chatnachricht, die behauptet, ein Ziel sei gespeichert, ändert für sich allein niemals das tatsächliche Ziel. **Zuerst planen** wird mit Leseberechtigungen ausgeführt und liefert einen Entwurf zur Prüfung. Der Eingabebereich weist ausdrücklich darauf hin, wenn Nachrichten nur der Besprechung eines ausstehenden Plans dienen; **Plan bestätigen und ausführen** startet die Umsetzung mit den für die Aufgabe konfigurierten Berechtigungen. Ziele und Pläne bleiben über Sitzungen hinweg erhalten und sind weiterhin im Übergabeprotokoll enthalten.

#### Modelle und Übergabe

Modellwechsel können innerhalb desselben Kontos mit **Wechseln und fortfahren** angewendet werden. Eine bestätigte Ausführung hält ihr Konto, ihr Modell und den gewählten Denkaufwand fest; eine lediglich gespeicherte Auswahl wird nicht als abgeschlossener Wechsel angezeigt. **Einstellungen zur automatischen Übergabe** öffnet eine Kontenliste, deren Reihenfolge Sie per Ziehen ändern können. Für jedes Konto lassen sich Modell und Denkaufwand einstellen. Änderungen werden automatisch für die aktuelle Aufgabe gespeichert. Die Liste kennzeichnet Konten, die die Schreibzugriffsanforderungen der Aufgabe nicht erfüllen können; bei der Übergabe wird auch die Bildunterstützung berücksichtigt.

#### Konten und Fenster

Jede Kontokarte hat einen bearbeitbaren **Anzeigename** mit einer Stiftschaltfläche. Damit ändern Sie den Anzeigenamen, nicht die Anmeldeidentität. Native Codex-Fragen und unterstützte Nachrichten mit Frage und Auswahlliste bieten anklickbare Optionen und eine eigene Antwort. Ein Klick auf **×** in der Windows-Titelleiste blendet Prism in den Infobereich aus; verwenden Sie **Prism beenden** im Menü des Infobereichssymbols, um laufende Arbeiten zu stoppen und die App zu beenden.

#### Aufgaben organisieren

Klicken Sie mit der rechten Maustaste auf eine Aufgabe, um sie umzubenennen, anzuheften, als ungelesen zu markieren, zu archivieren, nach Projekt oder Abschnitt zu gruppieren, zu teilen, zu kopieren, abzuzweigen, ihren Ordner oder Gesprächsverlauf zu öffnen, ein weiteres Fenster zu öffnen oder sie zu löschen. Über **Archiviert und gelöscht** in der Seitenleiste können Sie ausgeblendete Aufgaben wiederherstellen. Beim Löschen einer Aufgabe bleiben ihr Arbeitsbereich und ihre Gesprächsdateien erhalten. Die Projektauswahl ändert, wo künftige Arbeiten ausgeführt werden; vorhandene Dateien bleiben in ihrem ursprünglichen Ordner. Beim Abzweigen werden neue CLI-Sitzungen gestartet und Gesprächsanhänge kopiert; die Option für einen separaten Arbeitsbereich beginnt mit einem leeren Ordner. Beim Teilen wird eine Vorschau eines lokalen Markdown-Dokuments zum Kopieren oder Speichern angezeigt; es entsteht kein gehosteter öffentlicher Link. Aufgabenänderungen werden zwischen geöffneten Fenstern synchronisiert.

#### Ansichten und Kontingent

Die obere Leiste enthält Ansichtseinstellungen sowie Schalter für das Ausführungsprotokoll am unteren Rand und die Konten-Seitenleiste. Ihr Zustand wird lokal gespeichert. Unter Konten fragt **Alle Konten prüfen** jedes konfigurierte Profil ab und zeigt das verfügbare Kontingent, Rücksetzzeitpunkte, Codex-Reset-Guthaben und deren Ablaufdaten an. Eine fehlgeschlagene Abfrage hält die Prüfung der übrigen Konten nicht auf.

#### Bilder

Fügen Sie Screenshots ein, ziehen Sie Bilder in den Eingabebereich oder verwenden Sie die Bildschaltfläche (bis zu fünf Bilder mit jeweils 10 MB). Codex erhält lokale Bilder; Claude erhält native Bildinhalte, wenn die Abonnementprüfungen erfolgreich sind. Die Ausführung mit Bildern bei Claude wurde noch nicht mit einem angemeldeten Konto überprüft. Grok verwendet direkte Bildinhalte, wenn das CLI diese Unterstützung meldet; andernfalls öffnet sein natives Werkzeug Read die angehängten Bilder. Dieser Weg wurde mit einem angemeldeten Abonnementkonto überprüft.

#### Nachrichten und Entwürfe

Senden Sie während der Ausführung weitere Nachrichten: Sie warten in ihrer Reihenfolge und können storniert werden. In den Einstellungen können Sie zwischen Enter und Ctrl/⌘+Enter sowie zwischen Warteschlange und direkter Steuerung wählen. Die direkte Steuerung nutzt den aktiven Turn von Codex; bei anderen Anbietern werden die Nachrichten in die Warteschlange gestellt. Bei fehlgeschlagenem oder unterbrochenem Senden werden nachfolgende Nachrichten zur Prüfung zurückgehalten. Entwürfe bleiben erhalten, wenn Sie in der geöffneten App zwischen Aufgaben wechseln.

#### Dateivorschauen

Öffnen Sie den Vorschaubereich oder klicken Sie auf einen Dateilink, um Bilder, PDFs, Markdown, Code und Text anzusehen. Textdateien können bearbeitet und gespeichert werden; vor dem Speichern wird auf externe Änderungen geprüft. HTML-Vorschauen zeigen eigenständige Seiten an; interaktive Projekte können ihre laufende HTTP-Adresse verwenden. Manche Websites verhindern die Einbettung. Der Aktivitätsbereich zeigt vom CLI bereitgestellte Zusammenfassungen der Überlegungen, Pläne und den Ausführungsstatus an, sofern diese verfügbar sind.

### Automatische Updates

1. **Nach Updates suchen** meldet „Update verfügbar“ oder „Bereits aktuell“. Dabei wird nichts heruntergeladen und kein Neustart ausgelöst.
2. **Herunterladen und vorbereiten** meldet nach abgeschlossener Vorbereitung „Das Update ist bereit“. Sie können die aktuelle Version weiterverwenden.
3. **Aktualisieren und neu starten** startet die App erst nach Ihrem Klick neu. Sobald die neue Version erfolgreich gestartet ist, erscheint einmalig „Auf vX.X.X aktualisiert“. Bei normalen Starts und beim Zurückkehren zu einer vorherigen Version wird diese Erfolgsmeldung nicht angezeigt.

**Nach Updates suchen** in der Seitenleiste orientiert sich an veröffentlichten stabilen [GitHub Releases](https://github.com/shixi-11/prism-desk/releases). Vor dem Download werden die installierte Version, die verfügbare Version und die Änderungshinweise angezeigt. Wählen Sie **Später**, um Ihre aktuelle Version weiterzuverwenden. Gewöhnliche Commits im Hauptbranch lösen keine Update-Hinweise aus. Die automatische Suche ist standardmäßig aktiviert: Prism prüft nach dem Start und alle vier Stunden. Ein dauerhaft sichtbarer blauer Punkt neben Nach Updates suchen und ein Update-Symbol in der oberen Leiste zeigen eine verfügbare Version an. Die Suche lädt nichts herunter, installiert nichts und startet die App nicht neu. Wählen Sie **Herunterladen und vorbereiten** und anschließend **Aktualisieren und neu starten**, wenn es Ihnen passt. Der Punkt bleibt sichtbar, bis die installierte Revision aktuell ist. Die Entwürfe jedes Fensters werden vor dem Neustart gespeichert; Aufgaben, Nachrichten in der Warteschlange, Kontovorgänge, Bearbeitungsdialoge und Vorschauen blockieren den Neustart, bis sie abgeschlossen oder geschlossen sind.

Updates behalten dieselbe Kontokonfiguration, denselben Aufgabenspeicher und dasselbe Benutzerdatenverzeichnis bei. Der ursprüngliche Checkout und die vorherige Installation bleiben verfügbar. Ein fehlgeschlagener Download oder Build lässt die laufende Version unverändert; wenn die neue App ihren Start nicht abschließen kann, stellt das erneute Öffnen von Prism die vorherige Version wieder her. Lokale Änderungen am Quellcode blockieren Updates, und die Vorbereitung erfordert mindestens 2 GB freien Speicherplatz. Git muss installiert bleiben; der Desktop-Build enthält die Node-Laufzeit und npm für künftige Builds. Bei Installationen aus der Zeit vor dieser Update-Funktion müssen die Änderungen einmal manuell abgerufen und die Anwendung mit den oben stehenden Installationsbefehlen neu gebaut werden.

### Tag und Nacht

Wechseln Sie über die obere Leiste zwischen dem hellen und dem dunklen Design.

| Tag | Nacht |
| --- | --- |
| ![Illustration des Tagdesigns](src/assets/desert-day.jpg) | ![Illustration des Nachtdesigns](src/assets/desert-night.jpg) |

*Von der App verwendete Designillustrationen.*

### Konfiguration

Die meisten Benutzer können ihre Konten unter **Konten → Konto verbinden** verbinden. Die folgende Konfigurationsdatei ist eine Alternative für fortgeschrittene Benutzer. Sichern Sie eine vorhandene Datei, bevor Sie das Beispiel kopieren.

```powershell
New-Item -ItemType Directory -Force .local
Copy-Item config.example.json .local/config.json
```

Passen Sie `.local/config.json` an Ihren Computer an. Sie können `PRISM_CONFIG` auch auf einen absoluten Pfad zu einer Konfigurationsdatei setzen.

Eine Konfiguration mit einem Konto sieht so aus. Ersetzen Sie das beispielhafte Anmeldeverzeichnis durch Ihr eigenes und wählen Sie ein Modell, das für Ihr Konto verfügbar ist. Weitere Einträge in `profiles` fügen zusätzliche Ausführungskonten hinzu.

```json
{
  "profiles": [
    {
      "id": "codex-personal-1",
      "provider": "Codex",
      "name": "Personal 1",
      "home": "C:/PrismAccounts/codex-personal-1",
      "executable": "codex.exe",
      "model": "gpt-5.6-sol",
      "write": true
    }
  ]
}
```

| Feld | Zweck |
| --- | --- |
| `profiles` | Ausführungskonten: ID, Anbieter, Anzeigename, Anmeldeverzeichnis, ausführbare Datei, Modell und Schreibberechtigung |
| `storageRoot` | Dauerhafter Speicherort für Aufgabenprotokolle |
| `assistant.path` | Optionales Assistentenverzeichnis mit `SKILL.md` |
| `assistant.instructions` | Optionale, aufgabenübergreifende Anweisungen |
| `skillsPath` | Gemeinsames Skills-Verzeichnis |
| `apps` | Zuordnung von Anwendungsnamen zu Pfaden ausführbarer Dateien oder Einstiegsdateien |

Verwenden Sie absolute Pfade für lokale Ressourcen und ein separates Anmeldeverzeichnis für jedes Konto. Behalten Sie Profil-IDs bei: Vorhandene Aufgaben verwenden sie zur Identifizierung der Konten. Die standardmäßige Profilstruktur ist in [electron/config.cjs](electron/config.cjs) definiert.

Aufgaben werden im Benutzerdatenverzeichnis der Anwendung gespeichert, sofern `storageRoot` nicht festgelegt ist. Anmeldedaten bleiben im eigenen Verzeichnis des Anbieters. Lokale Konfiguration, Aufgabenprotokolle und Logs sind von Git ausgeschlossen.

### Datei- und Befehlsberechtigungen

Wählen Sie im Eingabebereich **Nur lesen**, **Projekt bearbeiten** oder **Vollzugriff**. Vollzugriff ist für Codex, Claude und Grok verfügbar: Er erlaubt den Zugriff auf Dateien außerhalb des Projekts und genehmigt die Werkzeugausführung automatisch, im Rahmen der Berechtigungen des Betriebssystems. Änderungen während einer Ausführung werden für den nächsten Durchlauf vorgemerkt. Neue Installationen verwenden für unterstützte Konten standardmäßig Projekt bearbeiten. Wählen Sie **Als Standard für neue Aufgaben festlegen**, um eine Voreinstellung zu speichern; vorhandene Aufgaben behalten ihre eigenen Berechtigungen. Adapter mit reinem Lesezugriff bleiben schreibgeschützt.

### Konten und lokale Werkzeuge

Die Adapter für Codex, Claude und Grok unterstützen Aufgaben zur Dateibearbeitung. Grok hält sich an die gewählten Aufgabenberechtigungen: Nur lesen deaktiviert Bearbeitungs- und Shell-Werkzeuge; Projekt bearbeiten verwendet das Arbeitsbereichsprofil des CLI und Bestätigungen für Operationen; Vollzugriff erlaubt die Werkzeugausführung. Vorhandene Profile mit `write: false` bleiben schreibgeschützt, bis der Schreibzugriff ausdrücklich aktiviert wird. Die verfügbaren Modelle hängen vom installierten CLI und dem ausgewählten Konto ab.

Der Kontingentbereich zeigt die vom Anbieter zurückgegebenen Informationen an. Bei gültigen vereinheitlichten Grok-Zeiträumen werden ausgelassene Nullverbrauchswerte entsprechend der Interpretation des offiziellen Clients behandelt; leere, fehlerhafte oder abgelaufene Antworten bleiben als unbekannt eingestuft. Claude-Abfragen werden nach einem vorübergehenden Verbindungsfehler oder einer fehlenden Nutzungsantwort einmal wiederholt, jedoch niemals nach einem Authentifizierungsfehler. Authentifizierungs- oder Netzwerkfehler lösen keinen Kontowechsel aus, als wäre das Kontingent erschöpft. Die automatische Übergabe setzt eine erkannte Antwort zur Kontingenterschöpfung und den Abschluss der vorherigen Ausführung voraus.

E-Mail-Adressen der Konten sind standardmäßig maskiert; mit der Augenschaltfläche können Sie sie ein- oder ausblenden. Der Abfrageverlauf bleibt auf diesem Gerät. Nach einem Neustart behalten die Einträge ihr ursprüngliches Datum und ihre ursprüngliche Uhrzeit und werden zur Aktualisierung markiert. Historische Abfragewerte autorisieren niemals eine Ausführung oder die Nutzung von Reset-Guthaben.

Prism weicht nicht auf eine Abrechnung per API-Schlüssel aus und kauft keine Guthaben. Zusätzliche Nutzung, automatisches Aufladen und Kontingentabfragen sind für alle Konten rein informativ und blockieren die Ausführung nicht. Der Anbieter entscheidet über die Verfügbarkeit; Ausgabenlimits verwalten Nutzer auf dessen Plattform. Die Nutzung eines vorhandenen Codex-Reset-Guthabens erfordert eine separate Bestätigung für das ausgewählte Konto. Ein Zurücksetzungsguthaben kann auch während einer laufenden Aufgabe verwendet werden; die Aufgabe läuft weiter. Die Bestätigung und der Schutz vor doppelten Anfragen bleiben bestehen. Ein bereits beendeter Durchlauf wird nicht automatisch neu gestartet. Für eine inaktive Aufgabe lassen sich Konto, Modell und Denkaufwand auswählen, während eine andere Aufgabe läuft. Wechseln und Fortsetzen nutzt die bestehende Warteschlange und unterbricht die laufende Aufgabe nicht. Die zusätzliche Nutzung von Claude wird nur als Information angezeigt und blockiert die Ausführung in Prism nicht. Verfügbarkeit und Abrechnung richten sich nach den Einstellungen des Claude-Kontos oder der Organisation; dabei können Teamguthaben verbraucht oder zusätzliche Kosten verursacht werden.

Der runde Sendepfeil wird während der Aufgabe zur Stopptaste. Zusätzliche Anweisungen und die Warteschlange bleiben verfügbar, ohne Sprachsteuerung.

Assistentendateien und Skills können gemeinsam von mehreren Konten verwendet werden. MCP-Berechtigungen und Anwendungsverbindungen müssen für jede Ausführungsumgebung eingerichtet werden. Die Anwendungserkennung listet installierte Einstiegspunkte auf; die Überprüfungsfunktion prüft die unterstützten Operationen separat.

Unter **Gemeinsame Fähigkeiten** vergleicht **Gemeinsame Fähigkeiten prüfen → Lokale Quellen synchronisieren** die lokalen Skill-Einstiegsdateien und ihre Pfade mit dem letzten Synchronisierungsstand. System-Skills und hinzugefügte Ordner werden nach der Synchronisierung in den gemeinsamen Index aufgenommen. Unter **Quellen und Verbindungen** lässt sich mit **Skill-Referenzen verbinden** das Referenzmaterial einzelner Plugins einbinden. Der nächste Aufgabendurchlauf erhält den Index der Quellenverweise; die Originaldateien bleiben an ihrem bisherigen Speicherort.

Die Plugin-Liste zeigt die neueste erkannte Version aus jeder lokalen Cache-Quelle. Darunter können sich bereits deinstallierte Pakete befinden. Das bestätigt weder die neueste Online-Veröffentlichung noch eine erteilte Tool-Autorisierung. Plugins sollten zunächst in ihrer ursprünglichen Anwendung aktualisiert und anschließend erneut geprüft werden. Codex-MCP-Verbindungen müssen in der unabhängigen CLI des jeweiligen Kontos separat eingerichtet und überprüft werden. Die aktuellen Ausführungskanäle von Claude, Grok und Gemini aktivieren kein externes MCP; das Einbinden von Skill-Referenzen ändert diese Einschränkung nicht.

### Entwicklung

```powershell
npm test
npm run build
npm run build:desktop
```

Unit-Tests verwenden isolierte Kontotestdaten. Optionale Desktop-Tests und Tests mit echten CLI-Sitzungen sind in [scripts/README.md](scripts/README.md) beschrieben; Tests mit echten Sitzungen erfordern Testkonten und können Abonnementkontingent verbrauchen.

Fügen Sie einem Fehlerbericht die Versionen der App und des CLI, die Schritte zur Reproduktion und eine um sensible Angaben bereinigte Fehlermeldung bei. Entfernen Sie vor dem Veröffentlichen Anmeldedaten, Kontodetails und private Gesprächsinhalte.

### Veröffentlichungsregeln für Mitwirkende

Lesen Sie vor dem Veröffentlichen [AGENTS.md](AGENTS.md) und [RELEASING.md](RELEASING.md). Jede Softwareveröffentlichung benötigt eine neue Version, genau ein unveränderliches Tag und vollständige Hinweise auf Englisch und in vereinfachtem Chinesisch. Führen Sie `npm run release:check` sowie die für die Änderung erforderlichen Prüfungen aus. Reine Dokumentationsänderungen erfordern keine neue Softwareveröffentlichung.

### Lizenz

[MIT](LICENSE). Prism Desk ist ein unabhängiges Projekt. Anbieternamen und Marken gehören ihren jeweiligen Inhabern.

Dateien können im Gespräch abgelegt oder über die Anhangsschaltfläche ausgewählt werden: maximal fünf pro Nachricht, 10 MB pro Bild und 50 MB pro anderer Datei. Dokumente behalten ihren ursprünglichen Inhalt und werden als lokale Dateiverweise an die gewählte CLI übergeben. Lesen und Vorschau hängen vom Format und den verfügbaren Werkzeugen ab. Aktiver Statustext erhält einen sanften Schimmer, der die Einstellung für reduzierte Bewegung berücksichtigt.

Die vorübergehende Anzeige „Denkt nach“ erscheint während eines aktiven Durchgangs, wenn keine Antwort, Werkzeugaktivität oder ausstehende Bestätigung angezeigt wird. Beim Stoppen oder Abschluss verschwindet sie, ohne auf Denktext der CLI angewiesen zu sein. Unter dem Gespräch bleibt keine dauerhafte Abschlussanzeige stehen.
