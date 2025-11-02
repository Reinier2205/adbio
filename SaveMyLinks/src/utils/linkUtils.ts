export const fetchLinkMetadata = async (url: string): Promise<{ title: string; favicon?: string }> => {
  try {
    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // For demo purposes, we'll extract domain and create a basic title
    // In a real app, you'd use a service like Unfurl or implement server-side metadata fetching
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Generate favicon URL from domain
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    
    // Basic title extraction from URL
    let title = urlObj.pathname.split('/').pop() || domain;
    title = title.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, '');
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    if (title === domain || title.length < 3) {
      title = domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    
    return { title, favicon };
  } catch (error) {
    // Fallback for invalid URLs
    const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return {
      title: domain || 'Untitled Link',
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    };
  }
};

export const validateUrl = (url: string): boolean => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    new URL(normalizedUrl);
    return true;
  } catch {
    return false;
  }
};

export const normalizeUrl = (url: string): string => {
  return url.startsWith('http') ? url : `https://${url}`;
};

export const exportLinksAsText = (links: any[]): string => {
  return links.map(link => {
    let text = `${link.title}\n${link.url}`;
    if (link.notes) text += `\nNotes: ${link.notes}`;
    if (link.tags.length > 0) text += `\nTags: ${link.tags.join(', ')}`;
    return text;
  }).join('\n\n---\n\n');
};

export const exportLinksAsJson = (links: any[]): string => {
  return JSON.stringify(links, null, 2);
};

export const parseImportedText = (text: string): any[] => {
  const sections = text.split(/\n\s*---\s*\n/);
  const links = [];
  
  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length < 2) {
      continue;
    }
    
    const title = lines[0].trim();
    const url = lines[1].trim();
    
    if (!validateUrl(url)) {
      continue;
    }
    
    let notes = '';
    let tags: string[] = [];
    
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Notes: ')) {
        notes = line.substring(7);
      } else if (line.startsWith('Tags: ')) {
        tags = line.substring(6).split(',').map(tag => tag.trim()).filter(Boolean);
      }
    }
    
    links.push({
      url: normalizeUrl(url),
      title,
      notes,
      tags
    });
  }
  
  return links;
};