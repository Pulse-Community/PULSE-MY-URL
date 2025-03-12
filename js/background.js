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
    const result = await storage.get(['webhookUrl', 'lastCustomText', 'includePageContent', 'tempIncludePageContent']);
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
    
    // Wenn die Option aktiviert ist oder temporär aktiviert wurde, Seiteninhalt als Markdown hinzufügen
    if ((result.includePageContent || result.tempIncludePageContent) && tabId) {
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
        files: ['js/content.js']
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

/**
 * Zeigt eine Benachrichtigung über den Erfolg oder Misserfolg einer Aktion an
 * @param {boolean} success - Ob die Aktion erfolgreich war
 * @param {string} message - Die anzuzeigende Nachricht
 */
function showNotification(success, message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "showNotification",
        success: success,
        message: message
      });
    }
  });
}

/**
 * Verarbeitet einen Klick auf einen Kontextmenü-Eintrag
 * @param {Object} info - Informationen über den Klick
 * @param {Object} tab - Informationen über den Tab
 */
async function handleContextMenuClick(info, tab) {
  try {
    let customText = '';
    let includeContent = false;
    
    // Je nach Menüpunkt unterschiedliche Aktionen ausführen
    switch (info.menuItemId) {
      case 'pulse-send-url':
        // Einfach die URL senden
        break;
      case 'pulse-send-url-with-content':
        // URL mit Seiteninhalt senden
        includeContent = true;
        break;
      case 'pulse-send-url-with-selection':
        // URL mit ausgewähltem Text senden
        customText = info.selectionText || '';
        break;
    }
    
    // Temporär die Einstellung für includePageContent setzen, wenn nötig
    if (includeContent) {
      await chrome.storage.sync.set({ 'tempIncludePageContent': true });
    }
    
    // URL senden
    const result = await sendUrlToWebhook(tab.url, customText, tab.id);
    
    // Temporäre Einstellung zurücksetzen
    if (includeContent) {
      await chrome.storage.sync.remove('tempIncludePageContent');
    }
    
    // Benachrichtigung anzeigen
    if (result.success) {
      showNotification(true, 'URL erfolgreich gesendet!');
    } else {
      showNotification(false, `Fehler: ${result.error}`);
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung des Kontextmenü-Klicks:', error);
    showNotification(false, `Fehler: ${error.message}`);
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

// Kontextmenüs erstellen
function createContextMenus() {
  // Bestehende Menüs löschen
  chrome.contextMenus.removeAll();
  
  // Hauptmenü erstellen
  chrome.contextMenus.create({
    id: 'pulse-main',
    title: 'PULSE MY URL',
    contexts: ['all']
  });
  
  // Untermenüs erstellen
  chrome.contextMenus.create({
    id: 'pulse-send-url',
    parentId: 'pulse-main',
    title: 'URL an Webhook senden',
    contexts: ['all']
  });
  
  chrome.contextMenus.create({
    id: 'pulse-send-url-with-content',
    parentId: 'pulse-main',
    title: 'URL mit Seiteninhalt senden',
    contexts: ['all']
  });
  
  chrome.contextMenus.create({
    id: 'pulse-send-url-with-selection',
    parentId: 'pulse-main',
    title: 'URL mit ausgewähltem Text senden',
    contexts: ['selection']
  });
}

// Listener für Kontextmenü-Klicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Initialisierung des Background-Scripts
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
  console.log('PULSE MY URL: Kontextmenüs erstellt');
});

console.log('PULSE MY URL: Background-Script initialisiert'); 