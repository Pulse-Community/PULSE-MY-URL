// Popup-Script für PULSE MY URL
document.addEventListener('DOMContentLoaded', function() {
  const sendButton = document.getElementById('sendUrlButton');
  const optionsLink = document.getElementById('openOptions');
  const customTextInput = document.getElementById('customText');
  const statusElement = document.getElementById('statusMessage');

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
      // Webhook-URL aus den Einstellungen abrufen
      const storage = chrome.storage.sync;
      const result = await storage.get(['webhookUrl', 'lastCustomText', 'includePageContent']);
      const webhookUrl = result.webhookUrl;
      
      if (!webhookUrl) {
        showStatus('Keine Webhook-URL konfiguriert. Bitte in den Einstellungen festlegen.', false);
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
      
      // Benutzerdefinierten Text speichern
      await storage.set({lastCustomText: customText});
      
      let payload = {
        url: currentUrl,
        text: customText
      };
      
      // Wenn die Option aktiviert ist, Seiteninhalt als Markdown hinzufügen
      if (result.includePageContent) {
        try {
          const pageContent = await chrome.runtime.sendMessage({
            action: "getPageContent",
            tabId: tabs[0].id
          });
          
          if (pageContent && pageContent.content) {
            payload.content = pageContent.content;
          }
        } catch (error) {
          console.error('Fehler beim Abrufen des Seiteninhalts:', error);
        }
      }
      
      // Webhook-Anfrage senden
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        showStatus('URL erfolgreich gesendet!', true);
      } else {
        showStatus(`Fehler: ${response.status} ${response.statusText}`, false);
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