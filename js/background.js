// Background-Script für PULSE MY URL
// Dieses Script läuft im Hintergrund und verarbeitet Anfragen vom Popup und Content-Script

/**
 * Sendet eine URL an einen oder mehrere konfigurierte Webhooks
 * @param {string} url - Die zu sendende URL
 * @param {string} customText - Optionaler benutzerdefinierter Text
 * @param {number} tabId - Die ID des Tabs, von dem die URL gesendet wird
 * @param {number|null} specificWebhookIndex - Index eines spezifischen Webhooks oder null für alle/Standard
 * @returns {Promise<Object>} - Antwort vom Webhook
 */
async function sendUrlToWebhook(url, customText, tabId, specificWebhookIndex = null) {
  try {
    // Webhook-URLs und Einstellungen aus dem Speicher abrufen
    const storage = chrome.storage.sync;
    const result = await storage.get([
      'webhooks', 
      'webhookUrl', // Für Abwärtskompatibilität
      'lastCustomText', 
      'includePageContent', 
      'tempIncludePageContent',
      'sendToAllWebhooks',
      'clearTextAfterSend',
      'activeWebhookIndex'
    ]);
    
    // Webhooks aus den Einstellungen abrufen
    let webhooks = result.webhooks || [];
    
    // Für Abwärtskompatibilität: Wenn keine Webhooks, aber eine webhookUrl vorhanden ist
    if (webhooks.length === 0 && result.webhookUrl) {
      webhooks = [{ url: result.webhookUrl, name: 'Standard-Webhook' }];
    }
    
    if (webhooks.length === 0) {
      console.error('Keine Webhooks konfiguriert');
      return { success: false, error: 'Keine Webhooks konfiguriert' };
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
    
    // Bestimmen, welche Webhooks verwendet werden sollen
    let targetWebhooks = [];
    
    if (specificWebhookIndex !== null && webhooks[specificWebhookIndex]) {
      // Spezifischer Webhook wurde angefordert
      targetWebhooks = [webhooks[specificWebhookIndex]];
    } else if (result.sendToAllWebhooks) {
      // An alle Webhooks senden
      targetWebhooks = webhooks;
    } else {
      // Standard: Aktiven Webhook verwenden
      const activeIndex = result.activeWebhookIndex || 0;
      if (webhooks[activeIndex]) {
        targetWebhooks = [webhooks[activeIndex]];
      } else {
        targetWebhooks = [webhooks[0]]; // Fallback auf den ersten Webhook
      }
    }
    
    // Ergebnisse für jeden Webhook
    const results = [];
    
    // An jeden Ziel-Webhook senden
    for (const webhook of targetWebhooks) {
      try {
        // Webhook-Anfrage senden
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          results.push({ 
            success: true, 
            webhook: webhook.name || webhook.url 
          });
        } else {
          results.push({ 
            success: false, 
            webhook: webhook.name || webhook.url,
            error: `HTTP-Fehler: ${response.status} ${response.statusText}` 
          });
        }
      } catch (error) {
        results.push({ 
          success: false, 
          webhook: webhook.name || webhook.url,
          error: error.message 
        });
      }
    }
    
    // Wenn alle Anfragen erfolgreich waren und die Option zum Leeren des Textfelds aktiviert ist
    const allSuccessful = results.every(result => result.success);
    if (allSuccessful && customText && result.clearTextAfterSend) {
      // Gespeicherten Text löschen
      await storage.remove('lastCustomText');
    }
    
    // Gesamtergebnis bestimmen
    const allFailed = results.every(result => !result.success);
    
    if (allSuccessful) {
      return { 
        success: true,
        results: results,
        message: targetWebhooks.length > 1 
          ? `URL an ${results.length} Webhooks gesendet` 
          : 'URL erfolgreich gesendet',
        textCleared: allSuccessful && customText && result.clearTextAfterSend
      };
    } else if (allFailed) {
      return { 
        success: false, 
        results: results,
        error: targetWebhooks.length > 1 
          ? 'Fehler beim Senden an alle Webhooks' 
          : `Fehler: ${results[0].error}`
      };
    } else {
      // Teilweise erfolgreich
      return { 
        success: true, 
        partial: true,
        results: results,
        message: `URL an ${results.filter(r => r.success).length} von ${results.length} Webhooks gesendet`,
        textCleared: allSuccessful && customText && result.clearTextAfterSend
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
    let webhookIndex = null;
    
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
      default:
        // Prüfen, ob es ein spezifischer Webhook ist
        if (info.menuItemId.startsWith('pulse-webhook-')) {
          webhookIndex = parseInt(info.menuItemId.replace('pulse-webhook-', ''));
        }
        break;
    }
    
    // Temporär die Einstellung für includePageContent setzen, wenn nötig
    if (includeContent) {
      await chrome.storage.sync.set({ 'tempIncludePageContent': true });
    }
    
    // URL senden
    const result = await sendUrlToWebhook(tab.url, customText, tab.id, webhookIndex);
    
    // Temporäre Einstellung zurücksetzen
    if (includeContent) {
      await chrome.storage.sync.remove('tempIncludePageContent');
    }
    
    // Benachrichtigung anzeigen
    if (result.success) {
      showNotification(true, result.message || 'URL erfolgreich gesendet!');
    } else {
      showNotification(false, result.error || 'Fehler beim Senden der URL');
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
    const webhookIndex = request.webhookIndex !== undefined ? request.webhookIndex : null;
    
    sendUrlToWebhook(request.url, request.text, tabId, webhookIndex)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('Fehler beim Senden der URL:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Wichtig für asynchrone Antworten
  }
  
  if (request.action === "settingsUpdated") {
    // Kontextmenüs neu erstellen, wenn die Einstellungen aktualisiert wurden
    createContextMenus();
    sendResponse({ success: true });
    return true;
  }
  
  return false;
});

// Kontextmenüs erstellen
async function createContextMenus() {
  try {
    // Bestehende Menüs löschen
    await chrome.contextMenus.removeAll();
    
    // Webhooks aus den Einstellungen abrufen
    const storage = chrome.storage.sync;
    const result = await storage.get(['webhooks', 'webhookUrl', 'sendToAllWebhooks']);
    
    let webhooks = result.webhooks || [];
    
    // Für Abwärtskompatibilität: Wenn keine Webhooks, aber eine webhookUrl vorhanden ist
    if (webhooks.length === 0 && result.webhookUrl) {
      webhooks = [{ url: result.webhookUrl, name: 'Standard-Webhook' }];
    }
    
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
    
    // Wenn mehrere Webhooks vorhanden sind und nicht alle gleichzeitig gesendet werden sollen,
    // füge ein Untermenü für jeden Webhook hinzu
    if (webhooks.length > 1 && !result.sendToAllWebhooks) {
      // Trennlinie hinzufügen
      chrome.contextMenus.create({
        id: 'pulse-separator',
        parentId: 'pulse-main',
        type: 'separator',
        contexts: ['all']
      });
      
      // Menüpunkt für "An alle senden" hinzufügen
      chrome.contextMenus.create({
        id: 'pulse-send-to-all',
        parentId: 'pulse-main',
        title: 'An alle Webhooks senden',
        contexts: ['all']
      });
      
      // Untermenü für spezifische Webhooks erstellen
      chrome.contextMenus.create({
        id: 'pulse-specific-webhooks',
        parentId: 'pulse-main',
        title: 'An spezifischen Webhook senden',
        contexts: ['all']
      });
      
      // Menüpunkte für jeden Webhook hinzufügen
      webhooks.forEach((webhook, index) => {
        const webhookName = webhook.name || `Webhook ${index + 1}`;
        chrome.contextMenus.create({
          id: `pulse-webhook-${index}`,
          parentId: 'pulse-specific-webhooks',
          title: webhookName,
          contexts: ['all']
        });
      });
    }
  } catch (error) {
    console.error('Fehler beim Erstellen der Kontextmenüs:', error);
  }
}

// Listener für Kontextmenü-Klicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Initialisierung des Background-Scripts
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
  console.log('PULSE MY URL: Kontextmenüs erstellt');
});

console.log('PULSE MY URL: Background-Script initialisiert'); 