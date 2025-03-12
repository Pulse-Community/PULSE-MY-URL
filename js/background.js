// Background-Script für PULSE MY URL
// Dieses Script läuft im Hintergrund und verarbeitet Anfragen vom Popup und Content-Script

/**
 * Sendet eine URL an den konfigurierten Webhook
 * @param {string} url - Die zu sendende URL
 * @param {string} customText - Optionaler benutzerdefinierter Text
 * @returns {Promise<Object>} - Antwort vom Webhook
 */
async function sendUrlToWebhook(url, customText, tabId) {
  try {
    // Webhook-URL und Einstellungen aus dem Speicher abrufen
    const storage = chrome.storage.sync;
    const result = await storage.get(['webhookUrl', 'lastCustomText', 'includePageContent']);
    const webhookUrl = result.webhookUrl;
    
    if (!webhookUrl) {
      console.error('Keine Webhook-URL konfiguriert');
      return { success: false, error: 'Keine Webhook-URL konfiguriert' };
    }
    
    // Payload für den Webhook vorbereiten
    const payload = {
      url: url,
      text: customText || result.lastCustomText || ''
    };
    
    // Wenn die Option aktiviert ist, Seiteninhalt als Markdown hinzufügen
    if (result.includePageContent && tabId) {
      try {
        const content = await getPageContent(tabId);
        if (content) {
          payload.content = content;
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
      return { success: true };
    } else {
      return { 
        success: false, 
        error: `HTTP-Fehler: ${response.status} ${response.statusText}` 
      };
    }
  } catch (error) {
    console.error('Fehler beim Senden der URL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ruft den Inhalt einer Seite als Markdown ab
 * @param {number} tabId - Die ID des Tabs, von dem der Inhalt abgerufen werden soll
 * @returns {Promise<string>} - Der Seiteninhalt als Markdown
 */
async function getPageContent(tabId) {
  try {
    // Prüfen, ob das Content-Script bereits injiziert ist
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: "getPageContent" });
      if (response && response.content) {
        return response.content;
      }
    } catch (error) {
      // Content-Script ist möglicherweise nicht injiziert, wir injizieren es
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      // Erneut versuchen, den Inhalt abzurufen
      const response = await chrome.tabs.sendMessage(tabId, { action: "getPageContent" });
      if (response && response.content) {
        return response.content;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Fehler beim Abrufen des Seiteninhalts:', error);
    return null;
  }
}

// Listener für Nachrichten vom Popup oder Content-Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    getPageContent(request.tabId)
      .then(content => sendResponse({ content: content }))
      .catch(error => {
        console.error('Fehler beim Abrufen des Seiteninhalts:', error);
        sendResponse({ error: error.message });
      });
    return true; // Wichtig für asynchrone Antworten
  }
  
  if (request.action === "sendUrl") {
    const tabId = sender.tab ? sender.tab.id : (request.tabId || null);
    sendUrlToWebhook(request.url, request.text, tabId)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('Fehler beim Senden der URL:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Wichtig für asynchrone Antworten
  }
  
  return false;
});

// Initialisierung des Background-Scripts
console.log('PULSE MY URL: Background-Script initialisiert'); 