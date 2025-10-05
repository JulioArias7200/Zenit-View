import type { Parcel } from '../stores/parcelStore';

/**
 * Parcelas de prueba para demostración
 * Ubicadas en diferentes regiones de Bolivia
 */
export const SAMPLE_PARCELS: Omit<Parcel, 'id' | 'createdAt'>[] = [
  {
    name: 'Parcela La Paz Norte',
    cropType: 'Quinua',
    plantingDate: '2024-09-15',
    areaHectares: 15.5,
    latitude: -16.4897,
    longitude: -68.1193,
    coordinates: [
      [-68.13, -16.48],
      [-68.11, -16.48],
      [-68.11, -16.50],
      [-68.13, -16.50],
      [-68.13, -16.48],
    ],
    description: 'Parcela experimental de quinua en zona altiplánica. Ideal para cultivos andinos.',
  },
  {
    name: 'Parcela Cochabamba',
    cropType: 'Maíz',
    plantingDate: '2024-08-20',
    areaHectares: 25.0,
    latitude: -17.3895,
    longitude: -66.1568,
    coordinates: [
      [-66.17, -17.38],
      [-66.14, -17.38],
      [-66.14, -17.40],
      [-66.17, -17.40],
      [-66.17, -17.38],
    ],
    description: 'Cultivo de maíz en valles de Cochabamba con sistema de riego tecnificado.',
  },
  {
    name: 'Parcela Santa Cruz',
    cropType: 'Soja',
    plantingDate: '2024-10-01',
    areaHectares: 50.0,
    latitude: -17.7833,
    longitude: -63.1821,
    coordinates: [
      [-63.20, -17.77],
      [-63.16, -17.77],
      [-63.16, -17.80],
      [-63.20, -17.80],
      [-63.20, -17.77],
    ],
    description: 'Gran parcela de soja en tierras bajas del oriente boliviano.',
  },
  {
    name: 'Parcela Tarija',
    cropType: 'Trigo',
    plantingDate: '2024-09-01',
    areaHectares: 18.0,
    latitude: -21.5355,
    longitude: -64.7295,
    coordinates: [
      [-64.74, -21.53],
      [-64.72, -21.53],
      [-64.72, -21.55],
      [-64.74, -21.55],
      [-64.74, -21.53],
    ],
    description: 'Cultivo de trigo en zona templada de Tarija.',
  },
];

/**
 * Función para cargar parcelas de prueba en el store
 */
export function loadSampleParcels(addParcel: (parcel: Omit<Parcel, 'id' | 'createdAt'>) => void) {
  SAMPLE_PARCELS.forEach(parcel => {
    addParcel(parcel);
  });
}
