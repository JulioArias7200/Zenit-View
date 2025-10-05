'use client';

import { useState } from 'react';
import { useParcelStore } from '@/lib/stores/parcelStore';
import ParcelForm from './ParcelForm';
import ParcelCard from './ParcelCard';
import { loadSampleParcels } from '@/lib/data/sample-parcels';
import dynamic from 'next/dynamic';

// Importar CesiumGlobe dinámicamente (solo en cliente)
const CesiumGlobe = dynamic<{ parcels: any[]; onParcelSelect?: (parcelId: string) => void; focusedParcelId?: string }>(
  () => import('@/components/CesiumGlobe'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Cargando globo 3D...</p>
        </div>
      </div>
    ),
  }
);

interface ParcelManagementProps {
  onViewDetails?: () => void;
}

export default function ParcelManagement({ onViewDetails }: ParcelManagementProps = {}) {
  const { parcels, selectedParcel, selectParcel, deleteParcel, clearSelection, addParcel } = useParcelStore();
  const [showGlobe, setShowGlobe] = useState(false);

  const handleLoadSampleParcels = () => {
    if (confirm('¿Cargar 4 parcelas de ejemplo? Esto agregará parcelas de prueba en diferentes regiones de Bolivia.')) {
      loadSampleParcels(addParcel);
    }
  };

  const handleParcelCardClick = (parcelId: string) => {
    selectParcel(parcelId);
    setShowGlobe(true);
  };

  const handleViewDetails = (parcelId: string) => {
    selectParcel(parcelId);
    if (onViewDetails) onViewDetails();
  };

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-orbit-gray mb-4">
          Gestión de Parcelas
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-sprout-green/10 rounded-lg p-4 border border-sprout-green/20">
            <p className="text-sm text-sprout-green font-medium">Total de Parcelas</p>
            <p className="text-3xl font-bold text-sprout-green">{parcels.length}</p>
          </div>
          
          <div className="bg-cosmic-blue/10 rounded-lg p-4 border border-cosmic-blue/20">
            <p className="text-sm text-cosmic-blue font-medium">Área Total</p>
            <p className="text-3xl font-bold text-cosmic-blue">
              {parcels.reduce((sum, p) => sum + p.areaHectares, 0).toFixed(2)} ha
            </p>
          </div>
          
          <div className="bg-cherry-blossom/10 rounded-lg p-4 border border-cherry-blossom/20">
            <p className="text-sm text-cherry-blossom font-medium">Cultivos Diferentes</p>
            <p className="text-3xl font-bold text-cherry-blossom">
              {new Set(parcels.map(p => p.cropType)).size}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de nueva parcela */}
      <ParcelForm />

      {/* Botón para cargar parcelas de prueba */}
      {parcels.length === 0 && (
        <div className="bg-gradient-to-r from-cosmic-blue/10 to-sprout-green/10 border-2 border-dashed border-cosmic-blue/30 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-orbit-gray mb-2">
              ¿No tienes parcelas todavía?
            </h3>
            <p className="text-starlight-gray mb-4">
              Carga parcelas de ejemplo para ver cómo funcionan en el globo 3D
            </p>
            <button
              onClick={handleLoadSampleParcels}
              className="bg-nebular-orange text-white py-2 px-6 rounded-md hover:opacity-90 transition-all font-medium inline-flex items-center gap-2 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Cargar 4 Parcelas de Ejemplo
            </button>
          </div>
        </div>
      )}

      {/* Lista de parcelas */}
      {parcels.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-orbit-gray">
              Mis Parcelas ({parcels.length})
            </h3>
            {selectedParcel && (
              <button
                onClick={clearSelection}
                className="text-sm text-starlight-gray hover:text-orbit-gray"
              >
                Limpiar selección
              </button>
            )}
          </div>

          {/* Layout con tarjetas y globo: 30% / 70% */}
          <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
            {/* Columna izquierda: Lista de parcelas (30%) */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {parcels.map((parcel) => (
                  <ParcelCard
                    key={parcel.id}
                    parcel={parcel}
                    onSelect={() => handleParcelCardClick(parcel.id)}
                    onViewDetails={() => handleViewDetails(parcel.id)}
                    onDelete={() => {
                      if (confirm(`¿Eliminar la parcela "${parcel.name}"?`)) {
                        deleteParcel(parcel.id);
                        if (selectedParcel?.id === parcel.id) {
                          setShowGlobe(false);
                        }
                      }
                    }}
                    isSelected={selectedParcel?.id === parcel.id}
                  />
                ))}
              </div>
            </div>

            {/* Columna derecha: Globo 3D (70%) */}
            <div className="lg:sticky lg:top-6 h-[700px]">
              {showGlobe && selectedParcel ? (
                <div className="h-full bg-gray-900 rounded-lg overflow-hidden shadow-xl relative">
                  <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
                    <p className="text-sm font-semibold text-orbit-gray">
                      📍 {selectedParcel.name}
                    </p>
                    <p className="text-xs text-starlight-gray">
                      {selectedParcel.cropType} - {selectedParcel.areaHectares.toFixed(2)} ha
                    </p>
                  </div>
                  <button
                    onClick={() => setShowGlobe(false)}
                    className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-lg hover:bg-white transition-colors"
                    title="Cerrar globo"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <CesiumGlobe 
                    parcels={parcels} 
                    focusedParcelId={selectedParcel.id}
                  />
                </div>
              ) : (
                <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="text-6xl mb-4">🌍</div>
                    <h3 className="text-lg font-semibold text-orbit-gray mb-2">
                      Globo 3D Interactivo
                    </h3>
                    <p className="text-starlight-gray text-sm">
                      Haz clic en una parcela para ver su ubicación en el globo terráqueo
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
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
          <h3 className="mt-2 text-lg font-medium text-gray-900">No hay parcelas</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza creando tu primera parcela agrícola
          </p>
        </div>
      )}

      {/* Información adicional */}
      <div className="bg-cosmic-blue/10 border border-cosmic-blue/30 rounded-lg p-4">
        <h4 className="font-semibold text-cosmic-blue mb-2">💡 Consejos</h4>
        <ul className="text-sm text-cosmic-blue/90 space-y-1">
          <li>• Las parcelas se guardan automáticamente en tu navegador</li>
          <li>• Puedes usar Google Maps para obtener las coordenadas exactas</li>
          <li>• Selecciona una parcela para ver su análisis climático en la pestaña "Clima"</li>
        </ul>
      </div>
    </div>
  );
}
