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
  const includePageContentCheckbox = document.getElementById('includePageContent');
  const sendToAllWebhooksCheckbox = document.getElementById('sendToAllWebhooks');
  const clearTextAfterSendCheckbox = document.getElementById('clearTextAfterSend');
  includePageContentCheckbox.disabled = true;
  sendToAllWebhooksCheckbox.disabled = true;
  clearTextAfterSendCheckbox.disabled = true;
  
  const storage = chrome.storage || browser.storage;
  const result = await storage.sync.get(['webhooks', 'lastCustomText', 'includePageContent', 'sendToAllWebhooks', 'clearTextAfterSend', 'activeWebhookIndex']);
  
  // Lade-Animation entfernen
  includePageContentCheckbox.disabled = false;
  sendToAllWebhooksCheckbox.disabled = false;
  clearTextAfterSendCheckbox.disabled = false;
  
  // Webhooks laden
  const webhooks = result.webhooks || [];
  
  // Webhook-Liste leeren
  const webhookList = document.getElementById('webhookList');
  webhookList.innerHTML = '';
  
  // Webhooks hinzufügen
  if (webhooks.length > 0) {
    webhooks.forEach((webhook, index) => {
      addWebhookEntry(webhook.url, webhook.name, index);
    });
  } else {
    // Wenn keine Webhooks vorhanden sind, einen leeren hinzufügen
    addWebhookEntry('', '', 0);
  }
  
  // Webhook-Zähler aktualisieren
  updateWebhookCounter();
  
  // Test-Webhook-Dropdown aktualisieren
  updateTestWebhookDropdown(webhooks, result.activeWebhookIndex || 0);
  
  // Checkboxen aktualisieren
  if (result.includePageContent !== undefined) {
    includePageContentCheckbox.checked = result.includePageContent;
  }
  
  if (result.sendToAllWebhooks !== undefined) {
    sendToAllWebhooksCheckbox.checked = result.sendToAllWebhooks;
  } else {
    // Standardmäßig aktiviert
    sendToAllWebhooksCheckbox.checked = true;
  }
  
  if (result.clearTextAfterSend !== undefined) {
    clearTextAfterSendCheckbox.checked = result.clearTextAfterSend;
  } else {
    // Standardmäßig aktiviert
    clearTextAfterSendCheckbox.checked = true;
  }
  
  if (result.lastCustomText) {
    document.getElementById('testText').value = result.lastCustomText;
  }
}

// Funktion zum Hinzufügen eines Webhook-Eintrags
function addWebhookEntry(url = '', name = '', index = -1) {
  const webhookList = document.getElementById('webhookList');
  const template = document.getElementById('webhookEntryTemplate');
  const clone = document.importNode(template.content, true);
  
  const entry = clone.querySelector('.webhook-entry');
  const urlInput = clone.querySelector('.webhook-url');
  const nameInput = clone.querySelector('.webhook-name');
  const saveButton = clone.querySelector('.save-webhook-btn');
  const removeButton = clone.querySelector('.remove-webhook-btn');
  const statusElement = clone.querySelector('.webhook-status');
  
  // Werte setzen
  urlInput.value = url;
  nameInput.value = name;
  
  // Daten-Attribute für die Identifizierung setzen
  if (index >= 0) {
    entry.dataset.index = index;
  } else {
    // Neuer Eintrag, Index basierend auf der Anzahl der vorhandenen Einträge
    entry.dataset.index = document.querySelectorAll('.webhook-entry').length;
  }
  
  // Event-Listener für den Speichern-Button
  saveButton.addEventListener('click', async () => {
    const webhookUrl = urlInput.value.trim();
    const webhookName = nameInput.value.trim();
    
    if (!webhookUrl) {
      statusElement.textContent = 'Bitte geben Sie eine Webhook-URL ein.';
      statusElement.className = 'webhook-status mt-2 text-sm text-red-600 dark:text-red-400';
      return;
    }
    
    try {
      // URL validieren
      new URL(webhookUrl);
      
      // Alle Webhooks abrufen
      const webhooks = getWebhooksFromUI();
      
      // Einstellungen speichern
      const storage = chrome.storage || browser.storage;
      await storage.sync.set({
        webhooks: webhooks,
        // Für Abwärtskompatibilität die erste URL auch als webhookUrl speichern
        webhookUrl: webhooks.length > 0 ? webhooks[0].url : ''
      });
      
      // Benachrichtigung an den Background-Service-Worker senden
      const runtime = chrome.runtime || browser.runtime;
      runtime.sendMessage({ action: 'settingsUpdated' });
      
      // Visuelles Feedback im Eintrag
      entry.classList.add('border-green-300', 'dark:border-green-700', 'bg-green-50', 'dark:bg-green-900/20');
      setTimeout(() => {
        entry.classList.remove('border-green-300', 'dark:border-green-700', 'bg-green-50', 'dark:bg-green-900/20');
      }, 2000);
      
      // Erfolgsmeldung anzeigen
      statusElement.textContent = 'Webhook erfolgreich gespeichert!';
      statusElement.className = 'webhook-status mt-2 text-sm text-green-600 dark:text-green-400';
      
      // Test-Webhook-Dropdown aktualisieren
      updateTestWebhookDropdown(webhooks);
      
    } catch (error) {
      // Visuelles Feedback im Eintrag
      entry.classList.add('border-red-300', 'dark:border-red-700', 'bg-red-50', 'dark:bg-red-900/20');
      setTimeout(() => {
        entry.classList.remove('border-red-300', 'dark:border-red-700', 'bg-red-50', 'dark:bg-red-900/20');
      }, 2000);
      
      // Fehlermeldung anzeigen
      statusElement.textContent = `Fehler: ${error.message}`;
      statusElement.className = 'webhook-status mt-2 text-sm text-red-600 dark:text-red-400';
    }
  });
  
  // Event-Listener für den Entfernen-Button
  removeButton.addEventListener('click', async () => {
    // Wenn es der letzte Webhook ist, nicht entfernen, sondern leeren
    if (document.querySelectorAll('.webhook-entry').length <= 1) {
      urlInput.value = '';
      nameInput.value = '';
      showStatus('Mindestens ein Webhook muss konfiguriert sein. Eintrag wurde geleert.', false);
      
      // Automatisch speichern
      const webhooks = getWebhooksFromUI();
      const storage = chrome.storage || browser.storage;
      await storage.sync.set({
        webhooks: webhooks,
        webhookUrl: webhooks.length > 0 ? webhooks[0].url : ''
      });
      
      // Benachrichtigung an den Background-Service-Worker senden
      const runtime = chrome.runtime || browser.runtime;
      runtime.sendMessage({ action: 'settingsUpdated' });
    } else {
      // Animation hinzufügen
      entry.classList.add('animate-fade-out');
      
      // Element nach der Animation entfernen oder nach einem Timeout, falls die Animation nicht ausgelöst wird
      const animationTimeout = setTimeout(async () => {
        entry.remove();
        updateWebhookCounter();
        updateTestWebhookDropdown(getWebhooksFromUI());
        
        // Automatisch speichern
        const webhooks = getWebhooksFromUI();
        const storage = chrome.storage || browser.storage;
        await storage.sync.set({
          webhooks: webhooks,
          webhookUrl: webhooks.length > 0 ? webhooks[0].url : ''
        });
        
        // Benachrichtigung an den Background-Service-Worker senden
        const runtime = chrome.runtime || browser.runtime;
        runtime.sendMessage({ action: 'settingsUpdated' });
        
        // Erfolgsmeldung anzeigen
        showStatus('Webhook erfolgreich entfernt und Einstellungen gespeichert!', true);
      }, 400); // Timeout entspricht der Animationsdauer
      
      entry.addEventListener('animationend', async () => {
        clearTimeout(animationTimeout);
        entry.remove();
        updateWebhookCounter();
        updateTestWebhookDropdown(getWebhooksFromUI());
        
        // Automatisch speichern
        const webhooks = getWebhooksFromUI();
        const storage = chrome.storage || browser.storage;
        await storage.sync.set({
          webhooks: webhooks,
          webhookUrl: webhooks.length > 0 ? webhooks[0].url : ''
        });
        
        // Benachrichtigung an den Background-Service-Worker senden
        const runtime = chrome.runtime || browser.runtime;
        runtime.sendMessage({ action: 'settingsUpdated' });
        
        // Erfolgsmeldung anzeigen
        showStatus('Webhook erfolgreich entfernt und Einstellungen gespeichert!', true);
      }, { once: true });
    }
  });
  
  // Eintrag zur Liste hinzufügen
  webhookList.appendChild(clone);
  
  // Animation hinzufügen
  entry.classList.add('animate-fade-in', 'animate-slide-up');
  
  // Webhook-Zähler aktualisieren
  updateWebhookCounter();
  
  // Test-Webhook-Dropdown aktualisieren
  updateTestWebhookDropdown(getWebhooksFromUI());
  
  // Fokus auf das URL-Eingabefeld setzen, wenn es leer ist
  if (!url) {
    setTimeout(() => urlInput.focus(), 100);
  }
}

// Funktion zum Aktualisieren des Webhook-Zählers
function updateWebhookCounter() {
  const count = document.querySelectorAll('.webhook-entry').length;
  const webhookCount = document.getElementById('webhookCount');
  webhookCount.textContent = count;
}

// Funktion zum Aktualisieren des Test-Webhook-Dropdowns
function updateTestWebhookDropdown(webhooks, activeIndex = 0) {
  const select = document.getElementById('testWebhookSelect');
  select.innerHTML = '';
  
  // Standardoption
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Bitte wählen Sie einen Webhook';
  select.appendChild(defaultOption);
  
  // Webhook-Optionen
  webhooks.forEach((webhook, index) => {
    if (webhook.url) {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = webhook.name || webhook.url;
      select.appendChild(option);
    }
  });
  
  // Aktiven Webhook auswählen
  if (webhooks.length > 0 && webhooks[activeIndex] && webhooks[activeIndex].url) {
    select.value = activeIndex;
  }
}

// Funktion zum Abrufen der Webhooks aus der UI
function getWebhooksFromUI() {
  const entries = document.querySelectorAll('.webhook-entry');
  const webhooks = [];
  
  entries.forEach(entry => {
    const urlInput = entry.querySelector('.webhook-url');
    const nameInput = entry.querySelector('.webhook-name');
    const url = urlInput.value.trim();
    const name = nameInput.value.trim();
    
    if (url) {
      webhooks.push({ url, name });
    }
  });
  
  return webhooks;
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
  
  // Webhooks aus der UI abrufen
  const webhooks = getWebhooksFromUI();
  const includePageContent = document.getElementById('includePageContent').checked;
  const sendToAllWebhooks = document.getElementById('sendToAllWebhooks').checked;
  const clearTextAfterSend = document.getElementById('clearTextAfterSend').checked;
  
  if (webhooks.length === 0) {
    showStatus('Bitte geben Sie mindestens eine gültige Webhook-URL ein.', false);
    // Button zurücksetzen
    saveButton.disabled = false;
    saveButton.classList.remove('btn-disabled');
    saveButton.innerHTML = originalButtonText;
    return;
  }
  
  try {
    // URLs validieren
    for (const webhook of webhooks) {
      new URL(webhook.url);
    }
    
    // Aktiven Webhook-Index ermitteln (für das Test-Dropdown)
    const testSelect = document.getElementById('testWebhookSelect');
    const activeWebhookIndex = testSelect.value ? parseInt(testSelect.value) : 0;
    
    // Einstellungen speichern
    const storage = chrome.storage || browser.storage;
    await storage.sync.set({
      webhooks: webhooks,
      includePageContent: includePageContent,
      sendToAllWebhooks: sendToAllWebhooks,
      clearTextAfterSend: clearTextAfterSend,
      activeWebhookIndex: activeWebhookIndex,
      // Für Abwärtskompatibilität die erste URL auch als webhookUrl speichern
      webhookUrl: webhooks.length > 0 ? webhooks[0].url : ''
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

// Funktion zum Testen eines einzelnen Webhooks
async function testSingleWebhook(webhookUrl, entryElement = null, statusElement = null) {
  try {
    // URL validieren
    new URL(webhookUrl);
    
    // Testdaten vorbereiten
    const testText = document.getElementById('testText').value.trim();
    const includePageContent = document.getElementById('includePageContent').checked;
    
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
    
    // Status aktualisieren, wenn vorhanden
    if (statusElement) {
      statusElement.textContent = "Teste Webhook...";
      statusElement.className = "webhook-status mt-2 text-sm text-neutral-500 dark:text-neutral-400";
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
      if (entryElement) {
        // Visuelles Feedback im Eintrag
        entryElement.classList.add('border-green-300', 'dark:border-green-700', 'bg-green-50', 'dark:bg-green-900/20');
        setTimeout(() => {
          entryElement.classList.remove('border-green-300', 'dark:border-green-700', 'bg-green-50', 'dark:bg-green-900/20');
        }, 2000);
        
        if (statusElement) {
          statusElement.textContent = "Webhook erfolgreich getestet!";
          statusElement.className = "webhook-status mt-2 text-sm text-green-600 dark:text-green-400";
        }
      } else {
        // Feedback im Teststatus
        const testStatus = document.getElementById('testStatus');
        testStatus.innerHTML = `<span class="text-green-600 dark:text-green-400">✓ Test erfolgreich!</span>`;
      }
      
      // Speichere den benutzerdefinierten Text für zukünftige Verwendung
      if (testText) {
        const storage = chrome.storage || browser.storage;
        await storage.sync.set({ lastCustomText: testText });
      }
      
      return true;
    } else {
      const errorText = await response.text();
      
      if (entryElement) {
        // Visuelles Feedback im Eintrag
        entryElement.classList.add('border-red-300', 'dark:border-red-700', 'bg-red-50', 'dark:bg-red-900/20');
        setTimeout(() => {
          entryElement.classList.remove('border-red-300', 'dark:border-red-700', 'bg-red-50', 'dark:bg-red-900/20');
        }, 2000);
        
        if (statusElement) {
          statusElement.textContent = `Fehler: ${response.status} ${response.statusText}`;
          statusElement.className = "webhook-status mt-2 text-sm text-red-600 dark:text-red-400";
        } else {
          showStatus(`Webhook-Test fehlgeschlagen: ${response.status} ${response.statusText}`, false);
        }
      } else {
        // Feedback im Teststatus
        const testStatus = document.getElementById('testStatus');
        testStatus.innerHTML = `<span class="text-red-600 dark:text-red-400">✗ Fehler: ${response.status} ${response.statusText}</span>`;
      }
      
      console.error('Webhook-Test fehlgeschlagen:', errorText);
      return false;
    }
  } catch (error) {
    if (entryElement) {
      // Visuelles Feedback im Eintrag
      entryElement.classList.add('border-red-300', 'dark:border-red-700', 'bg-red-50', 'dark:bg-red-900/20');
      setTimeout(() => {
        entryElement.classList.remove('border-red-300', 'dark:border-red-700', 'bg-red-50', 'dark:bg-red-900/20');
      }, 2000);
      
      if (statusElement) {
        statusElement.textContent = `Fehler: ${error.message}`;
        statusElement.className = "webhook-status mt-2 text-sm text-red-600 dark:text-red-400";
      } else {
        showStatus(`Webhook-Test fehlgeschlagen: ${error.message}`, false);
      }
    } else {
      // Feedback im Teststatus
      const testStatus = document.getElementById('testStatus');
      testStatus.innerHTML = `<span class="text-red-600 dark:text-red-400">✗ Fehler: ${error.message}</span>`;
    }
    
    console.error('Webhook-Test fehlgeschlagen:', error);
    return false;
  }
}

// Funktion zum Testen des ausgewählten Webhooks
async function testWebhook() {
  const testSelect = document.getElementById('testWebhookSelect');
  const selectedIndex = testSelect.value;
  const testStatus = document.getElementById('testStatus');
  const testText = document.getElementById('testText');
  
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
  
  if (!selectedIndex) {
    showStatus('Bitte wählen Sie einen Webhook zum Testen aus.', false);
    // Button zurücksetzen
    testButton.disabled = false;
    testButton.classList.remove('btn-disabled');
    testButton.innerHTML = originalButtonText;
    return;
  }
  
  const webhooks = getWebhooksFromUI();
  const webhook = webhooks[selectedIndex];
  
  if (!webhook || !webhook.url) {
    showStatus('Der ausgewählte Webhook ist nicht gültig.', false);
    // Button zurücksetzen
    testButton.disabled = false;
    testButton.classList.remove('btn-disabled');
    testButton.innerHTML = originalButtonText;
    return;
  }
  
  const success = await testSingleWebhook(webhook.url);
  
  // Wenn der Test erfolgreich war und die Option zum Leeren des Textfelds aktiviert ist
  if (success && document.getElementById('clearTextAfterSend').checked) {
    testText.value = '';
    
    // Auch den gespeicherten Text löschen
    const storage = chrome.storage || browser.storage;
    await storage.sync.remove('lastCustomText');
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
  
  // Event-Listener für den Hinzufügen-Button
  document.getElementById('addWebhookButton').addEventListener('click', () => {
    addWebhookEntry();
  });
});

document.getElementById('saveButton').addEventListener('click', saveSettings);
document.getElementById('testButton').addEventListener('click', testWebhook); 