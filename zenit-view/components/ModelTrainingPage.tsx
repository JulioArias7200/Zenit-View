'use client';

import { useEffect, useRef, useState } from 'react';

// Tipos de Google Maps
declare global {
  interface Window {
    google: any;
  }
}

interface TrainingResult {
  message: string;
  polygon: [number, number][];
  model_status: any;
}

interface PredictionResult {
  message: string;
  polygon: [number, number][];
  current_data: any;
  flowering_prediction: any;
}

export default function ModelTrainingPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const polygonRef = useRef<any>(null);
  const closingLineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const mapClickListenerRef = useRef<any>(null);

  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(false);
  
  // Estados de entrenamiento y predicción
  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para mostrar/ocultar detalles JSON
  const [showTrainingDetails, setShowTrainingDetails] = useState(false);
  const [showPredictionDetails, setShowPredictionDetails] = useState(false);
  
  // Estado del backend
  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  // Verificar estado del backend
  useEffect(() => {
    const checkBackend = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      try {
        const response = await fetch(`${backendUrl}/health`, {
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          setBackendStatus('available');
        } else {
          setBackendStatus('unavailable');
        }
      } catch (error) {
        setBackendStatus('unavailable');
      }
    };

    checkBackend();
    // Verificar cada 30 segundos
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cargar Google Maps API
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsLoading(false);
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        console.error('Google Maps API Key no configurada');
        setApiKeyError(true);
        setIsLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoading(false);
      script.onerror = () => {
        console.error('Error loading Google Maps');
        setApiKeyError(true);
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (isLoading || !mapRef.current || !window.google) return;

    const center = { lat: -16.5, lng: -68.15 }; // La Paz, Bolivia - centro por defecto

    const newMap = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
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
  }, [isLoading]);

  // Manejar clicks en el mapa para agregar puntos
  useEffect(() => {
    if (!map) return;

    // Remover listener anterior si existe
    if (mapClickListenerRef.current) {
      window.google.maps.event.removeListener(mapClickListenerRef.current);
    }

    // Agregar nuevo listener
    const listener = map.addListener('click', (e: any) => {
      const newPoint: [number, number] = [e.latLng.lng(), e.latLng.lat()];
      setCoordinates(prevCoords => {
        const newCoords = [...prevCoords, newPoint];
        
        // Actualizar marcadores y polígono inmediatamente
        setTimeout(() => {
          createEditableMarkers(map, newCoords);
          if (newCoords.length >= 3) {
            createPolygon(map, newCoords);
          } else if (newCoords.length === 2) {
            // Crear línea para 2 puntos
            createPolygon(map, newCoords);
          }
        }, 0);
        
        return newCoords;
      });
    });

    mapClickListenerRef.current = listener;

    // Cleanup
    return () => {
      if (mapClickListenerRef.current) {
        window.google.maps.event.removeListener(mapClickListenerRef.current);
      }
    };
  }, [map, coordinates]);

  // Función auxiliar para actualizar polígono sin recrear (optimizado para arrastre)
  const updatePolygonPaths = (coords: [number, number][]) => {
    if (!polygonRef.current) return;
    
    try {
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

  const createPolygon = (mapInstance: any, coords: [number, number][]) => {
    // Eliminar polígono anterior
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    if (closingLineRef.current) {
      closingLineRef.current.setMap(null);
      closingLineRef.current = null;
    }

    if (!coords || coords.length === 0) return;

    const paths = coords.map(coord => ({
      lat: coord[1],
      lng: coord[0]
    }));

    if (coords.length >= 3) {
      // Crear polígono cerrado
      const newPolygon = new window.google.maps.Polygon({
        paths,
        strokeColor: '#A4DE02',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: '#A4DE02',
        fillOpacity: 0.25,
        editable: false,
        draggable: false,
        geodesic: true
      });

      newPolygon.setMap(mapInstance);
      polygonRef.current = newPolygon;

      // Línea de cierre
      const closingPath = [
        { lat: coords[coords.length - 1][1], lng: coords[coords.length - 1][0] },
        { lat: coords[0][1], lng: coords[0][0] }
      ];

      const newClosingLine = new window.google.maps.Polyline({
        path: closingPath,
        strokeColor: '#7CB502',
        strokeOpacity: 1,
        strokeWeight: 4,
        geodesic: true
      });

      newClosingLine.setMap(mapInstance);
      closingLineRef.current = newClosingLine;
    } else if (coords.length === 2) {
      // Si solo hay 2 puntos, mostrar una línea
      const line = new window.google.maps.Polyline({
        path: paths,
        strokeColor: '#A4DE02',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        geodesic: true
      });
      line.setMap(mapInstance);
      polygonRef.current = line;
    }
  };

  const createEditableMarkers = (mapInstance: any, coords: [number, number][]) => {
    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    coords.forEach((coord, index) => {
      const isFirstPoint = index === 0;

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
          fillColor: isFirstPoint ? '#dc2626' : '#0B3D91',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: isFirstPoint ? 3 : 2
        },
        zIndex: isFirstPoint ? 1000 : 100
      });

      // Evento drag - actualiza en tiempo real mientras arrastra
      marker.addListener('drag', () => {
        const newCoords: [number, number][] = markersRef.current.map(m => {
          const pos = m.getPosition();
          return [pos.lng(), pos.lat()];
        });
        // Actualizar polígono en tiempo real
        updatePolygonPaths(newCoords);
      });

      // Arrastrar marcador - guardar estado final
      marker.addListener('dragend', () => {
        const newCoords: [number, number][] = markersRef.current.map(m => {
          const pos = m.getPosition();
          return [pos.lng(), pos.lat()];
        });
        setCoordinates(newCoords);
        if (newCoords.length >= 3) {
          createPolygon(mapInstance, newCoords);
        }
      });

      // Click derecho para eliminar
      marker.addListener('rightclick', (e: any) => {
        if (e && e.domEvent) {
          e.domEvent.preventDefault();
          e.domEvent.stopPropagation();
        }
        
        const currentIndex = markersRef.current.indexOf(marker);
        const currentCoords: [number, number][] = markersRef.current.map(m => {
          const pos = m.getPosition();
          return [pos.lng(), pos.lat()];
        });
        
        if (currentCoords.length <= 3) {
          alert('⚠️ Debe haber al menos 3 puntos para formar un polígono.');
          return;
        }
        
        if (currentIndex !== -1) {
          const newCoords = currentCoords.filter((_, i) => i !== currentIndex);
          setCoordinates(newCoords);
          createEditableMarkers(mapInstance, newCoords);
          createPolygon(mapInstance, newCoords);
        }
      });

      markersRef.current.push(marker);
    });
  };

  const handleClearPolygon = () => {
    if (confirm('¿Limpiar todos los puntos del polígono?')) {
      setCoordinates([]);
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (polygonRef.current) polygonRef.current.setMap(null);
      if (closingLineRef.current) closingLineRef.current.setMap(null);
      setTrainingResult(null);
      setPredictionResult(null);
      setError(null);
    }
  };

  const handleTrainModel = async () => {
    if (coordinates.length < 3) {
      alert('⚠️ Debe seleccionar al menos 3 puntos para formar un polígono.');
      return;
    }

    setIsTraining(true);
    setError(null);
    setTrainingResult(null);

    try {
      const response = await fetch('/api/train-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al entrenar el modelo');
      }

      const result = await response.json();
      setTrainingResult(result);
    } catch (err: any) {
      setError(err.message || 'Error al entrenar el modelo');
      console.error('Error training model:', err);
    } finally {
      setIsTraining(false);
    }
  };

  const handlePredictBloom = async () => {
    if (coordinates.length < 3) {
      alert('⚠️ Debe seleccionar al menos 3 puntos para formar un polígono.');
      return;
    }

    setIsPredicting(true);
    setError(null);
    setPredictionResult(null);

    try {
      const response = await fetch('/api/predict-bloom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al predecir floración');
      }

      const result = await response.json();
      setPredictionResult(result);
    } catch (err: any) {
      setError(err.message || 'Error al predecir floración');
      console.error('Error predicting bloom:', err);
    } finally {
      setIsPredicting(false);
    }
  };

  const calculateArea = () => {
    if (!polygonRef.current || !window.google?.maps?.geometry?.spherical) return '0';
    try {
      const areaMeters = window.google.maps.geometry.spherical.computeArea(polygonRef.current.getPath());
      const areaHectares = areaMeters / 10000;
      return areaHectares.toFixed(4);
    } catch (error) {
      return '0';
    }
  };

  return (
    <div className="w-full flex flex-col bg-gradient-to-br from-blue-50 to-green-50 rounded-lg" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B3D91] to-[#A4DE02] text-white p-4 shadow-lg rounded-t-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">🌸 Entrenamiento de Modelo de Floración</h1>
            <p className="text-xs text-blue-100">
              Selecciona un área en el mapa para entrenar el modelo y predecir la floración
            </p>
          </div>
          
          {/* Indicador de estado del backend */}
          <div className="ml-4">
            {backendStatus === 'checking' ? (
              <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span className="text-xs font-medium">Verificando backend...</span>
                </div>
              </div>
            ) : backendStatus === 'available' ? (
              <div className="bg-green-500/90 backdrop-blur-sm px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-xs font-bold">Backend Activo</p>
                    <p className="text-[10px] opacity-90">Python FastAPI</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-orange-500/90 backdrop-blur-sm px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <div>
                    <p className="text-xs font-bold">Modo Fallback</p>
                    <p className="text-[10px] opacity-90">OpenRouter AI</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex gap-4 p-4 flex-1" style={{ minHeight: '700px' }}>
        {/* Columna Izquierda: Mapa 60% */}
        <div className="w-[60%] flex flex-col gap-4">
          {/* Mapa */}
          <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-semibold">Cargando mapa...</p>
                </div>
              </div>
            ) : apiKeyError ? (
              <div className="w-full h-full bg-red-50 flex items-center justify-center">
                <div className="text-center p-8 max-w-md">
                  <svg className="w-20 h-20 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-xl font-bold text-red-900 mb-2">⚠️ Error de Google Maps API</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Configure la API Key en el archivo .env.local
                  </p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_clave
                  </code>
                </div>
              </div>
            ) : (
              <div ref={mapRef} className="w-full h-full" />
            )}
          </div>

          {/* Controles del Mapa */}
          <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 px-4 py-2 rounded-lg">
                  <span className="text-xs text-blue-600 font-semibold">Puntos: </span>
                  <span className="text-lg font-bold text-blue-800">{coordinates.length}</span>
                </div>
                {coordinates.length >= 3 && (
                  <div className="bg-green-100 px-4 py-2 rounded-lg">
                    <span className="text-xs text-green-600 font-semibold">Área: </span>
                    <span className="text-lg font-bold text-green-800">{calculateArea()} ha</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleClearPolygon}
                disabled={coordinates.length === 0}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpiar Polígono
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Panel de Resultados 40% */}
        <div className="w-[40%] flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '700px' }}>
          {/* Instrucciones */}
          <div className="bg-white rounded-lg shadow-lg p-3 border-l-4 border-blue-500">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-gray-700">
                <p className="font-bold text-blue-900 mb-1">📍 Instrucciones:</p>
                <ul className="space-y-0.5 text-[11px]">
                  <li>• <strong>Click en el mapa</strong> para agregar puntos</li>
                  <li>• <strong>Arrastrar marcadores</strong> para ajustar posición</li>
                  <li>• <strong>Click derecho</strong> en marcador para eliminar</li>
                  <li>• Mínimo <strong>3 puntos</strong> para formar polígono</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="bg-white rounded-lg shadow-lg p-3 space-y-2">
            <h3 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Acciones del Modelo
            </h3>
            
            <button
              onClick={handleTrainModel}
              disabled={coordinates.length < 3 || isTraining}
              className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {isTraining ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  Entrenando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  🎓 Entrenar Modelo
                </>
              )}
            </button>

            <button
              onClick={handlePredictBloom}
              disabled={coordinates.length < 3 || isPredicting}
              className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {isPredicting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  Analizando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  🌸 Predecir Floración
                </>
              )}
            </button>
          </div>

          {/* Errores */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-bold text-red-900 text-xs mb-0.5">Error</h4>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Resultado de Entrenamiento - Estilo Chat */}
          {trainingResult && (
            <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-blue-500">
              <div className="flex items-start gap-3">
                {/* Avatar de IA */}
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                
                {/* Contenido del Chat */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-blue-900 text-sm">🤖 Asistente de Entrenamiento</span>
                    <span className="text-[10px] text-gray-500">{new Date().toLocaleTimeString()}</span>
                  </div>
                  
                  {/* Mensaje de IA */}
                  <div className="bg-blue-50 rounded-lg p-3 mb-2">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {trainingResult.model_status?.ai_analysis?.viability || 
                       trainingResult.model_status?.message || 
                       trainingResult.message}
                    </p>
                    
                    {/* Recomendaciones de IA */}
                    {trainingResult.model_status?.ai_analysis?.recommendations && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-blue-900">💡 Recomendaciones:</p>
                        <ul className="space-y-1">
                          {trainingResult.model_status.ai_analysis.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-700 flex items-start gap-1">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Factores clave */}
                    {trainingResult.model_status?.ai_analysis?.key_factors && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-blue-900 mb-1">🔑 Factores Clave:</p>
                        <div className="flex flex-wrap gap-1">
                          {trainingResult.model_status.ai_analysis.key_factors.map((factor: string, idx: number) => (
                            <span key={idx} className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Información Rápida */}
                  <div className="flex gap-2 mb-2">
                    <div className="bg-gray-100 px-2 py-1 rounded text-[10px]">
                      <span className="text-gray-600">📍 Puntos:</span>
                      <span className="font-bold text-gray-800 ml-1">{trainingResult.polygon.length}</span>
                    </div>
                    <div className="bg-gray-100 px-2 py-1 rounded text-[10px]">
                      <span className="text-gray-600">📐 Área:</span>
                      <span className="font-bold text-gray-800 ml-1">{trainingResult.model_status?.area_hectares} ha</span>
                    </div>
                  </div>
                  
                  {/* Botón Show More */}
                  <button
                    onClick={() => setShowTrainingDetails(!showTrainingDetails)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    {showTrainingDetails ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Ocultar detalles
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Mostrar detalles técnicos
                      </>
                    )}
                  </button>
                  
                  {/* Detalles JSON Colapsables */}
                  {showTrainingDetails && trainingResult.model_status && (
                    <div className="mt-2 bg-gray-900 rounded-lg p-2 max-h-48 overflow-y-auto">
                      <pre className="text-[9px] text-green-400 whitespace-pre-wrap font-mono">
                        {JSON.stringify(trainingResult.model_status, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resultado de Predicción - Estilo Chat */}
          {predictionResult && (
            <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-green-500">
              <div className="flex items-start gap-3">
                {/* Avatar de IA */}
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                
                {/* Contenido del Chat */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-green-900 text-sm">🌸 Predictor de Floración</span>
                    <span className="text-[10px] text-gray-500">{new Date().toLocaleTimeString()}</span>
                  </div>
                  
                  {/* Predicción Principal - Destacada */}
                  <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 mb-3 text-white shadow-lg">
                    <div className="text-center mb-2">
                      <p className="text-xs text-green-100 mb-1">📅 Predicción de Floración</p>
                      <div className="flex items-center justify-center gap-4 mb-3">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <p className="text-5xl font-bold text-white">
                            {predictionResult.flowering_prediction?.days_until_bloom}
                          </p>
                          <p className="text-xs text-green-100 mt-1">días hasta floración</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <p className="text-4xl font-bold text-white">
                            {predictionResult.flowering_prediction?.probability}
                          </p>
                          <p className="text-xs text-green-100 mt-1">nivel de confianza</p>
                        </div>
                      </div>
                      <div className="bg-white/10 rounded px-3 py-1 inline-block">
                        <p className="text-sm font-semibold">
                          Fecha estimada: {predictionResult.flowering_prediction?.prediction_date}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Información de la Parcela */}
                  <div className="flex gap-2 mb-2">
                    <div className="bg-gray-100 px-2 py-1 rounded text-[10px]">
                      <span className="text-gray-600">📐 Área:</span>
                      <span className="font-bold text-gray-800 ml-1">{predictionResult.current_data?.area_hectares} ha</span>
                    </div>
                    <div className="bg-gray-100 px-2 py-1 rounded text-[10px]">
                      <span className="text-gray-600">🌡️ Temp:</span>
                      <span className="font-bold text-gray-800 ml-1">{predictionResult.current_data?.indices?.temperature}°C</span>
                    </div>
                    <div className="bg-gray-100 px-2 py-1 rounded text-[10px]">
                      <span className="text-gray-600">🌿 NDVI:</span>
                      <span className="font-bold text-gray-800 ml-1">{predictionResult.current_data?.indices?.NDVI}</span>
                    </div>
                  </div>
                  
                  {/* Botón Show More */}
                  <button
                    onClick={() => setShowPredictionDetails(!showPredictionDetails)}
                    className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    {showPredictionDetails ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Ocultar detalles
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Mostrar detalles técnicos
                      </>
                    )}
                  </button>
                  
                  {/* Detalles JSON Colapsables */}
                  {showPredictionDetails && (
                    <div className="mt-2 space-y-2">
                      {predictionResult.current_data && (
                        <div className="bg-gray-900 rounded-lg p-2 max-h-32 overflow-y-auto">
                          <p className="text-[10px] text-blue-400 font-semibold mb-1">Datos Actuales:</p>
                          <pre className="text-[9px] text-green-400 whitespace-pre-wrap font-mono">
                            {JSON.stringify(predictionResult.current_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {predictionResult.flowering_prediction && (
                        <div className="bg-gray-900 rounded-lg p-2 max-h-32 overflow-y-auto">
                          <p className="text-[10px] text-pink-400 font-semibold mb-1">Predicción Completa:</p>
                          <pre className="text-[9px] text-green-400 whitespace-pre-wrap font-mono">
                            {JSON.stringify(predictionResult.flowering_prediction, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Espacio vacío cuando no hay resultados */}
          {!trainingResult && !predictionResult && !error && (
            <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500 font-semibold">Resultados aparecerán aquí</p>
              <p className="text-xs text-gray-400 mt-2">
                Selecciona un área y ejecuta una acción
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
