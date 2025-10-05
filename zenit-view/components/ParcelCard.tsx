'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Parcel } from '@/lib/stores/parcelStore';
import { useParcelStore } from '@/lib/stores/parcelStore';
import { getCurrentWeatherFromOpenMeteo } from '@/lib/services/open-meteo-api';
import ParcelStatsModal from './ParcelStatsModal';
import ParcelPolygonEditor from './ParcelPolygonEditor';

interface ParcelCardProps {
  parcel: Parcel;
  onSelect: () => void;
  onDelete: () => void;
  onViewDetails?: () => void;
  isSelected?: boolean;
}

export default function ParcelCard({ parcel, onSelect, onDelete, onViewDetails, isSelected }: ParcelCardProps) {
  const updateParcel = useParcelStore((state) => state.updateParcel);
  const [isEditing, setIsEditing] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showPolygonEditor, setShowPolygonEditor] = useState(false);
  const [editForm, setEditForm] = useState({
    name: parcel.name,
    cropType: parcel.cropType,
    latitude: parcel.latitude.toString(),
    longitude: parcel.longitude.toString(),
    areaHectares: parcel.areaHectares.toString(),
    description: parcel.description || ''
  });
  const [showCoordinates, setShowCoordinates] = useState(false);
  const plantingDate = new Date(parcel.plantingDate);
  const daysPlanted = Math.floor((Date.now() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));
  const [weather, setWeather] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  useEffect(() => {
    loadWeather();
  }, [parcel.id]);

  const loadWeather = async () => {
    setLoadingWeather(true);
    try {
      const data = await getCurrentWeatherFromOpenMeteo(parcel.latitude, parcel.longitude);
      setWeather({
        temperature: data.temperature,
        feelsLike: data.feelsLike,
        humidity: data.humidity,
        windSpeed: data.windSpeed.toString(),
        description: data.description,
        icon: data.icon
      });
    } catch (error: any) {
      console.error('Error loading weather:', error);
      // Datos de respaldo si falla
      setWeather({
        temperature: Math.round(20 + Math.random() * 8), // 20-28°C
        feelsLike: Math.round(20 + Math.random() * 8),
        humidity: Math.round(50 + Math.random() * 30), // 50-80%
        windSpeed: (2 + Math.random() * 3).toFixed(1), // 2-5 m/s
        description: 'Datos no disponibles',
        icon: '01d'
      });
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.stopPropagation();
    const lat = parseFloat(editForm.latitude);
    const lon = parseFloat(editForm.longitude);
    const area = parseFloat(editForm.areaHectares);

    if (isNaN(lat) || isNaN(lon) || isNaN(area)) {
      alert('Por favor ingresa valores numéricos válidos');
      return;
    }

    updateParcel(parcel.id, {
      name: editForm.name,
      cropType: editForm.cropType,
      latitude: lat,
      longitude: lon,
      areaHectares: area,
      description: editForm.description
    });

    setIsEditing(false);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      name: parcel.name,
      cropType: parcel.cropType,
      latitude: parcel.latitude.toString(),
      longitude: parcel.longitude.toString(),
      areaHectares: parcel.areaHectares.toString(),
      description: parcel.description || ''
    });
    setIsEditing(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSavePolygon = (newCoordinates: [number, number][]) => {
    console.log('💾 Guardando polígono...', {
      parcelaId: parcel.id,
      parcelaNombre: parcel.name,
      puntos: newCoordinates.length,
      coordenadas: newCoordinates
    });

    // Calcular centro del polígono
    const centerLat = newCoordinates.reduce((sum, coord) => sum + coord[1], 0) / newCoordinates.length;
    const centerLon = newCoordinates.reduce((sum, coord) => sum + coord[0], 0) / newCoordinates.length;
    
    // Calcular nueva área usando fórmula de Shoelace
    const calculatePolygonArea = (coords: [number, number][]): number => {
      let area = 0;
      for (let i = 0; i < coords.length; i++) {
        const j = (i + 1) % coords.length;
        area += coords[i][0] * coords[j][1];
        area -= coords[j][0] * coords[i][1];
      }
      area = Math.abs(area) / 2;
      
      // Convertir de grados² a hectáreas (aproximación)
      // 1 grado ≈ 111km, entonces 1 grado² ≈ 12321 km² ≈ 1,232,100 hectáreas
      const hectares = area * 1232100;
      return hectares;
    };
    
    const newArea = calculatePolygonArea(newCoordinates);
    
    // Crear un nuevo array de coordenadas para forzar la actualización
    const updatedCoordinates = [...newCoordinates];
    
    // Actualizar parcela con nuevas coordenadas, centro y área
    updateParcel(parcel.id, {
      coordinates: updatedCoordinates,
      latitude: centerLat,
      longitude: centerLon,
      areaHectares: newArea,
      surfaceM2: newArea * 10000
    });
    
    console.log('✅ Polígono actualizado en el store:', {
      id: parcel.id,
      nombre: parcel.name,
      puntos: updatedCoordinates.length,
      centro: [centerLat.toFixed(6), centerLon.toFixed(6)],
      area: `${newArea.toFixed(4)} ha`,
      coordenadas: updatedCoordinates
    });
    
    // Pequeño delay para asegurar que el store se actualizó
    setTimeout(() => {
      console.log('🔄 Verificando actualización del store...');
      const parcelsStore = useParcelStore.getState().parcels;
      const parcelaActualizada = parcelsStore.find(p => p.id === parcel.id);
      console.log('📊 Parcela en el store:', {
        encontrada: !!parcelaActualizada,
        puntos: parcelaActualizada?.coordinates?.length || 0,
        coordenadas: parcelaActualizada?.coordinates
      });
    }, 100);
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-sprout-green' : ''
      }`}
      onClick={onSelect}
    >
      {/* Header simple */}
      <div className="mb-3">
        {isEditing ? (
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="text-lg font-semibold text-orbit-gray border-b-2 border-cosmic-blue focus:outline-none w-full"
            placeholder="Nombre de la parcela"
          />
        ) : (
          <>
            <h3 className="text-lg font-semibold text-orbit-gray">{parcel.name}</h3>
            {parcel.identifier && (
              <p className="text-xs text-starlight-gray font-mono">🆔 {parcel.identifier}</p>
            )}
          </>
        )}
      </div>

      {/* Contenido principal */}
      {isEditing ? (
        <form onClick={(e) => e.stopPropagation()} className="space-y-3 mb-3">
          <div>
            <label className="text-xs text-starlight-gray">Tipo de Cultivo</label>
            <input
              type="text"
              value={editForm.cropType}
              onChange={(e) => setEditForm({ ...editForm, cropType: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-cosmic-blue focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-starlight-gray">Latitud</label>
              <input
                type="text"
                value={editForm.latitude}
                onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-cosmic-blue focus:outline-none font-mono"
                placeholder="-16.5000"
              />
            </div>
            <div>
              <label className="text-xs text-starlight-gray">Longitud</label>
              <input
                type="text"
                value={editForm.longitude}
                onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-cosmic-blue focus:outline-none font-mono"
                placeholder="-68.1500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-starlight-gray">Área (hectáreas)</label>
            <input
              type="text"
              value={editForm.areaHectares}
              onChange={(e) => setEditForm({ ...editForm, areaHectares: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-cosmic-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-starlight-gray">Descripción</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-cosmic-blue focus:outline-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveEdit}
              className="flex-1 bg-sprout-green text-white py-2 rounded hover:opacity-90 transition-all text-sm font-medium shadow-md"
            >
              ✓ Guardar
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex-1 bg-gray-300 text-orbit-gray py-2 rounded hover:bg-gray-400 transition-colors text-sm font-medium"
            >
              ✕ Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-gray-600">
            <div className="flex items-center">
              <span className="text-xs bg-sprout-green/20 text-sprout-green px-2 py-1 rounded-full font-medium">
                {parcel.cropType}
              </span>
            </div>
            {parcel.surfaceM2 && (
              <span className="text-xs text-starlight-gray">
                {parcel.surfaceM2.toLocaleString()} m²
              </span>
            )}
          </div>

          <div className="flex items-center text-starlight-gray">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex-1">
              <p className="font-mono text-xs">
                {parcel.latitude >= 0 ? 'N' : 'S'} {Math.abs(parcel.latitude).toFixed(4)}°, 
                {parcel.longitude >= 0 ? 'E' : 'W'} {Math.abs(parcel.longitude).toFixed(4)}°
              </p>
              {parcel.coordinates && parcel.coordinates.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCoordinates(!showCoordinates);
                  }}
                  className="text-xs text-cosmic-blue hover:text-cosmic-blue/80 mt-1"
                >
                  {showCoordinates ? '▼' : '►'} {parcel.coordinates.length} puntos del polígono
                </button>
              )}
            </div>
          </div>

          {/* Coordenadas del polígono expandibles */}
          {showCoordinates && parcel.coordinates && parcel.coordinates.length > 0 && (
            <div className="bg-gray-50 rounded p-2 space-y-1" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold text-orbit-gray mb-1">Vértices del Polígono:</p>
              {parcel.coordinates.map((coord, idx) => (
                <div key={idx} className="text-xs font-mono text-starlight-gray flex items-center gap-2">
                  <span className="bg-cosmic-blue/20 text-cosmic-blue px-1.5 py-0.5 rounded">P{idx + 1}</span>
                  <span>Lon: {coord[0].toFixed(6)}°</span>
                  <span>Lat: {coord[1].toFixed(6)}°</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center text-starlight-gray">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <span>{parcel.areaHectares.toFixed(2)} hectáreas</span>
          </div>

          <div className="flex items-center text-starlight-gray">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              Siembra: {format(plantingDate, 'dd/MM/yyyy')} ({daysPlanted} días)
            </span>
          </div>

          {parcel.description && (
            <p className="text-starlight-gray text-xs mt-2 bg-nebular-orange/10 p-2 rounded border-l-2 border-nebular-orange">
              💬 {parcel.description}
            </p>
          )}
        </div>
      )}

      {/* Clima Actual */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        {loadingWeather ? (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cosmic-blue"></div>
            <span className="ml-2 text-xs text-starlight-gray">Cargando clima...</span>
          </div>
        ) : weather ? (
          <div className="bg-gradient-to-r from-cosmic-blue/10 to-cosmic-blue/5 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-cosmic-blue font-medium">
                🌤️ {weather.description}
              </p>
              {weather.description === 'Datos no disponibles' && (
                <span className="text-xs bg-nebular-orange/20 text-nebular-orange px-2 py-0.5 rounded-full">
                  Offline
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-starlight-gray">Temp</p>
                <p className="text-lg font-bold text-cosmic-blue">{weather.temperature}°</p>
              </div>
              <div>
                <p className="text-xs text-starlight-gray">Humedad</p>
                <p className="text-lg font-bold text-cosmic-blue">{weather.humidity}%</p>
              </div>
              <div>
                <p className="text-xs text-starlight-gray">Viento</p>
                <p className="text-lg font-bold text-cosmic-blue">{weather.windSpeed}m/s</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-starlight-gray">Clima no disponible</p>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      {!isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-2">
            {/* Botón Ver Detalles */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowStatsModal(true);
              }}
              className="flex flex-col items-center justify-center py-3 bg-cosmic-blue/10 hover:bg-cosmic-blue/20 rounded-lg transition-colors group"
              title="Ver estadísticas y clima"
            >
              <svg className="w-6 h-6 text-cosmic-blue group-hover:text-cosmic-blue/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-xs text-cosmic-blue font-medium mt-1">Ver Stats</span>
            </button>

            {/* Botón Editar Polígono */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPolygonEditor(true);
              }}
              className="flex flex-col items-center justify-center py-3 bg-sprout-green/10 hover:bg-sprout-green/20 rounded-lg transition-colors group"
              title="Editar polígono en mapa"
            >
              <svg className="w-6 h-6 text-sprout-green group-hover:text-sprout-green/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-xs text-sprout-green font-medium mt-1">Editar</span>
            </button>

            {/* Botón Eliminar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex flex-col items-center justify-center py-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
              title="Eliminar parcela"
            >
              <svg className="w-6 h-6 text-red-600 group-hover:text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-xs text-red-700 font-medium mt-1">Eliminar</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Estadísticas */}
      <ParcelStatsModal 
        parcel={parcel}
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />

      {/* Editor de Polígonos */}
      <ParcelPolygonEditor 
        parcel={parcel}
        isOpen={showPolygonEditor}
        onClose={() => setShowPolygonEditor(false)}
        onSave={handleSavePolygon}
      />
    </div>
  );
}
