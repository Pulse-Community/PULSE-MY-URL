# PULSE MY URL 🚀

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.x-38B2AC?logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)
[![Pulse Community](https://img.shields.io/badge/Pulse_Community-⚡-blue)](https://steinberger.academy/pulse-community)

> Eine elegante Chrome-Erweiterung zum Senden von URLs und Seiteninhalten an konfigurierbare Webhooks - mit modernem Design und praktischen Funktionen für deinen Workflow!

## 🎯 Über dieses Projekt

Hey! 👋 Diese Chrome-Erweiterung ermöglicht es dir, mit einem Klick die aktuelle URL und optional den Seiteninhalt als Markdown an einen konfigurierbaren Webhook zu senden. Perfekt für Content-Sammlung, Recherche-Workflows oder die Integration mit deinen eigenen Tools und Diensten.

### 🌟 Entstanden in der Pulse Community

Dieses Projekt wurde während eines Pulse Community Calls entwickelt! Was als gemeinsames Coding-Projekt begann, hat sich zu einem vollwertigen Tool entwickelt, das nun allen zur Verfügung steht. Die Pulse Community ist ein Ort, an dem Entwickler zusammenkommen, um zu lernen, zu teilen und gemeinsam zu wachsen.

* 🔄 Kontinuierliche Verbesserung durch Community-Feedback
* 👥 Gemeinsame Entwicklung und Ideenaustausch
* 📚 Lerne mehr über moderne Webentwicklung und Browser-Extensions

[Werde Teil der Pulse Community!](https://steinberger.academy/pulse-community)

### Was macht dieses Projekt besonders?

* 💚 Modernes, minimalistisches Design mit anpassbarer grüner Farbpalette
* 🌓 Integrierter Dark Mode für angenehmes Arbeiten bei Tag und Nacht
* 📝 Markdown-Extraktion für strukturierte Inhaltsübermittlung
* 🔒 Datenschutzfreundlich - alle Daten bleiben in deinem Browser

## ✨ Hauptfunktionen

* 🔗 Senden der aktuellen Tab-URL an einen konfigurierbaren Webhook
* 📝 Optionaler benutzerdefinierter Text für Kontext oder Notizen
* 📄 Extraktion und Übermittlung von Seiteninhalten als formatiertes Markdown
* 🌓 Eleganter Dark Mode mit automatischer Systemerkennung
* 💾 Speicherung der letzten benutzerdefinierten Texteingabe
* 🔔 Visuelle Statusmeldungen für erfolgreiche oder fehlgeschlagene Anfragen
* ⚙️ Einfache Konfiguration über eine übersichtliche Einstellungsseite
* 🧪 Integrierte Testfunktion für die Webhook-Verbindung

## 🚀 Los geht's!

### Installation der Erweiterung

1. **Lade das Repository herunter**:  
   ```
   git clone https://github.com/Pulse-Community/PULSE-MY-URL.git
   ```

2. **Installiere die Erweiterung in Chrome**:
   * Öffne Chrome und navigiere zu `chrome://extensions/`
   * Aktiviere den "Entwicklermodus" (oben rechts)
   * Klicke auf "Entpackte Erweiterung laden"
   * Wähle den Ordner mit dem heruntergeladenen Repository

3. **Konfiguriere deinen Webhook**:
   * Klicke auf das Erweiterungssymbol in der Symbolleiste
   * Öffne die Einstellungen über den Link unten
   * Gib deine Webhook-URL ein und speichere die Einstellungen

### Verwendung

1. **URL senden**:
   * Navigiere zur Webseite, deren URL du senden möchtest
   * Klicke auf das Erweiterungssymbol in der Symbolleiste
   * Füge optional einen benutzerdefinierten Text hinzu
   * Klicke auf "URL an Webhook senden"

2. **Seiteninhalt mitsenden**:
   * Aktiviere in den Einstellungen die Option "Seiteninhalt als Markdown mitsenden"
   * Der Inhalt der aktuellen Seite wird automatisch extrahiert und formatiert
   * Überschriften, Absätze, Listen, Links und Bilder werden strukturiert übermittelt

## 📖 Webhook-Format

Die Erweiterung sendet Daten im folgenden JSON-Format:

```json
{
  "url": "https://example.com/current-page",
  "text": "Dein optionaler benutzerdefinierter Text",
  "content": "# Extrahierter Markdown-Inhalt\n\nDer Seiteninhalt als formatiertes Markdown..."
}
```

* `url`: Die URL der aktuellen Seite (immer enthalten)
* `text`: Dein optionaler benutzerdefinierter Text (wenn angegeben)
* `content`: Der extrahierte Seiteninhalt als Markdown (wenn aktiviert)

## 🛠️ Technischer Stack

* **Frontend**: Vanilla JavaScript mit modernem ES6+
* **UI/Styling**: Tailwind CSS v3.x für elegantes, responsives Design
* **Speicherung**: Chrome Storage API für sichere Datenpersistenz
* **HTTP-Client**: Fetch API für zuverlässige Webhook-Kommunikation
* **Inhaltsextraktion**: Benutzerdefinierter Markdown-Parser für strukturierte Inhalte

## 💻 Browser-Kompatibilität

| Browser | Unterstützte Version |
| ------- | -------------------- |
| Chrome  | ≥ 88                 |
| Edge    | ≥ 88                 |
| Firefox | ≥ 86 (mit Firefox-Add-on-Manifest) |

## 🤝 Beitragen

Beiträge sind herzlich willkommen! So kannst du mitmachen:

1. Fork das Projekt
2. Erstelle deinen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert. Weitere Details findest du in der LICENSE-Datei.

## 📞 Support & Hilfe

Brauchst du Unterstützung?

* 📧 Erstelle ein GitHub Issue
* 💬 Kontaktiere den Entwickler direkt
* ⚡ Frage in der [Pulse Community](https://steinberger.academy/pulse-community)

---

<p align="center">Mit ❤️ entwickelt aus einem Community Call in der <a href="https://steinberger.academy/pulse-community">Pulse Community</a></p> 