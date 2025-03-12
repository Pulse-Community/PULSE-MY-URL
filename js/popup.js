// Popup-Script für PULSE MY URL
document.addEventListener('DOMContentLoaded', function() {
  const sendButton = document.getElementById('sendUrlButton');
  const optionsLink = document.getElementById('openOptions');
  const customTextInput = document.getElementById('customText');
  const statusElement = document.getElementById('statusMessage');
  
  // Webhook-Auswahl-Element erstellen
  createWebhookSelector();

  // Aktuelle URL anzeigen
  displayCurrentUrl();
  
  // Gespeicherten benutzerdefinierten Text laden
  loadSavedCustomText();
  
  // Theme-Toggle einrichten
  setupThemeToggle();

  // Event-Listener für den Senden-Button
  sendButton.addEventListener('click', sendUrlToWebhook);
  
  // Event-Listener für den Options-Link
  optionsLink.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  /**
   * Zeigt eine Statusmeldung an
   * @param {string} message - Die anzuzeigende Nachricht
   * @param {boolean} isSuccess - Ob es eine Erfolgsmeldung ist
   */
  function showStatus(message, isSuccess = true) {
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
    
    // Nach 3 Sekunden ausblenden
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
  
  /**
   * Erstellt das Webhook-Auswahl-Element
   */
  async function createWebhookSelector() {
    try {
      // Einstellungen abrufen
      const storage = chrome.storage.sync;
      const result = await storage.get(['webhooks', 'webhookUrl', 'sendToAllWebhooks', 'activeWebhookIndex']);
      
      let webhooks = result.webhooks || [];
      
      // Für Abwärtskompatibilität: Wenn keine Webhooks, aber eine webhookUrl vorhanden ist
      if (webhooks.length === 0 && result.webhookUrl) {
        webhooks = [{ url: result.webhookUrl, name: 'Standard-Webhook' }];
      }
      
      // Wenn keine Webhooks konfiguriert sind oder nur einer, keine Auswahl anzeigen
      if (webhooks.length <= 1 || result.sendToAllWebhooks) {
        return;
      }
      
      // Webhook-Auswahl-Container erstellen
      const container = document.createElement('div');
      container.className = 'mb-4';
      container.id = 'webhookSelectorContainer';
      
      const label = document.createElement('div');
      label.className = 'flex items-center justify-between mb-2';
      label.innerHTML = `
        <span class="text-sm font-medium text-neutral-600 dark:text-neutral-400">Webhook auswählen</span>
      `;
      
      const select = document.createElement('select');
      select.id = 'webhookSelector';
      select.className = 'input text-sm';
      
      // Option für "An alle senden"
      const allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = 'An alle Webhooks senden';
      select.appendChild(allOption);
      
      // Optionen für jeden Webhook
      webhooks.forEach((webhook, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = webhook.name || webhook.url;
        select.appendChild(option);
      });
      
      // Aktiven Webhook auswählen
      const activeIndex = result.activeWebhookIndex || 0;
      if (activeIndex >= 0 && activeIndex < webhooks.length) {
        select.value = activeIndex;
      }
      
      container.appendChild(label);
      container.appendChild(select);
      
      // Container einfügen vor dem Senden-Button
      const customTextContainer = document.querySelector('#customText').parentNode;
      customTextContainer.parentNode.insertBefore(container, customTextContainer.nextSibling);
    } catch (error) {
      console.error('Fehler beim Erstellen der Webhook-Auswahl:', error);
    }
  }

  /**
   * Sendet die aktuelle URL an den Webhook
   */
  async function sendUrlToWebhook() {
    // Button-Status aktualisieren
    const originalButtonText = sendButton.innerHTML;
    sendButton.disabled = true;
    sendButton.classList.add('btn-disabled');
    sendButton.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Senden...
    `;
    
    try {
      // Webhook-Einstellungen aus den Einstellungen abrufen
      const storage = chrome.storage.sync;
      const result = await storage.get(['webhooks', 'webhookUrl', 'lastCustomText', 'includePageContent', 'sendToAllWebhooks', 'clearTextAfterSend']);
      
      let webhooks = result.webhooks || [];
      
      // Für Abwärtskompatibilität: Wenn keine Webhooks, aber eine webhookUrl vorhanden ist
      if (webhooks.length === 0 && result.webhookUrl) {
        webhooks = [{ url: result.webhookUrl, name: 'Standard-Webhook' }];
      }
      
      if (webhooks.length === 0) {
        showStatus('Keine Webhooks konfiguriert. Bitte in den Einstellungen festlegen.', false);
        // Button zurücksetzen
        sendButton.disabled = false;
        sendButton.classList.remove('btn-disabled');
        sendButton.innerHTML = originalButtonText;
        return;
      }
      
      // Aktuelle Tab-URL abrufen
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs.length === 0) {
        showStatus('Keine aktive Tab-URL gefunden.', false);
        // Button zurücksetzen
        sendButton.disabled = false;
        sendButton.classList.remove('btn-disabled');
        sendButton.innerHTML = originalButtonText;
        return;
      }
      
      const currentUrl = tabs[0].url;
      const customText = customTextInput.value || result.lastCustomText || '';
      
      // Benutzerdefinierten Text speichern, wenn er nicht nach dem Senden gelöscht werden soll
      if (!result.clearTextAfterSend) {
        await storage.set({lastCustomText: customText});
      }
      
      // Bestimmen, welcher Webhook verwendet werden soll
      let webhookIndex = null; // null = Standard/Alle
      
      // Wenn Webhook-Auswahl vorhanden ist und nicht "An alle senden" ausgewählt ist
      const webhookSelector = document.getElementById('webhookSelector');
      if (webhookSelector && webhookSelector.value !== 'all') {
        webhookIndex = parseInt(webhookSelector.value);
      }
      
      // Anfrage an den Background-Service-Worker senden
      const response = await chrome.runtime.sendMessage({
        action: "sendUrl",
        url: currentUrl,
        text: customText,
        tabId: tabs[0].id,
        webhookIndex: webhookIndex
      });
      
      if (response.success) {
        showStatus(response.message || 'URL erfolgreich gesendet!', true);
        
        // Wenn der Text nach dem Senden gelöscht werden soll
        if (result.clearTextAfterSend && customText) {
          customTextInput.value = '';
        }
      } else {
        showStatus(response.error || 'Fehler beim Senden der URL', false);
      }
    } catch (error) {
      console.error('Fehler beim Senden der URL:', error);
      showStatus(`Fehler: ${error.message}`, false);
    } finally {
      // Button-Status zurücksetzen
      sendButton.disabled = false;
      sendButton.classList.remove('btn-disabled');
      sendButton.innerHTML = originalButtonText;
    }
  }

  /**
   * Zeigt die aktuelle URL an
   */
  async function displayCurrentUrl() {
    const urlDisplay = document.getElementById('currentUrl');
    
    try {
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs.length > 0) {
        const currentUrl = tabs[0].url;
        urlDisplay.textContent = currentUrl;
        urlDisplay.title = currentUrl;
      } else {
        urlDisplay.textContent = 'Keine URL gefunden';
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der aktuellen URL:', error);
      urlDisplay.textContent = 'Fehler beim Abrufen der URL';
    }
  }

  /**
   * Lädt den gespeicherten benutzerdefinierten Text
   */
  async function loadSavedCustomText() {
    try {
      const result = await chrome.storage.sync.get(['lastCustomText']);
      if (result.lastCustomText) {
        customTextInput.value = result.lastCustomText;
      }
    } catch (error) {
      console.error('Fehler beim Laden des benutzerdefinierten Texts:', error);
    }
  }

  /**
   * Richtet den Theme-Toggle ein
   */
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
}); 