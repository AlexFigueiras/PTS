export interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    [key: string]: string | undefined;
  };
}

let lastRequestTime = 0;
const cache = new Map<string, GeocodeResult[]>();

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (query.trim().length < 3) return [];

  const normalizedQuery = query.trim().toLowerCase();
  if (cache.has(normalizedQuery)) return cache.get(normalizedQuery)!;

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLastRequest));
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=br`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR',
        'User-Agent': 'CAPS-AD-III-PTS-Manager',
      },
    });

    lastRequestTime = Date.now();
    if (!response.ok) throw new Error('Erro na API do Nominatim');

    const data: GeocodeResult[] = await response.json();

    if (data.length === 0 && /\d+/.test(query)) {
      const fallbackQuery = query.replace(/\d+/g, '').trim();
      if (fallbackQuery.length >= 3) return searchAddress(fallbackQuery);
    }

    cache.set(normalizedQuery, data);
    return data;
  } catch {
    return [];
  }
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const results = await searchAddress(address);
  if (results.length > 0) {
    return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
  }
  return null;
}
