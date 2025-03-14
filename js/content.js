// Content-Script für PULSE MY URL
// Dieses Script wird in jeder Webseite ausgeführt und kann mit der Seite interagieren

// Listener für Nachrichten vom Background-Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    const pageContent = extractPageContent();
    sendResponse({ content: pageContent });
  }
  
  if (request.action === "showNotification") {
    showNotification(request.success, request.message);
  }
  
  return true; // Wichtig für asynchrone Antworten
});

/**
 * Zeigt eine Benachrichtigung auf der Webseite an
 * @param {boolean} success - Ob die Aktion erfolgreich war
 * @param {string} message - Die anzuzeigende Nachricht
 */
function showNotification(success, message) {
  // Bestehende Benachrichtigungen entfernen
  const existingNotifications = document.querySelectorAll('.pulse-my-url-notification');
  existingNotifications.forEach(notification => notification.remove());
  
  // Neue Benachrichtigung erstellen
  const notification = document.createElement('div');
  notification.className = 'pulse-my-url-notification';
  notification.textContent = message;
  
  // Styling für die Benachrichtigung
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '9999',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'opacity 0.3s ease-in-out',
    opacity: '0',
    maxWidth: '300px',
    color: success ? '#fff' : '#fff',
    backgroundColor: success ? '#10b981' : '#ef4444'
  });
  
  // Benachrichtigung zum DOM hinzufügen
  document.body.appendChild(notification);
  
  // Animation starten
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  // Benachrichtigung nach 3 Sekunden ausblenden
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * Extrahiert den Inhalt der Seite und konvertiert ihn in Markdown
 * @returns {string} Der Seiteninhalt als Markdown
 */
function extractPageContent() {
  try {
    // Hauptinhalt der Seite finden (bevorzugt main, article oder content-Elemente)
    let mainContent = document.querySelector('main') || 
                      document.querySelector('article') || 
                      document.querySelector('[role="main"]') || 
                      document.querySelector('#content') || 
                      document.querySelector('.content') || 
                      document.body;
    
    // Klonen des Elements, um es zu bearbeiten, ohne die Seite zu verändern
    let contentClone = mainContent.cloneNode(true);
    
    // Entfernen von unnötigen Elementen
    removeElements(contentClone, 'script, style, iframe, nav, footer, header, aside, .sidebar, .ad, .advertisement, .banner');
    
    // Extrahieren des Titels
    const title = document.title || document.querySelector('h1')?.textContent || '';
    
    // Erstellen des Markdown-Inhalts
    let markdown = `# ${title.trim()}\n\n`;
    
    // Extrahieren der Überschriften
    const headings = contentClone.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1));
      const text = heading.textContent.trim();
      if (text && text !== title.trim()) {
        markdown += `${'#'.repeat(level)} ${text}\n\n`;
      }
    });
    
    // Extrahieren der Absätze
    const paragraphs = contentClone.querySelectorAll('p');
    paragraphs.forEach(p => {
      const text = p.textContent.trim();
      if (text) {
        markdown += `${text}\n\n`;
      }
    });
    
    // Extrahieren der Listen
    const lists = contentClone.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const isOrdered = list.tagName.toLowerCase() === 'ol';
      const items = list.querySelectorAll('li');
      items.forEach((item, index) => {
        const text = item.textContent.trim();
        if (text) {
          markdown += isOrdered ? `${index + 1}. ${text}\n` : `- ${text}\n`;
        }
      });
      markdown += '\n';
    });
    
    // Extrahieren der Links
    const links = contentClone.querySelectorAll('a[href]');
    if (links.length > 0) {
      markdown += '\n## Links\n\n';
      links.forEach(link => {
        const text = link.textContent.trim();
        const href = link.getAttribute('href');
        if (text && href) {
          // Konvertiere relative URLs zu absoluten
          const absoluteUrl = new URL(href, window.location.href).href;
          markdown += `[${text}](${absoluteUrl})\n`;
        }
      });
      markdown += '\n';
    }
    
    // Extrahieren der Bilder
    const images = contentClone.querySelectorAll('img[src]');
    if (images.length > 0) {
      markdown += '\n## Bilder\n\n';
      images.forEach(img => {
        const alt = img.getAttribute('alt') || 'Bild';
        const src = img.getAttribute('src');
        if (src) {
          // Konvertiere relative URLs zu absoluten
          const absoluteUrl = new URL(src, window.location.href).href;
          markdown += `![${alt}](${absoluteUrl})\n`;
        }
      });
      markdown += '\n';
    }
    
    // Begrenze die Länge des Markdowns (um zu große Nachrichten zu vermeiden)
    const maxLength = 50000; // ~50KB
    if (markdown.length > maxLength) {
      markdown = markdown.substring(0, maxLength) + '\n\n... (Inhalt gekürzt)';
    }
    
    return markdown;
  } catch (error) {
    console.error('Fehler beim Extrahieren des Seiteninhalts:', error);
    return `Fehler beim Extrahieren des Seiteninhalts: ${error.message}`;
  }
}

/**
 * Entfernt Elemente aus dem DOM-Baum
 * @param {Element} element - Das Element, aus dem entfernt werden soll
 * @param {string} selector - CSS-Selektor für zu entfernende Elemente
 */
function removeElements(element, selector) {
  const elementsToRemove = element.querySelectorAll(selector);
  elementsToRemove.forEach(el => el.remove());
} 