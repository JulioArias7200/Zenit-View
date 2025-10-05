import axios from 'axios';

const PERENUAL_BASE_URL = 'https://perenual.com/api';
const API_KEY = process.env.NEXT_PUBLIC_PERENUAL_API_KEY;

export interface PlantDetails {
  id: number;
  common_name: string;
  scientific_name: string[];
  other_name?: string[];
  family?: string;
  origin?: string[];
  type?: string;
  dimension?: string;
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  default_image?: {
    license?: number;
    license_name?: string;
    license_url?: string;
    original_url?: string;
    regular_url?: string;
    medium_url?: string;
    small_url?: string;
    thumbnail?: string;
  };
}

export interface PlantSearchResult {
  data: PlantDetails[];
  to: number;
  per_page: number;
  current_page: number;
  from: number;
  last_page: number;
  total: number;
}

/**
 * Buscar plantas por nombre
 */
export async function searchPlants(
  query: string,
  page: number = 1
): Promise<PlantSearchResult> {
  try {
    const url = `${PERENUAL_BASE_URL}/species-list`;
    
    const response = await axios.get<PlantSearchResult>(url, {
      params: {
        key: API_KEY,
        q: query,
        page: page,
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('Error searching plants:', error);
    throw new Error('Error al buscar plantas en Perenual API');
  }
}

/**
 * Obtener detalles de una planta específica
 */
export async function getPlantDetails(plantId: number): Promise<PlantDetails> {
  try {
    const url = `${PERENUAL_BASE_URL}/species/details/${plantId}`;
    
    const response = await axios.get<PlantDetails>(url, {
      params: {
        key: API_KEY,
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching plant details:', error);
    throw new Error('Error al obtener detalles de la planta');
  }
}

/**
 * Obtener información de cuidado de la planta
 */
export interface PlantCareGuide {
  id: number;
  species_id: number;
  common_name: string;
  scientific_name: string[];
  section: Array<{
    id: number;
    type: string;
    description: string;
  }>;
}

export async function getPlantCareGuide(plantId: number): Promise<PlantCareGuide> {
  try {
    const url = `${PERENUAL_BASE_URL}/species-care-guide-list`;
    
    const response = await axios.get<{ data: PlantCareGuide[] }>(url, {
      params: {
        key: API_KEY,
        species_id: plantId,
      },
      timeout: 10000,
    });

    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    
    throw new Error('No se encontró guía de cuidado');
  } catch (error) {
    console.error('Error fetching plant care guide:', error);
    throw new Error('Error al obtener guía de cuidado de la planta');
  }
}

/**
 * Plantas comunes en agricultura
 */
export const COMMON_CROPS = [
  { name: 'Maíz', query: 'corn' },
  { name: 'Trigo', query: 'wheat' },
  { name: 'Arroz', query: 'rice' },
  { name: 'Soja', query: 'soybean' },
  { name: 'Tomate', query: 'tomato' },
  { name: 'Papa', query: 'potato' },
  { name: 'Quinua', query: 'quinoa' },
  { name: 'Café', query: 'coffee' },
];

/**
 * Obtener información de cultivo común
 */
export async function getCropInfo(cropName: string): Promise<PlantDetails | null> {
  const crop = COMMON_CROPS.find(c => c.name.toLowerCase() === cropName.toLowerCase());
  
  if (!crop) return null;
  
  try {
    const results = await searchPlants(crop.query, 1);
    
    if (results.data && results.data.length > 0) {
      return results.data[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching crop info for ${cropName}:`, error);
    return null;
  }
}
