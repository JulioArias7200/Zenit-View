import axios from 'axios';

const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

export interface CurrentWeather {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  name: string;
}

export interface WeatherForecast {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
    };
    pop: number; // Probabilidad de precipitación
    rain?: {
      '3h': number;
    };
    dt_txt: string;
  }>;
}

/**
 * Obtener clima actual
 */
export async function getCurrentWeather(
  latitude: number,
  longitude: number
): Promise<CurrentWeather> {
  try {
    const url = `${OPENWEATHER_BASE_URL}/weather`;
    
    const response = await axios.get<CurrentWeather>(url, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: API_KEY,
        units: 'metric',
        lang: 'es',
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error: any) {
    // Si es error 401 y no hay API key configurada, fallar silenciosamente
    if (error.response?.status === 401 && (!API_KEY || API_KEY === 'your_openweather_api_key_here')) {
      throw new Error('NO_API_KEY');
    }
    // Para otros errores, mostrar en consola
    console.error('Error fetching OpenWeather current data:', error);
    throw new Error('Error al obtener datos del clima actual');
  }
}

/**
 * Obtener pronóstico de 5 días
 */
export async function getWeatherForecast(
  latitude: number,
  longitude: number
): Promise<WeatherForecast> {
  try {
    const url = `${OPENWEATHER_BASE_URL}/forecast`;
    
    const response = await axios.get<WeatherForecast>(url, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: API_KEY,
        units: 'metric',
        lang: 'es',
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching OpenWeather forecast:', error);
    throw new Error('Error al obtener pronóstico del clima');
  }
}

/**
 * Procesar pronóstico para gráficos
 */
export function processForecastForCharts(forecast: WeatherForecast) {
  return forecast.list.map(item => ({
    date: new Date(item.dt * 1000).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
    }),
    temperatura: Math.round(item.main.temp),
    tempMin: Math.round(item.main.temp_min),
    tempMax: Math.round(item.main.temp_max),
    humedad: item.main.humidity,
    lluvia: item.pop * 100, // Probabilidad de lluvia en %
    viento: item.wind.speed,
  }));
}

/**
 * Obtener icono del clima
 */
export function getWeatherIcon(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Traducir descripción del clima
 */
export function translateWeatherDescription(description: string): string {
  const translations: Record<string, string> = {
    'clear sky': 'Cielo despejado',
    'few clouds': 'Pocas nubes',
    'scattered clouds': 'Nubes dispersas',
    'broken clouds': 'Nublado',
    'overcast clouds': 'Muy nublado',
    'light rain': 'Lluvia ligera',
    'moderate rain': 'Lluvia moderada',
    'heavy rain': 'Lluvia fuerte',
    'thunderstorm': 'Tormenta',
  };
  
  return translations[description.toLowerCase()] || description;
}
