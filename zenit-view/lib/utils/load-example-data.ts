/**
 * Utilidad para cargar datos de ejemplo en el sistema
 */

import { exampleParcels } from '../data/example-parcels';
import { useParcelStore } from '../stores/parcelStore';

/**
 * Carga las parcelas de ejemplo en el store
 * @returns Número de parcelas cargadas
 */
export function loadExampleParcels(): number {
  const store = useParcelStore.getState();
  
  // Agregar cada parcela de ejemplo
  exampleParcels.forEach(parcel => {
    store.addParcel(parcel);
  });
  
  return exampleParcels.length;
}

/**
 * Verifica si ya existen parcelas de ejemplo cargadas
 * @returns true si encuentra parcelas con identificadores de ejemplo
 */
export function hasExampleParcels(): boolean {
  const store = useParcelStore.getState();
  const parcels = store.getParcels();
  
  const exampleIdentifiers = ['Lote-101', 'Finca-A23', 'Condominio-L5'];
  
  return parcels.some(parcel => 
    parcel.identifier && exampleIdentifiers.includes(parcel.identifier)
  );
}

/**
 * Elimina todas las parcelas de ejemplo
 */
export function removeExampleParcels(): number {
  const store = useParcelStore.getState();
  const parcels = store.getParcels();
  
  const exampleIdentifiers = ['Lote-101', 'Finca-A23', 'Condominio-L5'];
  let removed = 0;
  
  parcels.forEach(parcel => {
    if (parcel.identifier && exampleIdentifiers.includes(parcel.identifier)) {
      store.deleteParcel(parcel.id);
      removed++;
    }
  });
  
  return removed;
}
