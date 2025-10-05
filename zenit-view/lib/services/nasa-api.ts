import axios from 'axios';

const NASA_POWER_BASE_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';

export interface NASAClimateData {
  type: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    parameter: {
      T2M?: Record<string, number>;          // Temperatura a 2m
      T2M_MAX?: Record<string, number>;      // Temperatura máxima
      T2M_MIN?: Record<string, number>;      // Temperatura mínima
      PRECTOTCORR?: Record<string, number>;  // Precipitación
      RH2M?: Record<string, number>;         // Humedad relativa
      WS2M?: Record<string, number>;         // Velocidad del viento
      ALLSKY_SFC_SW_DWN?: Record<string, number>; // Radiación solar
    };
  };
  messages?: string[];
  parameters?: {
    request?: any;
    info?: any;
  };
}

export interface ClimateRequest {
  latitude: number;
  longitude: number;
  startDate: string;  // Format: YYYYMMDD
  endDate: string;    // Format: YYYYMMDD
}

/**
 * Obtener datos climáticos de NASA POWER API
 */
export async function getNASAClimateData(
  request: ClimateRequest
): Promise<NASAClimateData> {
  try {
    const params = new URLSearchParams({
      parameters: 'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN',
      community: 'AG',
      longitude: request.longitude.toString(),
      latitude: request.latitude.toString(),
      start: request.startDate,
      end: request.endDate,
      format: 'JSON'
    });

    const url = `${NASA_POWER_BASE_URL}?${params}`;
    
    console.log('Fetching NASA POWER data:', url);
    
    const response = await axios.get<NASAClimateData>(url, {
      timeout: 30000, // 30 segundos
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching NASA POWER data:', error);
    throw new Error('Error al obtener datos climáticos de NASA POWER API');
  }
}

/**
 * Procesar datos para gráficos
 */
export function processNASADataForCharts(data: NASAClimateData) {
  const temp = data.properties.parameter.T2M || {};
  const tempMax = data.properties.parameter.T2M_MAX || {};
  const tempMin = data.properties.parameter.T2M_MIN || {};
  const precip = data.properties.parameter.PRECTOTCORR || {};
  const humidity = data.properties.parameter.RH2M || {};

  const dates = Object.keys(temp);

  return dates.map(date => {
    // Convertir fecha de YYYYMMDD a formato legible
    const year = date.substring(0, 4);
    const month = date.substring(4, 6);
    const day = date.substring(6, 8);
    const formattedDate = `${year}-${month}-${day}`;

    return {
      date: formattedDate,
      temperatura: temp[date],
      tempMax: tempMax[date],
      tempMin: tempMin[date],
      precipitacion: precip[date],
      humedad: humidity[date],
    };
  });
}

/**
 * Calcular GDD (Growing Degree Days)
 * Fórmula: GDD = (Tmax + Tmin)/2 - Tbase
 */
export function calculateGDD(
  data: NASAClimateData,
  baseTemp: number = 10 // Temperatura base en °C
): number[] {
  const tempMax = data.properties.parameter.T2M_MAX || {};
  const tempMin = data.properties.parameter.T2M_MIN || {};
  
  const dates = Object.keys(tempMax);
  
  return dates.map(date => {
    const tMax = tempMax[date];
    const tMin = tempMin[date];
    
    if (tMax === undefined || tMin === undefined) return 0;
    
    const avgTemp = (tMax + tMin) / 2;
    const gdd = Math.max(0, avgTemp - baseTemp);
    
    return gdd;
  });
}

/**
 * Obtener resumen estadístico
 */
export function getClimateSummary(data: NASAClimateData) {
  const temp = data.properties.parameter.T2M || {};
  const tempMax = data.properties.parameter.T2M_MAX || {};
  const tempMin = data.properties.parameter.T2M_MIN || {};
  const precip = data.properties.parameter.PRECTOTCORR || {};
  const solarRad = data.properties.parameter.ALLSKY_SFC_SW_DWN || {};
  const windSpeed = data.properties.parameter.WS2M || {};
  
  const temps = Object.values(temp).filter(v => v !== undefined && v !== -999);
  const tempsMax = Object.values(tempMax).filter(v => v !== undefined && v !== -999);
  const tempsMin = Object.values(tempMin).filter(v => v !== undefined && v !== -999);
  const precips = Object.values(precip).filter(v => v !== undefined && v !== -999 && v >= 0);
  const solarRads = Object.values(solarRad).filter(v => v !== undefined && v !== -999);
  const windSpeeds = Object.values(windSpeed).filter(v => v !== undefined && v !== -999);
  
  return {
    avgTemperature: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0,
    maxTemperature: tempsMax.length > 0 ? Math.max(...tempsMax) : 0,
    minTemperature: tempsMin.length > 0 ? Math.min(...tempsMin) : 0,
    totalPrecipitation: precips.length > 0 ? precips.reduce((a, b) => a + b, 0) : 0,
    avgPrecipitation: precips.length > 0 ? precips.reduce((a, b) => a + b, 0) / precips.length : 0,
    avgSolarRadiation: solarRads.length > 0 ? solarRads.reduce((a, b) => a + b, 0) / solarRads.length : 0,
    avgWindSpeed: windSpeeds.length > 0 ? windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length : 0,
    dataPoints: temps.length,
  };
}
