'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ClimateDataView from '@/components/ClimateDataView';
import ParcelManagement from '@/components/ParcelManagement';
import FloweringAnalysis from '@/components/FloweringAnalysis';
import ParcelDetailView from '@/components/ParcelDetailView';
import ModelTrainingPage from '@/components/ModelTrainingPage';
import { useParcelStore } from '@/lib/stores/parcelStore';

// Importar CesiumGlobe dinámicamente (solo en cliente)
const CesiumGlobe = dynamic<{ parcels: any[]; onParcelSelect?: (parcelId: string) => void }>(() => import('@/components/CesiumGlobe'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-xl">Cargando globo terráqueo 3D...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [activeTab, setActiveTab] = useState('parcelas');
  const parcels = useParcelStore((state) => state.parcels);

  return (
    <main className="min-h-screen bg-gradient-to-br from-lunar-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-cosmic-blue">
                ZENIT VIEW
              </h1>
              <p className="text-sm text-starlight-gray mt-1">
                Plataforma de Análisis de Parcelas Agrícolas
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-sprout-green/20 text-sprout-green rounded-full text-sm font-medium">
                ✓ NASA API
              </span>
              <span className="px-3 py-1 bg-cosmic-blue/20 text-cosmic-blue rounded-full text-sm font-medium">
                ✓ OpenWeather
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {['dashboard', 'parcelas', 'detalle', 'clima', 'floracion', 'entrenamiento'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-cosmic-blue border-b-2 border-cosmic-blue'
                  : 'text-starlight-gray hover:text-cosmic-blue'
              }`}
            >
              {tab === 'parcelas' ? '🗺️ Parcelas' : tab === 'entrenamiento' ? '🎓 Entrenamiento' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orbit-gray">
                  Parcelas Registradas
                </h3>
                <span className="text-3xl">🌾</span>
              </div>
              <p className="text-4xl font-bold text-sprout-green">{parcels.length}</p>
              <p className="text-sm text-starlight-gray mt-2">
                {parcels.length === 1 ? 'Parcela registrada' : 'Parcelas registradas'}
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orbit-gray">
                  Análisis Climático
                </h3>
                <span className="text-3xl">🛰️</span>
              </div>
              <p className="text-4xl font-bold text-cosmic-blue">NASA</p>
              <p className="text-sm text-starlight-gray mt-2">
                Datos climáticos disponibles
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orbit-gray">
                  Detección de Floración
                </h3>
                <span className="text-3xl">🌸</span>
              </div>
              <p className="text-4xl font-bold text-cherry-blossom">ML</p>
              <p className="text-sm text-starlight-gray mt-2">
                Modelo de machine learning
              </p>
            </div>
          </div>
        )}

        {activeTab === 'parcelas' && (
          <ParcelManagement onViewDetails={() => setActiveTab('detalle')} />
        )}

        {activeTab === 'detalle' && (
          <ParcelDetailView />
        )}

        {activeTab === 'clima' && (
          <ClimateDataView />
        )}

        {activeTab === 'floracion' && (
          <FloweringAnalysis />
        )}

        {activeTab === 'entrenamiento' && (
          <ModelTrainingPage />
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-starlight-gray">
        <p className="text-sm">
          ZENIT VIEW - Plataforma de Análisis Agrícola con IA | 2025
        </p>
      </footer>
    </main>
  );
}
