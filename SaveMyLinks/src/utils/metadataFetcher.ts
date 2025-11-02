// src/utils/metadataFetcher.ts

export interface LinkMetadata {
  title: string;
  description: string;
  imageUrl?: string;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    const response = await fetch(`/api/fetch-metadata?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch metadata: ${text}`);
    }
    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error('Response was not valid JSON.');
    }
    if (!data.title && !data.description) {
      return null;
    }
    return {
      title: data.title || '',
      description: data.description || '',
      imageUrl: data.imageUrl || undefined,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Error fetching metadata');
  }
} 