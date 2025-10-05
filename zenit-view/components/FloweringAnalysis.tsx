'use client';

import { useState, useEffect } from 'react';
import { loadFloweringData, analyzeFloweringStatus, getFloweringStats, prepareChartData, type FloweringDataPoint } from '@/lib/services/flowering-data';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FloweringAnalysis() {
  const [data, setData] = useState<FloweringDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const floweringData = await loadFloweringData();
        setData(floweringData);
        
        // Tomar solo los últimos 60 puntos para el gráfico
        const recentData = floweringData.slice(-60);
        setChartData(prepareChartData(recentData));
        setStats(getFloweringStats(floweringData));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cherry-blossom mx-auto mb-4"></div>
          <p className="text-starlight-gray">Cargando datos de floración...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">No se pudieron cargar los datos de floración</p>
      </div>
    );
  }

  // Analizar estado actual (último punto de datos)
  const latestData = data[data.length - 1];
  const floweringStatus = analyzeFloweringStatus(latestData.NDVI, latestData.NDVI_change);

  return (
    <div className="space-y-4">
      {/* Header Compacto */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              🌸 Análisis de Detección de Floración
            </h2>
            <p className="text-white/90 text-sm">
              Basado en índices de vegetación (NDVI/EVI) y variables climáticas
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
              ML Local
            </span>
            <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
              OpenRouter AI
            </span>
          </div>
        </div>
      </div>

      {/* Estado de APIs - Compacto */}
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">Fuentes de Datos</h4>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"></span>
              Dataset Local
            </span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
              OpenRouter AI
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              NASA POWER
            </span>
          </div>
        </div>
      </div>

      {/* Estado Actual de Floración - Compacto */}
      <div 
        className="rounded-lg shadow-md p-4 text-white"
        style={{ backgroundColor: floweringStatus.color }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-1">{floweringStatus.status}</h3>
            <p className="text-white/90 text-sm mb-3">{floweringStatus.description}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                <p className="text-white/80 text-xs mb-0.5">Probabilidad</p>
                <p className="text-2xl font-bold">{floweringStatus.probability}%</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                <p className="text-white/80 text-xs mb-0.5">NDVI Actual</p>
                <p className="text-xl font-bold">{latestData.NDVI.toFixed(3)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                <p className="text-white/80 text-xs mb-0.5">Cambio NDVI</p>
                <p className="text-xl font-bold">
                  {latestData.NDVI_change > 0 ? '+' : ''}{(latestData.NDVI_change * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          <div className="text-5xl ml-4">🌸</div>
        </div>
      </div>

      {/* Estadísticas del Dataset - Compacto */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-white rounded-lg shadow-sm p-3 border border-green-200">
            <p className="text-xs text-starlight-gray">NDVI Promedio</p>
            <p className="text-xl font-bold text-sprout-green">{stats.avgNDVI}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border border-orange-200">
            <p className="text-xs text-starlight-gray">Temp. Promedio</p>
            <p className="text-xl font-bold text-nebular-orange">{stats.avgTemp}°C</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border border-pink-200">
            <p className="text-xs text-starlight-gray">Eventos de Floración</p>
            <p className="text-xl font-bold text-cherry-blossom">{stats.floweringEvents}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border border-blue-200">
            <p className="text-xs text-starlight-gray">Datos Totales</p>
            <p className="text-xl font-bold text-cosmic-blue">{stats.totalDataPoints}</p>
          </div>
        </div>
      )}

      {/* Gráfico NDVI/EVI - Compacto */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-sm font-semibold text-orbit-gray mb-3 flex items-center gap-2">
          📈 Índices de Vegetación (Últimos 60 registros)
          <span className="text-xs font-normal text-gray-500">(Dataset Local + NASA POWER)</span>
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="NDVI" 
              stroke="#A4DE02" 
              name="NDVI"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="EVI" 
              stroke="#0B3D91" 
              name="EVI"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico Temperatura - Compacto */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-sm font-semibold text-orbit-gray mb-3 flex items-center gap-2">
          🌡️ Temperatura y Precipitación
          <span className="text-xs font-normal text-gray-500">(NASA POWER API)</span>
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="temperatura" 
              stroke="#FFB347" 
              name="Temperatura (°C)"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="precipitacion" 
              stroke="#0B3D91" 
              name="Precipitación 7d (mm)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Grid de Información - Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Información del Dataset */}
        <div className="bg-cosmic-blue/10 border border-cosmic-blue/30 rounded-lg p-4">
          <h4 className="font-semibold text-cosmic-blue mb-2 text-sm flex items-center gap-1">
            📊 Información del Dataset
          </h4>
          <div className="space-y-1 text-xs text-cosmic-blue/90">
            <p><strong>Periodo:</strong> {stats?.dateRange.start} - {stats?.dateRange.end}</p>
            <p><strong>Registros:</strong> {stats?.totalDataPoints} puntos de datos</p>
            <p><strong>NDVI Rango:</strong> {stats?.minNDVI} - {stats?.maxNDVI}</p>
            <p><strong>Eventos Detectados:</strong> {stats?.floweringEvents} floraciones</p>
          </div>
        </div>

        {/* Explicación del Modelo */}
        <div className="bg-cherry-blossom/10 border border-cherry-blossom/30 rounded-lg p-4">
          <h4 className="font-semibold text-cherry-blossom mb-2 text-sm flex items-center gap-1">
            🤖 Cómo Funciona la Detección
          </h4>
          <ul className="text-xs text-cherry-blossom/90 space-y-1">
            <li>• <strong>NDVI:</strong> Mide salud y densidad de vegetación</li>
            <li>• <strong>EVI:</strong> Versión mejorada del NDVI</li>
            <li>• <strong>Cambio NDVI:</strong> Detecta crecimiento rápido</li>
            <li>• <strong>Clima:</strong> Condiciones que favorecen floración</li>
            <li>• <strong>Umbral:</strong> NDVI {'>'}0.7 + Cambio {'>'} 3%</li>
          </ul>
        </div>
      </div>

      {/* Panel de APIs y Tecnologías - Compacto */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          Tecnologías de Detección de Floración
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Dataset Local */}
          <div className="bg-white rounded-lg p-2.5 border border-pink-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📊</span>
              <div>
                <h4 className="text-xs font-bold text-pink-700">Dataset Local</h4>
                <p className="text-xs text-gray-600">Datos históricos NDVI/EVI</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-xs text-green-700 font-medium">{stats?.totalDataPoints || 0} registros</span>
            </div>
          </div>

          {/* OpenRouter AI */}
          <div className="bg-white rounded-lg p-2.5 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🤖</span>
              <div>
                <h4 className="text-xs font-bold text-purple-700">OpenRouter AI</h4>
                <p className="text-xs text-gray-600">Predicción inteligente</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-xs text-green-700 font-medium">GPT-OSS-20B Activo</span>
            </div>
          </div>

          {/* NASA POWER */}
          <div className="bg-white rounded-lg p-2.5 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🛰️</span>
              <div>
                <h4 className="text-xs font-bold text-blue-700">NASA POWER</h4>
                <p className="text-xs text-gray-600">Datos climáticos</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-xs text-green-700 font-medium">Temperatura y lluvia</span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            <strong>Metodología:</strong> Análisis de índices de vegetación (NDVI/EVI) combinado con datos climáticos de NASA y predicciones de IA para detectar patrones de floración
          </p>
        </div>
      </div>
    </div>
  );
}
