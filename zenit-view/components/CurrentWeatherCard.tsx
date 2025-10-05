'use client';

import { useState, useEffect } from 'react';
import { getCurrentWeatherFromOpenMeteo, type OpenMeteoCurrentWeather } from '@/lib/services/open-meteo-api';

interface CurrentWeatherCardProps {
  latitude: number;
  longitude: number;
}

export default function CurrentWeatherCard({ latitude, longitude }: CurrentWeatherCardProps) {
  const [weather, setWeather] = useState<OpenMeteoCurrentWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCurrentWeatherFromOpenMeteo(latitude, longitude);
        setWeather(data);
      } catch (err) {
        setError('Error al cargar el clima');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-red-600">{error || 'No hay datos disponibles'}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold">Clima Actual</h3>
          <p className="text-blue-100">Lat: {latitude.toFixed(2)}, Lon: {longitude.toFixed(2)}</p>
        </div>
        <div className="text-6xl">
          {weather.weatherCode === 0 ? '☀️' : 
           weather.weatherCode <= 3 ? '⛅' : 
           weather.weatherCode <= 48 ? '🌫️' :
           weather.weatherCode <= 67 ? '🌧️' :
           weather.weatherCode <= 77 ? '🌨️' : '⛈️'}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-5xl font-bold">
            {weather.temperature}°C
          </span>
          <div className="text-right">
            <p className="text-sm text-blue-100">Sensación térmica</p>
            <p className="text-xl">{weather.feelsLike}°C</p>
          </div>
        </div>

        <p className="text-lg capitalize">{weather.description}</p>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-400">
          <div>
            <p className="text-sm text-blue-100">Humedad</p>
            <p className="text-lg font-semibold">{weather.humidity}%</p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Viento</p>
            <p className="text-lg font-semibold">{weather.windSpeed.toFixed(1)} m/s</p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Precipitación</p>
            <p className="text-lg font-semibold">{weather.precipitation.toFixed(1)} mm</p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Nubes</p>
            <p className="text-lg font-semibold">{weather.cloudCover}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
