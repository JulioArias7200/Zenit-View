'use client';

import { useEffect, useState } from 'react';
import { getNASAClimateData, processNASADataForCharts, getClimateSummary } from '@/lib/services/nasa-api';
import { getCurrentWeatherFromOpenMeteo } from '@/lib/services/open-meteo-api';
import type { Parcel } from '@/lib/stores/parcelStore';

interface ParcelStatsModalProps {
  parcel: Parcel;
  isOpen: boolean;
  onClose: () => void;
}

export default function ParcelStatsModal({ parcel, isOpen, onClose }: ParcelStatsModalProps) {
  const [nasaData, setNasaData] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, parcel.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar datos de NASA (últimos 30 días)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };

      const rawNASA = await getNASAClimateData({
        latitude: parcel.latitude,
        longitude: parcel.longitude,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      });

      const summary = getClimateSummary(rawNASA);
      setNasaData(summary);

      // Cargar datos de OpenMeteo
      const weather = await getCurrentWeatherFromOpenMeteo(parcel.latitude, parcel.longitude);
      setWeatherData(weather);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-md rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">{parcel.name}</h2>
              <p className="text-sm text-green-100">
                📍 {parcel.latitude.toFixed(4)}°, {parcel.longitude.toFixed(4)}°
              </p>
              <p className="text-sm text-green-100 mt-1">
                🌾 {parcel.cropType} • 📏 {parcel.areaHectares.toFixed(2)} ha
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              title="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-600">Cargando estadísticas...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* OpenMeteo - Clima Actual */}
              {weatherData && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    Clima Actual (OpenMeteo)
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-blue-600 mb-1">Temperatura</p>
                      <p className="text-3xl font-bold text-blue-700">{weatherData.temperature}°</p>
                      <p className="text-xs text-blue-500 mt-1">Sensación: {weatherData.feelsLike}°</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-cyan-600 mb-1">Humedad</p>
                      <p className="text-3xl font-bold text-cyan-700">{weatherData.humidity}%</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-teal-600 mb-1">Viento</p>
                      <p className="text-3xl font-bold text-teal-700">{weatherData.windSpeed}</p>
                      <p className="text-xs text-teal-500 mt-1">m/s</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-blue-600 mb-1">Condición</p>
                      <p className="text-sm font-semibold text-blue-700 mt-2">{weatherData.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* NASA - Estadísticas Históricas (30 días) */}
              {nasaData && (
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
                  <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Datos Históricos NASA (últimos 30 días)
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-orange-200">
                      <p className="text-xs text-gray-600 mb-1">Temp. Promedio</p>
                      <p className="text-2xl font-bold text-orange-600">{nasaData.avgTemperature.toFixed(1)}°C</p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <p className="text-xs text-gray-600 mb-1">Temp. Máxima</p>
                      <p className="text-2xl font-bold text-red-600">{nasaData.maxTemperature.toFixed(1)}°C</p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1">Temp. Mínima</p>
                      <p className="text-2xl font-bold text-blue-600">{nasaData.minTemperature.toFixed(1)}°C</p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-cyan-200">
                      <p className="text-xs text-gray-600 mb-1">Precipitación</p>
                      <p className="text-2xl font-bold text-cyan-600">{nasaData.totalPrecipitation.toFixed(1)}</p>
                      <p className="text-xs text-gray-500 mt-1">mm</p>
                    </div>
                  </div>

                  {/* Análisis adicional */}
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">☀️</span>
                        <div>
                          <p className="text-xs text-gray-600">Radiación Solar Promedio</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {nasaData.avgSolarRadiation?.toFixed(2) || 'N/A'} kW/m²
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <span className="text-lg">💨</span>
                        <div>
                          <p className="text-xs text-gray-600">Velocidad Viento Promedio</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {nasaData.avgWindSpeed?.toFixed(2) || 'N/A'} m/s
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Información de la Parcela */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Información de la Parcela</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tipo de Cultivo:</span>
                    <span className="text-sm font-semibold text-gray-800 bg-green-100 px-3 py-1 rounded-full">
                      {parcel.cropType}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Área:</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {parcel.areaHectares.toFixed(2)} hectáreas
                      {parcel.surfaceM2 && ` (${parcel.surfaceM2.toLocaleString()} m²)`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Fecha de Siembra:</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {new Date(parcel.plantingDate).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  
                  {parcel.identifier && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Identificador:</span>
                      <span className="text-sm font-mono font-semibold text-gray-800">
                        {parcel.identifier}
                      </span>
                    </div>
                  )}
                  
                  {parcel.description && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Descripción:</p>
                      <p className="text-sm text-gray-700">{parcel.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>🛰️ NASA POWER API</span>
              <span>🌍 OpenMeteo API</span>
            </div>
            <button
              onClick={onClose}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
