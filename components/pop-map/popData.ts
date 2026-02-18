export type Region = 'NA' | 'SA' | 'EU' | 'ME_AF' | 'APAC';

export interface PoP {
  id: string;
  city: string;
  country: string;
  region: Region;
  lat: number;
  lon: number;
}

export const POPS: PoP[] = [
  // North America
  { id: 'nyc', city: 'New York', country: 'United States', region: 'NA', lat: 40.7128, lon: -74.006 },
  { id: 'atl', city: 'Atlanta', country: 'United States', region: 'NA', lat: 33.749, lon: -84.388 },
  { id: 'mia', city: 'Miami', country: 'United States', region: 'NA', lat: 25.7617, lon: -80.1918 },
  { id: 'ord', city: 'Chicago', country: 'United States', region: 'NA', lat: 41.8781, lon: -87.6298 },
  { id: 'dfw', city: 'Dallas', country: 'United States', region: 'NA', lat: 32.7767, lon: -96.797 },
  { id: 'lax', city: 'Los Angeles', country: 'United States', region: 'NA', lat: 34.0522, lon: -118.2437 },
  { id: 'sea', city: 'Seattle', country: 'United States', region: 'NA', lat: 47.6062, lon: -122.3321 },
  { id: 'yyz', city: 'Toronto', country: 'Canada', region: 'NA', lat: 43.6532, lon: -79.3832 },
  { id: 'mex', city: 'Mexico City', country: 'Mexico', region: 'NA', lat: 19.4326, lon: -99.1332 },
  { id: 'hnl', city: 'Honolulu', country: 'United States', region: 'NA', lat: 21.3069, lon: -157.8583 },

  // South America
  { id: 'gru', city: 'São Paulo', country: 'Brazil', region: 'SA', lat: -23.5505, lon: -46.6333 },
  { id: 'scl', city: 'Santiago', country: 'Chile', region: 'SA', lat: -33.4489, lon: -70.6693 },

  // Europe
  { id: 'lhr', city: 'London', country: 'United Kingdom', region: 'EU', lat: 51.5074, lon: -0.1278 },
  { id: 'ams', city: 'Amsterdam', country: 'Netherlands', region: 'EU', lat: 52.3676, lon: 4.9041 },
  { id: 'fra', city: 'Frankfurt', country: 'Germany', region: 'EU', lat: 50.1109, lon: 8.6821 },
  { id: 'cdg', city: 'Paris', country: 'France', region: 'EU', lat: 48.8566, lon: 2.3522 },
  { id: 'mad', city: 'Madrid', country: 'Spain', region: 'EU', lat: 40.4168, lon: -3.7038 },
  { id: 'waw', city: 'Warsaw', country: 'Poland', region: 'EU', lat: 52.2297, lon: 21.0122 },
  { id: 'arn', city: 'Stockholm', country: 'Sweden', region: 'EU', lat: 59.3293, lon: 18.0686 },

  // Middle East & Africa
  { id: 'tlv', city: 'Tel Aviv', country: 'Israel', region: 'ME_AF', lat: 32.0853, lon: 34.7818 },
  { id: 'jnb', city: 'Johannesburg', country: 'South Africa', region: 'ME_AF', lat: -26.2041, lon: 28.0473 },

  // Asia Pacific
  { id: 'bom', city: 'Mumbai', country: 'India', region: 'APAC', lat: 19.076, lon: 72.8777 },
  { id: 'blr', city: 'Bangalore', country: 'India', region: 'APAC', lat: 12.9716, lon: 77.5946 },
  { id: 'sin', city: 'Singapore', country: 'Singapore', region: 'APAC', lat: 1.3521, lon: 103.8198 },
  { id: 'icn', city: 'Seoul', country: 'South Korea', region: 'APAC', lat: 37.5665, lon: 126.978 },
  { id: 'nrt', city: 'Tokyo', country: 'Japan', region: 'APAC', lat: 35.6762, lon: 139.6503 },
  { id: 'kix', city: 'Osaka', country: 'Japan', region: 'APAC', lat: 34.6937, lon: 135.5023 },
  { id: 'hkg', city: 'Hong Kong', country: 'Hong Kong', region: 'APAC', lat: 22.3193, lon: 114.1694 },
  { id: 'syd', city: 'Sydney', country: 'Australia', region: 'APAC', lat: -33.8688, lon: 151.2093 },
  { id: 'mel', city: 'Melbourne', country: 'Australia', region: 'APAC', lat: -37.8136, lon: 144.9631 },
];

export const REGION_LABELS: Record<Region, string> = {
  NA: 'North America',
  SA: 'South America',
  EU: 'Europe',
  ME_AF: 'Middle East & Africa',
  APAC: 'Asia Pacific',
};
