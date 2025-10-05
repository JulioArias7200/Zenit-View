/**
 * Open-Meteo API Service
 * API climática completamente gratuita, sin API key necesaria
 * https://open-meteo.com/
 */

import axios from 'axios';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';

export interface OpenMeteoCurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  description: string;
  icon: string;
  precipitation: number;
  cloudCover: number;
}

export interface OpenMeteoForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  weatherCode: number;
}

/**
 * Mapeo de códigos WMO a descripciones en español
 * https://open-meteo.com/en/docs
 */
function getWeatherDescription(code: number): { description: string; icon: string } {
  const weatherMap: { [key: number]: { description: string; icon: string } } = {
    0: { description: 'Despejado', icon: '01d' },
    1: { description: 'Mayormente despejado', icon: '02d' },
    2: { description: 'Parcialmente nublado', icon: '03d' },
    3: { description: 'Nublado', icon: '04d' },
    45: { description: 'Neblina', icon: '50d' },
    48: { description: 'Neblina con escarcha', icon: '50d' },
    51: { description: 'Llovizna ligera', icon: '09d' },
    53: { description: 'Llovizna moderada', icon: '09d' },
    55: { description: 'Llovizna densa', icon: '09d' },
    61: { description: 'Lluvia ligera', icon: '10d' },
    63: { description: 'Lluvia moderada', icon: '10d' },
    65: { description: 'Lluvia intensa', icon: '10d' },
    71: { description: 'Nieve ligera', icon: '13d' },
    73: { description: 'Nieve moderada', icon: '13d' },
    75: { description: 'Nieve intensa', icon: '13d' },
    77: { description: 'Granizo', icon: '13d' },
    80: { description: 'Chubascos ligeros', icon: '09d' },
    81: { description: 'Chubascos moderados', icon: '09d' },
    82: { description: 'Chubascos violentos', icon: '09d' },
    85: { description: 'Chubascos de nieve', icon: '13d' },
    86: { description: 'Chubascos de nieve intensos', icon: '13d' },
    95: { description: 'Tormenta', icon: '11d' },
    96: { description: 'Tormenta con granizo ligero', icon: '11d' },
    99: { description: 'Tormenta con granizo intenso', icon: '11d' },
  };

  return weatherMap[code] || { description: 'Desconocido', icon: '01d' };
}

/**
 * Obtener clima actual de Open-Meteo
 */
export async function getCurrentWeatherFromOpenMeteo(
  latitude: number,
  longitude: number
): Promise<OpenMeteoCurrentWeather> {
  try {
    const url = `${OPEN_METEO_BASE_URL}/forecast`;
    
    const response = await axios.get(url, {
      params: {
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation',
          'weather_code',
          'cloud_cover',
          'wind_speed_10m',
          'wind_direction_10m'
        ].join(','),
        timezone: 'America/La_Paz',
        forecast_days: 1
      },
      timeout: 10000,
    });

    const current = response.data.current;
    const weatherInfo = getWeatherDescription(current.weather_code);

    return {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: Math.round(current.relative_humidity_2m),
      windSpeed: parseFloat((current.wind_speed_10m / 3.6).toFixed(1)), // km/h a m/s
      windDirection: current.wind_direction_10m,
      weatherCode: current.weather_code,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      precipitation: current.precipitation || 0,
      cloudCover: current.cloud_cover || 0
    };
  } catch (error: any) {
    console.error('Error fetching Open-Meteo current data:', error);
    throw new Error('Error al obtener datos del clima actual desde Open-Meteo');
  }
}

/**
 * Obtener pronóstico de 7 días de Open-Meteo
 */
export async function getForecastFromOpenMeteo(
  latitude: number,
  longitude: number
): Promise<OpenMeteoForecast[]> {
  try {
    const url = `${OPEN_METEO_BASE_URL}/forecast`;
    
    const response = await axios.get(url, {
      params: {
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        daily: [
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_sum',
          'weather_code'
        ].join(','),
        timezone: 'America/La_Paz',
        forecast_days: 7
      },
      timeout: 10000,
    });

    const daily = response.data.daily;
    
    return daily.time.map((date: string, index: number) => ({
      date,
      maxTemp: Math.round(daily.temperature_2m_max[index]),
      minTemp: Math.round(daily.temperature_2m_min[index]),
      precipitation: daily.precipitation_sum[index] || 0,
      weatherCode: daily.weather_code[index]
    }));
  } catch (error: any) {
    console.error('Error fetching Open-Meteo forecast:', error);
    throw new Error('Error al obtener pronóstico desde Open-Meteo');
  }
}

/**
 * Obtener datos históricos (últimos 7 días)
 */
export async function getHistoricalWeatherFromOpenMeteo(
  latitude: number,
  longitude: number,
  days: number = 7
): Promise<any[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const url = `${OPEN_METEO_BASE_URL}/forecast`;
    
    const response = await axios.get(url, {
      params: {
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        daily: [
          'temperature_2m_max',
          'temperature_2m_min',
          'temperature_2m_mean',
          'precipitation_sum'
        ].join(','),
        timezone: 'America/La_Paz'
      },
      timeout: 10000,
    });

    const daily = response.data.daily;
    
    return daily.time.map((date: string, index: number) => ({
      date,
      maxTemp: daily.temperature_2m_max[index],
      minTemp: daily.temperature_2m_min[index],
      avgTemp: daily.temperature_2m_mean[index],
      precipitation: daily.precipitation_sum[index] || 0
    }));
  } catch (error: any) {
    console.error('Error fetching Open-Meteo historical data:', error);
    throw new Error('Error al obtener datos históricos desde Open-Meteo');
  }
}
