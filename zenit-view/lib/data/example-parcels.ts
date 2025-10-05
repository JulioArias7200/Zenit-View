/**
 * Datos de parcelas de ejemplo con linderos detallados
 * Incluye 3 terrenos ficticios para demostración del sistema
 */

import { Parcel } from '../stores/parcelStore';

export const exampleParcels: Omit<Parcel, 'id' | 'createdAt'>[] = [
  // ===== TERRENO 1: "Parcela del Sol" =====
  {
    name: 'Parcela del Sol',
    identifier: 'Lote-101',
    cropType: 'Residencial',
    plantingDate: '2024-01-15',
    areaHectares: 0.0675, // 675 m²
    surfaceM2: 675,
    parcelType: 'residential',
    
    // Centro aproximado en La Paz, Bolivia (zona residencial)
    latitude: -16.5000,
    longitude: -68.1500,
    
    // Coordenadas para polígono rectangular (15m x 45m)
    // Cálculo: 15m frente x 45m fondo = 675 m²
    coordinates: [
      [-68.15013, -16.50020], // SO
      [-68.14987, -16.50020], // SE (15m este)
      [-68.14987, -16.49980], // NE (45m norte)
      [-68.15013, -16.49980], // NO
    ],
    
    description: 'Terreno rectangular en zona residencial de La Paz. Ideal para construcción de vivienda unifamiliar.',
    
    boundaries: [
      {
        side: 'Norte',
        description: 'Colinda con la propiedad "Villa Esperanza"',
        length: 15,
        neighbor: 'Villa Esperanza',
        neighborId: 'Lote-102',
        material: 'Cerca de madera'
      },
      {
        side: 'Sur',
        description: 'Colinda con calle pública',
        length: 15,
        neighbor: 'Calle de la Luna',
        material: 'Frente libre'
      },
      {
        side: 'Este',
        description: 'Colinda con la propiedad "Casa Girasol"',
        length: 45,
        neighbor: 'Casa Girasol',
        neighborId: 'Lote-103',
        material: 'Muro de ladrillo'
      },
      {
        side: 'Oeste',
        description: 'Colinda con terreno baldío',
        length: 45,
        neighbor: 'Terreno Baldío',
        neighborId: 'Lote-104',
        material: 'Cerca de alambre'
      }
    ]
  },

  // ===== TERRENO 2: "Finca El Roble" =====
  {
    name: 'Finca El Roble',
    identifier: 'Finca-A23',
    cropType: 'Agricultura',
    plantingDate: '2023-08-20',
    areaHectares: 10,
    surfaceM2: 100000,
    parcelType: 'agricultural',
    
    // Centro calculado de las coordenadas proporcionadas (México)
    latitude: 18.99430,
    longitude: -99.23038,
    
    // Coordenadas exactas proporcionadas (forma irregular)
    coordinates: [
      [-99.23150, 18.99540], // Punto A
      [-99.23000, 18.99560], // Punto B
      [-99.22900, 18.99420], // Punto C
      [-99.23100, 18.99300], // Punto D
    ],
    
    description: 'Terreno agrícola de forma irregular en zona rural. Coordenadas GPS WGS84 para pruebas topográficas.',
    
    boundaries: [
      {
        side: 'Lindero AB',
        description: 'Colinda con el "Arroyo Seco"',
        length: 150,
        neighbor: 'Arroyo Seco',
        material: 'Límite natural (arroyo)'
      },
      {
        side: 'Lindero BC',
        description: 'Colinda con el "Rancho La Ponderosa"',
        length: 200,
        neighbor: 'Rancho La Ponderosa',
        neighborId: 'Rancho-Ponderosa',
        material: 'Cerco de piedras'
      },
      {
        side: 'Lindero CD',
        description: 'Colinda con el "Camino Real"',
        length: 250,
        neighbor: 'Camino Real',
        material: 'Frente a camino público'
      },
      {
        side: 'Lindero DA',
        description: 'Colinda con la "Parcela Los Cerezos"',
        length: 100,
        neighbor: 'Parcela Los Cerezos',
        neighborId: 'Parcela-Cerezos',
        material: 'Alambrado de púas'
      }
    ]
  },

  // ===== TERRENO 3: "Lote Urbano 5" =====
  {
    name: 'Lote Urbano 5',
    identifier: 'Condominio-L5',
    cropType: 'Urbano',
    plantingDate: '2024-03-10',
    areaHectares: 0.018, // 180 m²
    surfaceM2: 180,
    parcelType: 'urban',
    
    // Centro aproximado en Cochabamba, Bolivia (zona de condominios)
    latitude: -17.3950,
    longitude: -66.1570,
    
    // Coordenadas para polígono rectangular (12m x 15m = 180 m²)
    coordinates: [
      [-66.15708, -17.39508], // SO
      [-66.15692, -17.39508], // SE (12m este)
      [-66.15692, -17.39492], // NE (15m norte)
      [-66.15708, -17.39492], // NO
    ],
    
    description: 'Lote de propiedad horizontal en condominio privado. Incluye área de construcción y jardín.',
    
    boundaries: [
      {
        side: 'Norte',
        description: 'Colinda con Casa 6 del mismo condominio',
        neighbor: 'Casa 6',
        neighborId: 'Condominio-L6',
        material: 'Muro de concreto'
      },
      {
        side: 'Sur',
        description: 'Colinda con parqueadero común',
        neighbor: 'Parqueadero Común',
        material: 'Jardinera delimitadora'
      },
      {
        side: 'Este',
        description: 'Colinda con Casa 4 del mismo condominio',
        neighbor: 'Casa 4',
        neighborId: 'Condominio-L4',
        material: 'Barda divisoria'
      },
      {
        side: 'Oeste',
        description: 'Colinda con calle peatonal del condominio',
        neighbor: 'Calle Peatonal',
        material: 'Frente peatonal'
      }
    ]
  }
];
