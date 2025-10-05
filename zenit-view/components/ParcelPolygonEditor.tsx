'use client';

import { useEffect, useRef, useState } from 'react';
import type { Parcel } from '@/lib/stores/parcelStore';

interface ParcelPolygonEditorProps {
  parcel: Parcel;
  isOpen: boolean;
  onClose: () => void;
  onSave: (coordinates: [number, number][]) => void;
}

// Tipos de Google Maps
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function ParcelPolygonEditor({ parcel, isOpen, onClose, onSave }: ParcelPolygonEditorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  
  // Usar useRef en lugar de useState para evitar capas múltiples
  const polygonRef = useRef<any>(null);
  const closingLineRef = useRef<any>(null);
  
  const [coordinates, setCoordinates] = useState<[number, number][]>(
    (parcel.coordinates as [number, number][]) || [[parcel.longitude, parcel.latitude] as [number, number]]
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(false);
  const markersRef = useRef<any[]>([]);

  // Cargar Google Maps API
  useEffect(() => {
    if (!isOpen) return;

    const loadGoogleMaps = () => {
      // Verificar si ya está cargado
      if (window.google && window.google.maps) {
        setIsLoading(false);
        return;
      }

      // Verificar API Key
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        console.error('Google Maps API Key no configurada');
        setApiKeyError(true);
        setIsLoading(false);
        return;
      }

      // Crear script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsLoading(false);
      };
      script.onerror = () => {
        console.error('Error loading Google Maps');
        setApiKeyError(true);
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [isOpen]);

  // Inicializar mapa
  useEffect(() => {
    if (!isOpen || isLoading || !mapRef.current || !window.google) return;

    const center = coordinates.length > 0
      ? { lat: coordinates[0][1], lng: coordinates[0][0] }
      : { lat: parcel.latitude, lng: parcel.longitude };

    // Crear mapa
    const newMap = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 18,
      mapTypeId: 'satellite',
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: window.google.maps.ControlPosition.TOP_RIGHT,
        mapTypeIds: ['satellite', 'hybrid', 'terrain', 'roadmap']
      },
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      gestureHandling: 'greedy'
    });

    setMap(newMap);

    // Crear polígono inicial con ajuste de vista
    if (coordinates.length >= 3) {
      createPolygon(newMap, coordinates, true);
    }

    // Crear marcadores editables
    createEditableMarkers(newMap, coordinates);

  }, [isOpen, isLoading]);

  const createPolygon = (mapInstance: any, coords: [number, number][], shouldFitBounds: boolean = false) => {
    console.log('🎨 createPolygon llamado:', {
      polygonExiste: !!polygonRef.current,
      lineaExiste: !!closingLineRef.current,
      puntos: coords.length,
      coordenadas: coords,
      shouldFitBounds
    });

    try {
      // Eliminar polígono anterior si existe (limpieza sincrónica)
      if (polygonRef.current) {
        console.log('🧹 Limpiando polígono anterior...');
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }
      
      // Eliminar línea de cierre anterior si existe (limpieza sincrónica)
      if (closingLineRef.current) {
        console.log('🧹 Limpiando línea de cierre anterior...');
        closingLineRef.current.setMap(null);
        closingLineRef.current = null;
      }

      // Validar coordenadas
      if (!coords || coords.length === 0) {
        console.error('❌ Coordenadas vacías, no se puede crear polígono');
        return;
      }

      // Convertir coordenadas a formato Google Maps
      const paths = coords.map(coord => ({
        lat: coord[1],
        lng: coord[0]
      }));

      console.log('📍 Paths convertidos:', paths);

      if (coords.length >= 3) {
        // Crear polígono cerrado con animación suave
        const newPolygon = new window.google.maps.Polygon({
          paths,
          strokeColor: '#22c55e',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          fillColor: '#22c55e',
          fillOpacity: 0.25,
          editable: false,
          draggable: false,
          geodesic: true // Mejor renderizado en tiempo real
        });

        newPolygon.setMap(mapInstance);
        polygonRef.current = newPolygon; // Guardar referencia inmediata
        
        console.log('✅ Polígono creado y agregado al mapa');
        
        // Crear línea de cierre más visible (del último al primer punto)
        const closingPath = [
          { lat: coords[coords.length - 1][1], lng: coords[coords.length - 1][0] },
          { lat: coords[0][1], lng: coords[0][0] }
        ];
        
        const newClosingLine = new window.google.maps.Polyline({
          path: closingPath,
          strokeColor: '#16a34a', // Verde más oscuro
          strokeOpacity: 1,
          strokeWeight: 4,
          geodesic: true,
          icons: [{
            icon: {
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#16a34a'
            },
            offset: '50%'
          }]
        });
        
        newClosingLine.setMap(mapInstance);
        closingLineRef.current = newClosingLine; // Guardar referencia inmediata
        
        console.log('✅ Línea de cierre creada');
        
        // Solo ajustar bounds si es necesario (al inicializar o agregar/eliminar)
        if (shouldFitBounds && paths.length > 0) {
          try {
            console.log('📐 Ajustando bounds...');
            const bounds = new window.google.maps.LatLngBounds();
            paths.forEach((point: any) => bounds.extend(point));
            mapInstance.fitBounds(bounds);
            console.log('✅ Bounds ajustados');
          } catch (boundsError) {
            console.error('❌ Error ajustando bounds:', boundsError);
          }
        }
        
        console.log('✅ createPolygon completado exitosamente');
      } else if (coords.length === 2) {
        // Si solo hay 2 puntos, mostrar una línea
        const line = new window.google.maps.Polyline({
          path: paths,
          strokeColor: '#22c55e',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          geodesic: true
        });
        line.setMap(mapInstance);
        polygonRef.current = line; // Guardar referencia inmediata
        
        console.log('✅ Línea de 2 puntos creada');
      }
    } catch (error) {
      console.error('❌ ERROR en createPolygon:', error);
      console.error('Detalles:', {
        coords,
        puntos: coords?.length,
        mapInstance: !!mapInstance
      });
    }
  };

  // Función auxiliar para actualizar polígono sin recrear (optimizado para arrastre)
  const updatePolygonPaths = (coords: [number, number][]) => {
    if (!polygonRef.current) return;
    
    try {
      // Convertir coordenadas a formato Google Maps
      const paths = coords.map(coord => ({
        lat: coord[1],
        lng: coord[0]
      }));
      
      // Actualizar paths del polígono o línea sin recrearlo
      polygonRef.current.setPath(paths);
      
      // Actualizar línea de cierre solo si existe (polígonos de 3+ puntos)
      if (closingLineRef.current && coords.length >= 3) {
        const closingPath = [
          { lat: coords[coords.length - 1][1], lng: coords[coords.length - 1][0] },
          { lat: coords[0][1], lng: coords[0][0] }
        ];
        closingLineRef.current.setPath(closingPath);
      }
    } catch (error) {
      console.error('Error actualizando paths:', error);
    }
  };

  const createEditableMarkers = (mapInstance: any, coords: [number, number][]) => {
    console.log('🔵 createEditableMarkers:', {
      totalMarcadoresAnteriores: markersRef.current.length,
      totalCoordenadasNuevas: coords.length,
      coordenadas: coords
    });

    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    coords.forEach((coord, index) => {
      const isFirstPoint = index === 0;
      const isLastPoint = index === coords.length - 1;
      
      const marker = new window.google.maps.Marker({
        position: { lat: coord[1], lng: coord[0] },
        map: mapInstance,
        draggable: true,
        label: {
          text: isFirstPoint ? '🏁' : `${index + 1}`,
          color: 'white',
          fontSize: isFirstPoint ? '16px' : '12px',
          fontWeight: 'bold'
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isFirstPoint ? 12 : 10,
          fillColor: isFirstPoint ? '#dc2626' : '#3b82f6', // Rojo para el primero, azul para los demás
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: isFirstPoint ? 3 : 2
        },
        zIndex: isFirstPoint ? 1000 : (isLastPoint ? 999 : 100) // Primer punto siempre al frente
      });

      // Evento drag - actualiza en tiempo real mientras arrastra (OPTIMIZADO)
      marker.addListener('drag', () => {
        // Obtener coordenadas actuales de todos los marcadores
        const newCoords: [number, number][] = markersRef.current.map(m => {
          const pos = m.getPosition();
          return [pos.lng(), pos.lat()];
        });
        
        // Actualizar SOLO las coordenadas del polígono sin recrearlo
        updatePolygonPaths(newCoords);
      });

      // Evento dragend - guardar estado final
      marker.addListener('dragend', () => {
        const newCoords: [number, number][] = markersRef.current.map(m => {
          const pos = m.getPosition();
          return [pos.lng(), pos.lat()];
        });
        
        setCoordinates(newCoords);
        setHasChanges(true);
        
        // Actualizar paths sin recrear
        updatePolygonPaths(newCoords);
      });

      // Click derecho para eliminar
      marker.addListener('rightclick', (e: any) => {
        // Prevenir el menú contextual del navegador
        if (e && e.domEvent) {
          e.domEvent.preventDefault();
          e.domEvent.stopPropagation();
        }
        
        // Obtener el índice actual del marcador en el array
        const currentIndex = markersRef.current.indexOf(marker);
        
        // Obtener coordenadas ACTUALES de los marcadores en el mapa
        const currentCoords: [number, number][] = markersRef.current.map(m => {
          const pos = m.getPosition();
          return [pos.lng(), pos.lat()];
        });
        
        console.log('🗑️ Click derecho en marcador:', {
          indexOriginal: index,
          indexActual: currentIndex,
          totalMarcadores: markersRef.current.length,
          coordenadasActuales: currentCoords.length,
          coordenadasEstado: coordinates.length
        });
        
        if (currentIndex !== -1) {
          // Pasar mapInstance y coordenadas actuales al handler
          handleRemovePointWithCoords(currentIndex, mapInstance, currentCoords);
        }
      });

      markersRef.current.push(marker);
    });

    console.log('✅ createEditableMarkers completado:', {
      marcadoresCreados: markersRef.current.length,
      coincideConCoordenadas: markersRef.current.length === coords.length
    });
  };

  const updateCoordinatesFromMarkers = () => {
    const newCoords: [number, number][] = markersRef.current.map(marker => {
      const pos = marker.getPosition();
      return [pos.lng(), pos.lat()];
    });
    setCoordinates(newCoords);
    if (map) {
      createPolygon(map, newCoords);
    }
  };

  const handleAddPoint = () => {
    if (!map) return;

    // Agregar punto en el centro del mapa
    const center = map.getCenter();
    const newPoint: [number, number] = [center.lng(), center.lat()];
    const newCoords = [...coordinates, newPoint];
    
    // Actualizar estado
    setCoordinates(newCoords);
    setHasChanges(true);
    
    // Actualizar visuales inmediatamente con ajuste de vista
    createEditableMarkers(map, newCoords);
    createPolygon(map, newCoords, true);
    
    // Hacer zoom suave al nuevo punto
    map.panTo(center);
  };

  const handleRemovePointWithCoords = (index: number, mapInstance: any, currentCoords: [number, number][]) => {
    console.log('═══════════════════════════════════════');
    console.log('🗑️ INICIO handleRemovePointWithCoords:', {
      index,
      totalCoordenadasActuales: currentCoords.length,
      coordenadaAEliminar: currentCoords[index],
      todasLasCoordenadasActuales: currentCoords,
      mapaRecibido: !!mapInstance
    });

    if (currentCoords.length <= 2) {
      console.log('⚠️ No se puede eliminar: mínimo 2 puntos');
      alert('⚠️ Debe haber al menos 2 puntos para formar una línea.\n\nNo se puede eliminar más puntos.');
      return;
    }

    const pointLabel = index === 0 ? '🏁 Punto Inicial' : `Punto ${index + 1}`;
    
    if (confirm(`¿Eliminar ${pointLabel}?\n\nEl polígono se ajustará automáticamente.`)) {
      console.log('✅ Usuario confirmó eliminación');
      
      try {
        // Eliminar punto del array de coordenadas ACTUALES
        const newCoords = currentCoords.filter((_, i) => i !== index);
        
        console.log('📝 Nuevas coordenadas después de filtrar:', {
          coordinadasAntes: currentCoords.length,
          coordinadasDespues: newCoords.length,
          nuevasCoordenadas: newCoords,
          esValido: newCoords.length >= 2,
          tipo: newCoords.length >= 3 ? 'polígono' : newCoords.length === 2 ? 'línea' : 'punto'
        });
        
        // Validar que las nuevas coordenadas sean válidas
        if (newCoords.length < 2) {
          console.error('❌ ERROR: Las nuevas coordenadas tienen menos de 2 puntos');
          alert('Error: Debe haber al menos 2 puntos');
          return;
        }
        
        // Validar que mapInstance existe
        if (!mapInstance) {
          console.error('❌ ERROR: mapInstance no está definido');
          alert('Error: No se puede actualizar el mapa');
          return;
        }
        
        // Actualizar estado
        console.log('💾 Guardando nuevas coordenadas en estado...');
        setCoordinates(newCoords);
        setHasChanges(true);
        
        console.log('🔄 Actualizando visuales con mapInstance...');
        console.log('📊 Estado del mapa:', {
          mapValido: !!mapInstance,
          tienePolygon: !!polygonRef.current,
          tieneLinea: !!closingLineRef.current,
          totalMarcadores: markersRef.current.length
        });
        
        // Actualizar visuales inmediatamente
        // 1. Recrear marcadores con nueva numeración
        console.log('🔄 Paso 1: Recreando marcadores...');
        createEditableMarkers(mapInstance, newCoords);
        
        // 2. Redibujar polígono cerrado con ajuste de vista
        console.log('🔄 Paso 2: Redibujando polígono...');
        createPolygon(mapInstance, newCoords, true);
        
        console.log('✅ Marcadores y polígono actualizados completamente');
      } catch (error) {
        console.error('❌ ERROR en handleRemovePointWithCoords:', error);
        console.error('Stack:', error);
      }
      
      console.log('═══════════════════════════════════════');
    } else {
      console.log('❌ Usuario canceló eliminación');
    }
  };

  const handleResetToCenter = () => {
    if (!map) return;
    
    const center = coordinates.length > 0
      ? { lat: coordinates[0][1], lng: coordinates[0][0] }
      : { lat: parcel.latitude, lng: parcel.longitude };
    
    map.setCenter(center);
    map.setZoom(18);
  };

  const handleSave = () => {
    if (coordinates.length < 3) {
      alert('⚠️ El polígono debe tener al menos 3 puntos.\n\nAgrega más puntos antes de guardar.');
      return;
    }
    
    // Confirmar antes de guardar
    const area = polygonRef.current && window.google?.maps?.geometry?.spherical 
      ? (window.google.maps.geometry.spherical.computeArea(polygonRef.current.getPath()) / 10000).toFixed(4)
      : 'N/A';
    
    if (confirm(`💾 ¿Guardar cambios en el polígono?\n\n📊 Puntos: ${coordinates.length}\n📐 Área: ${area} hectáreas\n\n✅ El polígono se actualizará en el mapa 3D.`)) {
      onSave(coordinates);
      
      // Mostrar mensaje de éxito
      setTimeout(() => {
        alert('✅ ¡Polígono guardado!\n\nLos cambios se han aplicado correctamente.\nEl mapa 3D se actualizará automáticamente.');
      }, 100);
      
      onClose();
    }
  };

  const calculateArea = () => {
    if (!polygonRef.current || !window.google || !window.google.maps?.geometry?.spherical) return '0';
    try {
      const areaMeters = window.google.maps.geometry.spherical.computeArea(polygonRef.current.getPath());
      const areaHectares = areaMeters / 10000;
      return areaHectares.toFixed(4);
    } catch (error) {
      console.error('Error calculating area:', error);
      return '0';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-md rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">✏️ Editor de Polígono</h2>
              <p className="text-sm text-green-100">
                {parcel.name}
              </p>
              <p className="text-xs text-green-100 mt-1">
                📍 {parcel.latitude.toFixed(4)}°, {parcel.longitude.toFixed(4)}°
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

        {/* Contenido: 70% Mapa / 30% Controles */}
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {/* Columna izquierda: Mapa 70% */}
          <div className="w-[70%] flex flex-col">
            {isLoading ? (
              <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando mapa...</p>
                </div>
              </div>
            ) : apiKeyError ? (
              <div className="w-full h-full bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200">
                <div className="text-center p-8 max-w-md">
                  <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-bold text-red-900 mb-2">⚠️ Error de Google Maps API</h3>
                  <p className="text-sm text-red-700 mb-4">
                    No se puede cargar el mapa. Posibles causas:
                  </p>
                  <div className="bg-white rounded-lg p-4 text-left space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">1. API Key no configurada:</p>
                      <ol className="text-xs text-gray-600 space-y-1 list-disc list-inside pl-2">
                        <li>Crea archivo <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
                        <li>Agrega: <code className="bg-gray-100 px-1 rounded text-[10px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_clave</code></li>
                        <li>Reinicia el servidor</li>
                      </ol>
                    </div>
                    
                    <div className="border-t pt-2">
                      <p className="text-xs font-semibold text-orange-700 mb-1">2. Facturación no habilitada:</p>
                      <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside pl-2">
                        <li>Ve a <a href="https://console.cloud.google.com/billing" target="_blank" className="text-blue-600 underline">Google Cloud Billing</a></li>
                        <li>Habilita facturación en tu proyecto</li>
                        <li>Google ofrece $200 gratis/mes</li>
                      </ul>
                    </div>
                    
                    <div className="border-t pt-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">3. Obtener API Key:</p>
                      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-xs text-blue-600 underline block">
                        → Google Cloud Console - Credenciales
                      </a>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      📖 Ver guía completa: <code className="bg-white px-1 rounded">GOOGLE_MAPS_SETUP.md</code>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                ref={mapRef} 
                className="w-full h-full rounded-lg border-2 border-gray-300 shadow-inner"
              />
            )}
          </div>

          {/* Columna derecha: Controles 30% */}
          <div className="w-[30%] flex flex-col gap-4 overflow-y-auto">
            {/* Instrucciones */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-blue-800">
                  <p className="font-semibold mb-1">Instrucciones:</p>
                  <ul className="space-y-1">
                    <li>🔴 <strong>Punto inicial:</strong> Marcador rojo con 🏁</li>
                    <li>🔵 <strong>Otros puntos:</strong> Marcadores azules numerados</li>
                    <li>↔️ <strong>Mover:</strong> Arrastrar cualquier marcador</li>
                    <li>➕ <strong>Agregar:</strong> Botón "+ Agregar Punto"</li>
                    <li>🗑️ <strong>Eliminar:</strong> Click derecho (min 3)</li>
                    <li>🔄 <strong>Cierre auto:</strong> Último punto se conecta al primero</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-2">
              <button
                onClick={handleAddPoint}
                disabled={apiKeyError}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Punto
              </button>

              <button
                onClick={handleResetToCenter}
                disabled={apiKeyError}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Centrar Vista
              </button>
              
              {/* Ayuda para eliminar puntos */}
              {!apiKeyError && coordinates.length > 3 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                  <p className="font-semibold mb-1">💡 Para eliminar un punto:</p>
                  <p>Click derecho sobre cualquier marcador en el mapa</p>
                </div>
              )}
            </div>

            {/* Estadísticas */}
            <div className="space-y-2">
              <div className="bg-gray-100 px-3 py-2 rounded-lg">
                <span className="text-xs text-gray-600">Puntos: </span>
                <span className="text-sm font-bold text-gray-800">{coordinates.length}</span>
              </div>

              {polygonRef.current && window.google && !apiKeyError && (
                <div className="bg-green-100 px-3 py-2 rounded-lg">
                  <span className="text-xs text-green-600">Área: </span>
                  <span className="text-sm font-bold text-green-800">{calculateArea()} ha</span>
                </div>
              )}

              {hasChanges && (
                <div className="bg-orange-100 px-3 py-2 rounded-lg flex items-center gap-2">
                  <span className="text-xs text-orange-600">● Cambios sin guardar</span>
                </div>
              )}
            </div>

            {/* Lista de coordenadas */}
            <div className="bg-gray-50 rounded-lg p-3 flex-1 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-700 mb-2">Coordenadas del Polígono:</p>
              <div className="space-y-2">
                {coordinates.map((coord, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <div 
                      key={idx} 
                      className={`text-xs font-mono bg-white p-2 rounded border-2 ${
                        isFirst ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <div className={`font-bold mb-1 flex items-center gap-1 ${
                        isFirst ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {isFirst ? '🏁 Punto Inicial' : `Punto ${idx + 1}`}
                      </div>
                      <div className="text-gray-600">
                        Lat: {coord[1].toFixed(6)}<br />
                        Lng: {coord[0].toFixed(6)}
                      </div>
                    </div>
                  );
                })}
                {coordinates.length >= 3 && (
                  <div className="text-xs bg-green-50 border-2 border-green-300 p-2 rounded">
                    <div className="font-bold text-green-700 mb-1">✅ Polígono Cerrado</div>
                    <div className="text-green-600 text-[10px]">
                      El punto {coordinates.length} se conecta automáticamente con el punto inicial 🏁
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-4 py-3 rounded-b-lg border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            🗺️ Google Maps API • Satellite View
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || coordinates.length < 3 || apiKeyError}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              💾 Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
