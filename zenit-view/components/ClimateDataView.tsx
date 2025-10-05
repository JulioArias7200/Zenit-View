'use client';

import { useState } from 'react';
import { getNASAClimateData, processNASADataForCharts, getClimateSummary } from '@/lib/services/nasa-api';
import ClimateChart from './ClimateChart';
import CurrentWeatherCard from './CurrentWeatherCard';

export default function ClimateDataView() {
  const [climateData, setClimateData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Coordenadas por defecto (La Paz, Bolivia)
  const [latitude, setLatitude] = useState(-16.5);
  const [longitude, setLongitude] = useState(-68.15);

  const fetchClimateData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener datos de los últimos 30 días
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };

      const data = await getNASAClimateData({
        latitude,
        longitude,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      });

      setClimateData(data);
      const processed = processNASADataForCharts(data);
      setChartData(processed);
    } catch (err) {
      setError('Error al obtener datos climáticos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const summary = climateData ? getClimateSummary(climateData) : null;

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-orbit-gray mb-4">
          Datos Climáticos
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-orbit-gray mb-2">
              Latitud
            </label>
            <input
              type="number"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value))}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-orbit-gray mb-2">
              Longitud
            </label>
            <input
              type="number"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value))}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchClimateData}
              disabled={loading}
              className="w-full bg-nebular-orange text-white py-2 px-4 rounded-md hover:opacity-90 disabled:bg-gray-400 transition-all font-medium shadow-md"
            >
              {loading ? 'Cargando...' : '🛰️ Obtener Datos NASA'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Clima actual */}
      <CurrentWeatherCard latitude={latitude} longitude={longitude} />

      {/* Resumen estadístico */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-starlight-gray">Temp. Promedio</p>
            <p className="text-2xl font-bold text-nebular-orange">
              {summary.avgTemperature.toFixed(1)}°C
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-starlight-gray">Temp. Máxima</p>
            <p className="text-2xl font-bold text-cherry-blossom">
              {summary.maxTemperature.toFixed(1)}°C
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-starlight-gray">Temp. Mínima</p>
            <p className="text-2xl font-bold text-cosmic-blue">
              {summary.minTemperature.toFixed(1)}°C
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-starlight-gray">Precipitación Total</p>
            <p className="text-2xl font-bold text-cosmic-blue">
              {summary.totalPrecipitation.toFixed(1)} mm
            </p>
          </div>
        </div>
      )}

      {/* Gráfico de temperatura */}
      {chartData.length > 0 && (
        <>
          <ClimateChart 
            data={chartData} 
            title="Temperaturas (últimos 30 días)" 
          />
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-orbit-gray mb-4">
              Fuente de Datos
            </h3>
            <div className="flex items-center gap-2 text-sm text-starlight-gray">
              <img 
                src="https://power.larc.nasa.gov/images/power_logo.jpg" 
                alt="NASA POWER" 
                className="h-8"
              />
              <p>
                NASA POWER API - Datos climáticos globales satelitales
              </p>
            </div>
          </div>
        </>
      )}

      {/* Instrucciones si no hay datos */}
      {!climateData && !loading && (
        <div className="bg-cosmic-blue/10 border border-cosmic-blue/30 text-cosmic-blue px-4 py-3 rounded">
          <p className="font-semibold">ℹ️ Instrucciones:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Ingresa las coordenadas de tu parcela (latitud y longitud)</li>
            <li>Haz clic en "Obtener Datos NASA" para cargar información climática</li>
            <li>Los datos provienen de satélites de NASA y cubren todo el mundo</li>
            <li>Se mostrarán datos de los últimos 30 días</li>
          </ul>
        </div>
      )}
    </div>
  );
}
