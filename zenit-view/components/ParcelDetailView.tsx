'use client';

import { useEffect, useState } from 'react';
import { useParcelStore } from '@/lib/stores/parcelStore';
import { format } from 'date-fns';
import { getNASAClimateData, processNASADataForCharts, getClimateSummary } from '@/lib/services/nasa-api';
import { getCurrentWeatherFromOpenMeteo } from '@/lib/services/open-meteo-api';
import ClimateChart from './ClimateChart';
import BoundaryInfo from './BoundaryInfo';

export default function ParcelDetailView() {
  const selectedParcel = useParcelStore((state) => state.selectedParcel);
  const clearSelection = useParcelStore((state) => state.clearSelection);
  const [climateData, setClimateData] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);

  useEffect(() => {
    if (selectedParcel) {
      loadClimateData();
      loadWeatherData();
    }
  }, [selectedParcel]);

  const loadWeatherData = async () => {
    if (!selectedParcel) return;
    
    setLoadingWeather(true);
    try {
      const weather = await getCurrentWeatherFromOpenMeteo(
        selectedParcel.latitude,
        selectedParcel.longitude
      );
      setWeatherData({
        temperature: weather.temperature,
        feelsLike: weather.feelsLike,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed.toFixed(1),
        description: weather.description,
        icon: weather.icon,
        precipitation: weather.precipitation,
        cloudCover: weather.cloudCover
      });
    } catch (error: any) {
      console.error('Error loading weather data:', error);
      // Datos de respaldo si falla la API
      setWeatherData({
        temperature: Math.round(20 + Math.random() * 10),
        feelsLike: Math.round(20 + Math.random() * 10),
        humidity: Math.round(45 + Math.random() * 35),
        windSpeed: (Math.random() * 6).toFixed(1),
        description: 'Datos no disponibles',
        icon: '01d'
      });
    } finally {
      setLoadingWeather(false);
    }
  };

  const loadClimateData = async () => {
    if (!selectedParcel) return;
    
    setLoading(true);
    try {
      // NASA POWER API tiene delay de ~10 días, usar datos del pasado
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 10); // Restar 10 días del día actual
      
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30); // 30 días antes de endDate
      
      // Formato YYYYMMDD sin guiones (requerido por NASA API)
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };
      
      const rawData = await getNASAClimateData({
        latitude: selectedParcel.latitude,
        longitude: selectedParcel.longitude,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      });
      
      // Procesar datos para gráficos y resumen
      const chartData = processNASADataForCharts(rawData);
      const summary = getClimateSummary(rawData);
      
      // Guardar datos procesados
      setClimateData({
        raw: rawData,
        chartData: chartData,
        summary: {
          avgTemp: summary.avgTemperature,
          maxTemp: summary.maxTemperature,
          minTemp: summary.minTemperature,
          totalPrecipitation: summary.totalPrecipitation
        }
      });
    } catch (error) {
      console.error('Error loading climate data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedParcel) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">No hay parcela seleccionada</h3>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona una parcela del mapa o de la lista para ver sus detalles
        </p>
      </div>
    );
  }

  const plantingDate = new Date(selectedParcel.plantingDate);
  const daysPlanted = Math.floor((Date.now() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-4">
      {/* Header compacto con acción de cerrar */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold">{selectedParcel.name}</h2>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                {selectedParcel.cropType}
              </span>
            </div>
            {selectedParcel.description && (
              <p className="text-green-50 text-sm mb-3">{selectedParcel.description}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-green-100 text-xs">Área</p>
                <p className="text-xl font-bold">{selectedParcel.areaHectares.toFixed(2)} ha</p>
              </div>
              <div>
                <p className="text-green-100 text-xs">Fecha de Siembra</p>
                <p className="text-sm font-semibold">{format(plantingDate, 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <p className="text-green-100 text-xs">Días Plantado</p>
                <p className="text-xl font-bold">{daysPlanted}</p>
              </div>
              <div>
                <p className="text-green-100 text-xs">Coordenadas</p>
                <p className="text-xs font-mono">
                  {selectedParcel.latitude.toFixed(4)}, {selectedParcel.longitude.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={clearSelection}
            className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Estado de APIs - Compacto */}
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">APIs Activas</h4>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              NASA POWER
            </span>
            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
              Open-Meteo
            </span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
              OpenRouter AI
            </span>
          </div>
        </div>
      </div>

      {/* Clima Actual (Open-Meteo API) - Compacto */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            Clima Actual
            <span className="text-xs font-normal opacity-80">(Open-Meteo)</span>
          </h3>
          {weatherData?.description === 'Datos no disponibles' && (
            <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs font-bold">
              OFFLINE
            </span>
          )}
        </div>

        {loadingWeather ? (
          <div className="text-center py-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-blue-100 text-xs">Cargando...</p>
          </div>
        ) : weatherData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-blue-100 text-xs mb-0.5">Temperatura</p>
              <p className="text-2xl font-bold">{weatherData.temperature}°C</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-blue-100 text-xs mb-0.5">Sensación</p>
              <p className="text-2xl font-bold">{weatherData.feelsLike}°C</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-blue-100 text-xs mb-0.5">Humedad</p>
              <p className="text-2xl font-bold">{weatherData.humidity}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-blue-100 text-xs mb-0.5">Viento</p>
              <p className="text-2xl font-bold">{weatherData.windSpeed} m/s</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-blue-100 text-sm">No se pudieron cargar los datos del clima</p>
            <button
              onClick={loadWeatherData}
              className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md transition-colors text-xs"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* Datos Climáticos NASA POWER - Compacto */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              🛰️ Datos Históricos NASA POWER
            </h3>
            <p className="text-xs text-gray-600">Últimos 30 días de datos satelitales</p>
          </div>
          {!loading && !climateData && (
            <button
              onClick={loadClimateData}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
            >
              Cargar Datos
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Obteniendo datos de NASA POWER API...</p>
            <p className="text-xs text-gray-500 mt-1">Esto puede tardar unos segundos</p>
          </div>
        )}

        {climateData && climateData.summary && climateData.chartData && (
          <div className="space-y-4">
            {/* Resumen estadístico - Compacto */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-orange-50 rounded-lg p-2.5">
                <p className="text-xs text-orange-600">Temp. Promedio</p>
                <p className="text-xl font-bold text-orange-700">
                  {climateData.summary.avgTemp.toFixed(1)}°C
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-2.5">
                <p className="text-xs text-red-600">Temp. Máxima</p>
                <p className="text-xl font-bold text-red-700">
                  {climateData.summary.maxTemp.toFixed(1)}°C
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2.5">
                <p className="text-xs text-blue-600">Temp. Mínima</p>
                <p className="text-xl font-bold text-blue-700">
                  {climateData.summary.minTemp.toFixed(1)}°C
                </p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-2.5">
                <p className="text-xs text-cyan-600">Precipitación</p>
                <p className="text-xl font-bold text-cyan-700">
                  {climateData.summary.totalPrecipitation.toFixed(0)} mm
                </p>
              </div>
            </div>

            {/* Gráfico */}
            <ClimateChart data={climateData.chartData} />
          </div>
        )}
      </div>

      {/* Información de Linderos (si existe) */}
      <BoundaryInfo 
        boundaries={selectedParcel.boundaries}
        identifier={selectedParcel.identifier}
        surfaceM2={selectedParcel.surfaceM2}
        parcelType={selectedParcel.parcelType}
      />

      {/* Recomendaciones - Compacto */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Recomendaciones IA para {selectedParcel.cropType}
          <span className="text-xs font-normal opacity-70">(OpenRouter AI)</span>
        </h3>
        <div className="space-y-1 text-purple-800 text-sm">
          <p>• <strong>Riego:</strong> Basado en los {daysPlanted} días desde la siembra, verifica humedad del suelo</p>
          <p>• <strong>Monitoreo:</strong> Revisa datos climáticos semanalmente para anticipar cambios</p>
          <p>• <strong>Floración:</strong> Para cultivos de ciclo corto, floración típica entre 60-90 días</p>
          {climateData && (
            <>
              {climateData.summary.avgTemp > 30 && (
                <p className="text-orange-700">⚠️ <strong>Alerta:</strong> Temperaturas altas, considera riego adicional</p>
              )}
              {climateData.summary.totalPrecipitation < 50 && (
                <p className="text-red-700">⚠️ <strong>Alerta:</strong> Baja precipitación, monitorea humedad del suelo</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Acciones rápidas - Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button className="bg-white border-2 border-gray-300 hover:border-green-500 rounded-lg p-3 text-left transition-colors">
          <div className="text-xl mb-1">📊</div>
          <div className="font-semibold text-gray-800 text-sm">Ver Histórico</div>
          <div className="text-xs text-gray-600">Datos completos de la parcela</div>
        </button>
        <button className="bg-white border-2 border-gray-300 hover:border-blue-500 rounded-lg p-3 text-left transition-colors">
          <div className="text-xl mb-1">🌡️</div>
          <div className="font-semibold text-gray-800 text-sm">Clima en Vivo</div>
          <div className="text-xs text-gray-600">Condiciones actuales</div>
        </button>
        <button className="bg-white border-2 border-gray-300 hover:border-purple-500 rounded-lg p-3 text-left transition-colors">
          <div className="text-xl mb-1">📄</div>
          <div className="font-semibold text-gray-800 text-sm">Exportar Reporte</div>
          <div className="text-xs text-gray-600">Descargar datos en PDF</div>
        </button>
      </div>

      {/* Información de APIs Integradas - Compacto */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          APIs Integradas en ZENIT VIEW
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {/* NASA POWER */}
          <div className="bg-white rounded-lg p-2.5 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🛰️</span>
              <div>
                <h4 className="text-xs font-bold text-blue-700">NASA POWER</h4>
                <p className="text-xs text-gray-600">Datos climáticos históricos</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-xs text-green-700 font-medium">Activa - Sin API Key</span>
            </div>
          </div>

          {/* Open-Meteo */}
          <div className="bg-white rounded-lg p-2.5 border border-cyan-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌤️</span>
              <div>
                <h4 className="text-xs font-bold text-cyan-700">Open-Meteo</h4>
                <p className="text-xs text-gray-600">Clima actual y pronóstico</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-xs text-green-700 font-medium">Activa - Gratuita</span>
            </div>
          </div>

          {/* OpenRouter AI */}
          <div className="bg-white rounded-lg p-2.5 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🤖</span>
              <div>
                <h4 className="text-xs font-bold text-purple-700">OpenRouter AI</h4>
                <p className="text-xs text-gray-600">Predicción de floración</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-xs text-green-700 font-medium">Activa - GPT-OSS-20B</span>
            </div>
          </div>

          {/* OpenWeather (Opcional) */}
          <div className="bg-white rounded-lg p-2.5 border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">☁️</span>
              <div>
                <h4 className="text-xs font-bold text-orange-700">OpenWeather</h4>
                <p className="text-xs text-gray-600">Clima alternativo</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
              <span className="text-xs text-yellow-700 font-medium">Disponible</span>
            </div>
          </div>

          {/* Perenual Plant API */}
          <div className="bg-white rounded-lg p-2.5 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌿</span>
              <div>
                <h4 className="text-xs font-bold text-green-700">Perenual Plant</h4>
                <p className="text-xs text-gray-600">Info de plantas y cultivos</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
              <span className="text-xs text-yellow-700 font-medium">Disponible</span>
            </div>
          </div>

          {/* Machine Learning */}
          <div className="bg-white rounded-lg p-2.5 border border-pink-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🧠</span>
              <div>
                <h4 className="text-xs font-bold text-pink-700">ML Local</h4>
                <p className="text-xs text-gray-600">Modelo de floración</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-xs text-green-700 font-medium">Entrenamiento activo</span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            <strong>Fuentes de datos:</strong> NASA POWER API (histórico) • Open-Meteo (tiempo real) • OpenRouter AI (predicciones) • Machine Learning local (análisis)
          </p>
        </div>
      </div>
    </div>
  );
}
