import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Boundary {
  side: string; // Norte, Sur, Este, Oeste, AB, BC, etc.
  description: string; // Descripción de la colindancia
  length?: number; // Longitud en metros
  neighbor?: string; // Nombre del vecino/propiedad colindante
  neighborId?: string; // ID del vecino si existe
  material?: string; // Material del lindero (cerca, muro, etc.)
}

export interface Parcel {
  id: string;
  name: string;
  cropType: string;
  plantingDate: string;
  areaHectares: number;
  latitude: number;
  longitude: number;
  coordinates: number[][]; // Array de [lng, lat]
  description?: string;
  createdAt: string;
  
  // Información adicional de linderos
  identifier?: string; // Identificador catastral (Lote-101, Finca-A23, etc.)
  boundaries?: Boundary[]; // Linderos detallados
  surfaceM2?: number; // Superficie en m² (adicional a hectáreas)
  parcelType?: 'residential' | 'agricultural' | 'urban' | 'commercial'; // Tipo de terreno
}

interface ParcelStore {
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  
  // Actions
  addParcel: (parcel: Omit<Parcel, 'id' | 'createdAt'>) => void;
  updateParcel: (id: string, parcel: Partial<Parcel>) => void;
  deleteParcel: (id: string) => void;
  selectParcel: (id: string) => void;
  clearSelection: () => void;
  getParcels: () => Parcel[];
}

export const useParcelStore = create<ParcelStore>()(
  persist(
    (set, get) => ({
      parcels: [],
      selectedParcel: null,

      addParcel: (parcelData) => {
        const newParcel: Parcel = {
          ...parcelData,
          id: `parcel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          parcels: [...state.parcels, newParcel],
        }));
      },

      updateParcel: (id, updates) => {
        set((state) => ({
          parcels: state.parcels.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteParcel: (id) => {
        set((state) => ({
          parcels: state.parcels.filter((p) => p.id !== id),
          selectedParcel: state.selectedParcel?.id === id ? null : state.selectedParcel,
        }));
      },

      selectParcel: (id) => {
        const parcel = get().parcels.find((p) => p.id === id);
        set({ selectedParcel: parcel || null });
      },

      clearSelection: () => {
        set({ selectedParcel: null });
      },

      getParcels: () => {
        return get().parcels;
      },
    }),
    {
      name: 'parcel-storage',
    }
  )
);
