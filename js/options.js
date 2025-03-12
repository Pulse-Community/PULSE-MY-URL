// Funktion zum Anzeigen von Statusmeldungen
function showStatus(message, isSuccess) {
  const statusElement = document.getElementById('statusMessage');
  statusElement.textContent = message;
  statusElement.classList.remove('hidden', 'alert-success', 'alert-error');
  
  if (isSuccess) {
    statusElement.classList.add('alert', 'alert-success');
  } else {
    statusElement.classList.add('alert', 'alert-error');
  }
  
  // Animation hinzufügen
  statusElement.classList.add('animate-fade-in');
  statusElement.classList.remove('hidden');
  
  // Status nach 3 Sekunden ausblenden
  setTimeout(() => {
    // Ausblenden mit Animation
    statusElement.style.opacity = '0';
    statusElement.style.transition = 'opacity 0.3s ease-out';
    
    setTimeout(() => {
      statusElement.classList.add('hidden');
      statusElement.style.opacity = '1';
      statusElement.style.transition = '';
    }, 300);
  }, 3000);
}

// Funktion zum Laden der gespeicherten Einstellungen
async function loadSettings() {
  // Lade-Animation anzeigen
  const webhookUrlInput = document.getElementById('webhookUrl');
  webhookUrlInput.classList.add('animate-pulse', 'bg-neutral-100', 'dark:bg-neutral-800');
  webhookUrlInput.disabled = true;
  
  const includePageContentCheckbox = document.getElementById('includePageContent');
  includePageContentCheckbox.disabled = true;
  
  const storage = chrome.storage || browser.storage;
  const result = await storage.sync.get(['webhookUrl', 'lastCustomText', 'includePageContent']);
  
  // Lade-Animation entfernen
  webhookUrlInput.classList.remove('animate-pulse', 'bg-neutral-100', 'dark:bg-neutral-800');
  webhookUrlInput.disabled = false;
  includePageContentCheckbox.disabled = false;
  
  if (result.webhookUrl) {
    webhookUrlInput.value = result.webhookUrl;
  }
  
  if (result.includePageContent !== undefined) {
    includePageContentCheckbox.checked = result.includePageContent;
  }
  
  if (result.lastCustomText) {
    document.getElementById('testText').value = result.lastCustomText;
  }
}

// Funktion zum Speichern der Einstellungen
async function saveSettings() {
  // Button-Status aktualisieren
  const saveButton = document.getElementById('saveButton');
  const originalButtonText = saveButton.innerHTML;
  saveButton.disabled = true;
  saveButton.classList.add('btn-disabled');
  saveButton.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Speichern...
  `;
  
  const webhookUrl = document.getElementById('webhookUrl').value.trim();
  const includePageContent = document.getElementById('includePageContent').checked;
  
  if (!webhookUrl) {
    showStatus('Bitte geben Sie eine gültige Webhook-URL ein.', false);
    // Button zurücksetzen
    saveButton.disabled = false;
    saveButton.classList.remove('btn-disabled');
    saveButton.innerHTML = originalButtonText;
    return;
  }
  
  try {
    // URL validieren
    new URL(webhookUrl);
    
    // Einstellungen speichern
    const storage = chrome.storage || browser.storage;
    await storage.sync.set({
      webhookUrl: webhookUrl,
      includePageContent: includePageContent
    });
    
    // Benachrichtigung an den Background-Service-Worker senden
    const runtime = chrome.runtime || browser.runtime;
    runtime.sendMessage({ action: 'settingsUpdated' });
    
    // Erfolgsmeldung anzeigen
    showStatus('Einstellungen erfolgreich gespeichert!', true);
  } catch (error) {
    // Fehlermeldung anzeigen
    showStatus(`Fehler beim Speichern der Einstellungen: ${error.message}`, false);
  }
  
  // Button zurücksetzen
  saveButton.disabled = false;
  saveButton.classList.remove('btn-disabled');
  saveButton.innerHTML = originalButtonText;
}

// Funktion zum Testen des Webhooks
async function testWebhook() {
  const webhookUrl = document.getElementById('webhookUrl').value.trim();
  const testStatus = document.getElementById('testStatus');
  const testText = document.getElementById('testText').value.trim();
  const includePageContent = document.getElementById('includePageContent').checked;
  
  // Button-Status aktualisieren
  const testButton = document.getElementById('testButton');
  const originalButtonText = testButton.innerHTML;
  testButton.disabled = true;
  testButton.classList.add('btn-disabled');
  testButton.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-700 dark:text-neutral-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Testen...
  `;
  
  if (!webhookUrl) {
    showStatus('Bitte geben Sie zuerst eine Webhook-URL ein.', false);
    // Button zurücksetzen
    testButton.disabled = false;
    testButton.classList.remove('btn-disabled');
    testButton.innerHTML = originalButtonText;
    return;
  }
  
  try {
    // URL validieren
    new URL(webhookUrl);
    
    // Testdaten vorbereiten
    const testData = {
      url: 'https://example.com/test',
      text: testText || 'Dies ist eine Test-Nachricht von PULSE MY URL.'
    };
    
    // Wenn Seiteninhalt aktiviert ist, füge einen Beispielinhalt hinzu
    if (includePageContent) {
      testData.content = `# Beispiel-Markdown-Inhalt

Dies ist ein Beispiel für den extrahierten Seiteninhalt als Markdown.

## Überschrift 2

Ein Beispielabsatz mit **fett** und *kursiv* formatiertem Text.

- Listenpunkt 1
- Listenpunkt 2
- Listenpunkt 3

## Links

[Beispiel-Link](https://example.com)

## Bilder

![Beispielbild](https://example.com/image.jpg)
`;
    }
    
    // Webhook-Anfrage senden
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    // Antwort verarbeiten
    if (response.ok) {
      testStatus.innerHTML = `<span class="text-success-400 dark:text-success-400">✓ Test erfolgreich!</span>`;
      // Speichere den benutzerdefinierten Text für zukünftige Verwendung
      if (testText) {
        const storage = chrome.storage || browser.storage;
        await storage.sync.set({ lastCustomText: testText });
      }
    } else {
      const errorText = await response.text();
      testStatus.innerHTML = `<span class="text-danger-500 dark:text-danger-400">✗ Fehler: ${response.status} ${response.statusText}</span>`;
      console.error('Webhook-Test fehlgeschlagen:', errorText);
    }
  } catch (error) {
    testStatus.innerHTML = `<span class="text-danger-500 dark:text-danger-400">✗ Fehler: ${error.message}</span>`;
    console.error('Webhook-Test fehlgeschlagen:', error);
  }
  
  // Button zurücksetzen
  testButton.disabled = false;
  testButton.classList.remove('btn-disabled');
  testButton.innerHTML = originalButtonText;
}

// Dark Mode Toggle-Funktion
function setupThemeToggle() {
  const themeToggleBtn = document.getElementById('themeToggle');
  const htmlElement = document.documentElement;
  
  // Gespeicherten Theme-Modus abrufen
  chrome.storage.sync.get('darkMode', ({ darkMode }) => {
    // Wenn Dark Mode aktiviert ist oder System-Präferenz für Dark Mode
    if (darkMode || (darkMode === undefined && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  });
  
  // Theme-Toggle-Button Event-Listener
  themeToggleBtn.addEventListener('click', () => {
    const isDarkMode = htmlElement.classList.toggle('dark');
    chrome.storage.sync.set({ darkMode: isDarkMode });
    
    // Animation für den Button
    themeToggleBtn.classList.add('animate-pulse');
    setTimeout(() => {
      themeToggleBtn.classList.remove('animate-pulse');
    }, 300);
  });
}

// Event-Listener
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupThemeToggle();
});
document.getElementById('saveButton').addEventListener('click', saveSettings);
document.getElementById('testButton').addEventListener('click', testWebhook); 