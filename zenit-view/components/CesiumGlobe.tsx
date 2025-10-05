'use client';

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { Parcel } from '@/lib/stores/parcelStore';

// Configurar token de Cesium Ion
if (typeof window !== 'undefined') {
  Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || '';
}

interface CesiumGlobeProps {
  className?: string;
  parcels?: Parcel[];
  onParcelSelect?: (parcelId: string) => void;
  focusedParcelId?: string; // ID de la parcela a enfocar automáticamente
}

export default function CesiumGlobe({ 
  className = '', 
  parcels = [], 
  onParcelSelect,
  focusedParcelId 
}: CesiumGlobeProps) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const entitiesRef = useRef<Cesium.Entity[]>([]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // Crear el viewer de Cesium
    const viewer = new Cesium.Viewer(containerRef.current, {
      timeline: false,
      animation: false,
      homeButton: true,
      geocoder: false,
      sceneModePicker: true,
      baseLayerPicker: true,
      navigationHelpButton: true,
      infoBox: true,
      selectionIndicator: true,
    });

    viewerRef.current = viewer;

    // Configurar terreno 3D
    Cesium.createWorldTerrainAsync().then((terrainProvider) => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.terrainProvider = terrainProvider;
      }
    }).catch((error) => {
      console.error('Error loading terrain:', error);
    });

    // Vista recta de Bolivia (casi cenital con perspectiva 3D)
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-65.0, -17.0, 1200000),
      orientation: {
        heading: Cesium.Math.toRadians(0.0), // Norte
        pitch: Cesium.Math.toRadians(-75.0), // 75° hacia abajo (vista casi recta con perspectiva)
        roll: 0.0
      }
    });

    // Cleanup
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Efecto para agregar/actualizar parcelas
  useEffect(() => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;

    console.log('🌍 CesiumGlobe: Actualizando parcelas...', {
      total: parcels.length,
      parcelas: parcels.map(p => ({ id: p.id, nombre: p.name, puntos: p.coordinates?.length || 0 }))
    });

    // Limpiar entidades anteriores
    entitiesRef.current.forEach(entity => {
      viewer.entities.remove(entity);
    });
    entitiesRef.current = [];

    // Función auxiliar: generar coordenadas poligonales si no existen
    const getPolygonCoordinates = (parcel: any): number[] => {
      if (parcel.coordinates && parcel.coordinates.length > 0) {
        // Ya tiene coordenadas, aplanar el array
        const flatCoords = parcel.coordinates.flat();
        console.log('📍 Procesando coordenadas de parcela:', {
          nombre: parcel.name,
          coordinatesRaw: parcel.coordinates,
          coordinatesFlat: flatCoords,
          puntos: parcel.coordinates.length,
          formatoCorrecto: flatCoords.length === parcel.coordinates.length * 2
        });
        return flatCoords;
      }
      
      console.log('⚠️ Generando polígono rectangular para:', parcel.name);
      
      // Generar polígono rectangular basado en área (aproximación)
      // Calcular dimensiones aproximadas del rectángulo
      const areaM2 = parcel.areaHectares * 10000; // hectáreas a m²
      const sideLength = Math.sqrt(areaM2); // lado del cuadrado en metros
      
      // Convertir metros a grados (aproximación: 1° ≈ 111km)
      const deltaLat = (sideLength / 2) / 111000;
      const deltaLon = (sideLength / 2) / (111000 * Math.cos(parcel.latitude * Math.PI / 180));
      
      // Crear rectángulo centrado en el punto
      return [
        parcel.longitude - deltaLon, parcel.latitude - deltaLat, // SO
        parcel.longitude + deltaLon, parcel.latitude - deltaLat, // SE
        parcel.longitude + deltaLon, parcel.latitude + deltaLat, // NE
        parcel.longitude - deltaLon, parcel.latitude + deltaLat, // NO
      ];
    };

    // Agregar nuevas parcelas
    parcels.forEach((parcel) => {
      const polygonCoords = getPolygonCoordinates(parcel);
      
      console.log('🗺️ Creando entidad de polígono en Cesium:', {
        nombre: parcel.name,
        coordsArray: polygonCoords,
        longitud: polygonCoords.length,
        ejemploPunto: `[${polygonCoords[0]}, ${polygonCoords[1]}]`
      });
      
      // 1. POLÍGONO - Visible de CERCA (< 50km)
      let polygonEntity;
      try {
        polygonEntity = viewer.entities.add({
          name: `${parcel.name} (Área)`,
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(polygonCoords),
            material: Cesium.Color.fromCssColorString('#A4DE02').withAlpha(0.5),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#0B3D91'),
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, // Pegado al terreno
            classificationType: Cesium.ClassificationType.TERRAIN,
            // Mostrar solo cuando está cerca (distancia < 50km)
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 50000)
          },
        });
        
        console.log('✅ Polígono creado en Cesium:', {
          nombre: parcel.name,
          entityId: polygonEntity.id,
          puntosEnPoligono: polygonCoords.length / 2
        });
      } catch (error) {
        console.error('❌ Error creando polígono en Cesium:', {
          error,
          parcelaNombre: parcel.name,
          coordenadas: polygonCoords
        });
      }
      
      // 2. PUNTO - Visible de LEJOS (> 50km)
      const pointEntity = viewer.entities.add({
        name: parcel.name,
        // Posición simple sin height en la creación - evita drift
        position: Cesium.Cartesian3.fromDegrees(parcel.longitude, parcel.latitude),
        
        // Punto visible de lejos
        point: {
          pixelSize: 25,
          color: Cesium.Color.fromCssColorString('#A4DE02'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          scaleByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          // Mostrar solo cuando está lejos (distancia > 50km)
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(50000, Number.POSITIVE_INFINITY)
        },

        // Label con el nombre
        label: {
          text: `${parcel.name}\n${parcel.cropType}`,
          font: 'bold 16px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -30),
          scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.5, 1.5e7, 0.5),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },

        // Información visual mejorada sin botones (evita problemas de sandbox)
        description: `
          <div style="
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 0;
            margin: 0;
            min-width: 280px;
          ">
            <!-- Header con gradiente -->
            <div style="
              background: linear-gradient(135deg, #0B3D91 0%, #A4DE02 100%);
              padding: 16px;
              margin: -10px -10px 0 -10px;
              border-radius: 4px 4px 0 0;
            ">
              <h3 style="
                margin: 0 0 8px 0;
                color: white;
                font-size: 22px;
                font-weight: 700;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1);
              ">${parcel.name}</h3>
              ${parcel.identifier ? `
              <p style="
                margin: 0 0 10px 0;
                color: rgba(255,255,255,0.9);
                font-size: 12px;
                font-family: 'Courier New', monospace;
              ">🆔 ${parcel.identifier}</p>
              ` : ''}
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="
                  background: rgba(255, 255, 255, 0.25);
                  backdrop-filter: blur(10px);
                  color: white;
                  padding: 6px 14px;
                  border-radius: 20px;
                  font-size: 13px;
                  font-weight: 600;
                  border: 1px solid rgba(255, 255, 255, 0.3);
                ">🌾 ${parcel.cropType}</span>
                <span style="
                  background: rgba(255, 255, 255, 0.25);
                  backdrop-filter: blur(10px);
                  color: white;
                  padding: 6px 14px;
                  border-radius: 20px;
                  font-size: 13px;
                  font-weight: 600;
                  border: 1px solid rgba(255, 255, 255, 0.3);
                ">📏 ${parcel.areaHectares.toFixed(2)} ha</span>
                ${parcel.surfaceM2 ? `
                <span style="
                  background: rgba(255, 255, 255, 0.25);
                  backdrop-filter: blur(10px);
                  color: white;
                  padding: 6px 14px;
                  border-radius: 20px;
                  font-size: 13px;
                  font-weight: 600;
                  border: 1px solid rgba(255, 255, 255, 0.3);
                ">📐 ${parcel.surfaceM2.toLocaleString()} m²</span>
                ` : ''}
              </div>
            </div>
            
            <!-- Contenido principal -->
            <div style="padding: 16px;">
              <!-- Grid de información -->
              <div style="
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 16px;
              ">
                <div style="
                  background: linear-gradient(135deg, #F5F6FA 0%, #A4DE02 15%);  
                  padding: 12px;
                  border-radius: 8px;
                  border-left: 3px solid #A4DE02;
                ">
                  <p style="margin: 0 0 4px 0; color: #0B3D91; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📅 Fecha Siembra</p>
                  <p style="margin: 0; font-weight: 700; color: #0B3D91; font-size: 14px;">${new Date(parcel.plantingDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                
                <div style="
                  background: linear-gradient(135deg, #F5F6FA 0%, #0B3D91 15%);
                  padding: 12px;
                  border-radius: 8px;
                  border-left: 3px solid #0B3D91;
                ">
                  <p style="margin: 0 0 4px 0; color: #0B3D91; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">⏱️ Días Cultivo</p>
                  <p style="margin: 0; font-weight: 700; color: #0B3D91; font-size: 14px;">${Math.floor((new Date().getTime() - new Date(parcel.plantingDate).getTime()) / (1000 * 60 * 60 * 24))} días</p>
                </div>
              </div>
              
              <!-- Coordenadas -->
              <div style="
                background: #f9fafb;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 12px;
                border: 1px solid #e5e7eb;
              ">
                <p style="margin: 0 0 6px 0; color: #6F6F6F; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📍 Ubicación GPS</p>
                <p style="margin: 0; font-weight: 600; color: #2E2E2E; font-size: 13px; font-family: 'Courier New', monospace;">
                  ${parcel.latitude >= 0 ? 'N' : 'S'} ${Math.abs(parcel.latitude).toFixed(4)}°, 
                  ${parcel.longitude >= 0 ? 'E' : 'W'} ${Math.abs(parcel.longitude).toFixed(4)}°
                </p>
              </div>
              
              ${parcel.description ? `
                <!-- Descripción -->
                <div style="
                  background: linear-gradient(135deg, #F5F6FA 0%, #FFB347 15%);
                  padding: 12px;
                  border-radius: 8px;
                  border-left: 3px solid #FFB347;
                  margin-bottom: 12px;
                ">
                  <p style="margin: 0 0 6px 0; color: #FFB347; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">💬 Notas</p>
                  <p style="margin: 0; color: #2E2E2E; font-size: 13px; line-height: 1.5; font-style: italic;">
                    "${parcel.description}"
                  </p>
                </div>
              ` : ''}
              
              <!-- Footer info -->
              <div style="
                text-align: center;
                padding-top: 12px;
                border-top: 2px dashed #e5e7eb;
              ">
                <p style="
                  margin: 0;
                  color: #9ca3af;
                  font-size: 11px;
                  font-weight: 500;
                ">
                  💡 Click en la pestaña "Parcelas" para más detalles
                </p>
              </div>
            </div>
          </div>
        `,
      });

      // Guardar referencias de ambas entidades
      if (polygonEntity) {
        entitiesRef.current.push(polygonEntity, pointEntity);
      } else {
        entitiesRef.current.push(pointEntity);
      }
    });

    // Si hay parcelas, volar para mostrarlas todas con vista recta
    // SOLO si NO hay una parcela enfocada (en ese caso el useEffect de focusedParcelId maneja la vista)
    if (parcels.length > 0 && !focusedParcelId) {
      console.log('📷 Auto-enfoque: Sin parcela seleccionada, mostrando todas...');
      
      if (parcels.length === 1) {
        // Si hay solo una parcela, volar directamente a ella con vista recta
        const firstParcel = parcels[0];
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            firstParcel.longitude, 
            firstParcel.latitude, 
            15000 // 15km de altura para ver el polígono
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-75.0), // Vista casi recta (75° hacia abajo)
            roll: 0.0
          },
          duration: 2.0,
        });
      } else {
        // Si hay múltiples parcelas, hacer zoom para verlas todas
        try {
          viewer.flyTo(viewer.entities, {
            duration: 2.0,
            offset: new Cesium.HeadingPitchRange(
              0,
              Cesium.Math.toRadians(-75), // Vista casi recta
              300000 // Altura ajustada para ver todas
            )
          });
        } catch (e) {
          // Si falla, volar a la primera parcela con vista recta
          const firstParcel = parcels[0];
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              firstParcel.longitude, 
              firstParcel.latitude, 
              200000
            ),
            orientation: {
              heading: Cesium.Math.toRadians(0.0),
              pitch: Cesium.Math.toRadians(-75.0), // Vista casi recta
              roll: 0.0
            },
            duration: 2.0,
          });
        }
      }
    } else if (parcels.length > 0 && focusedParcelId) {
      console.log('📷 Hay parcela enfocada, el useEffect de focusedParcelId manejará la vista');
    }
  }, [parcels, focusedParcelId]);

  // Efecto para volar a parcela específica cuando se enfoca
  useEffect(() => {
    if (!viewerRef.current || !focusedParcelId || parcels.length === 0) return;

    const viewer = viewerRef.current;
    const focusedParcel = parcels.find(p => p.id === focusedParcelId);
    
    if (focusedParcel) {
      console.log('🎯 Enfocando parcela:', {
        id: focusedParcel.id,
        nombre: focusedParcel.name,
        centro: [focusedParcel.latitude, focusedParcel.longitude],
        puntos: focusedParcel.coordinates?.length || 0
      });
      
      // Volar a la parcela enfocada con vista recta
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          focusedParcel.longitude, 
          focusedParcel.latitude, 
          15000 // 15km de altura para ver el polígono
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-75.0), // Vista casi recta (75° hacia abajo)
          roll: 0.0
        },
        duration: 2.0,
      });
    } else {
      console.warn('⚠️ Parcela enfocada no encontrada:', focusedParcelId);
    }
  }, [focusedParcelId, parcels]);

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-screen ${className}`}
    />
  );
}
