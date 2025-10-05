# 🗺️ Datos de Ejemplo - Parcelas con Linderos

Este documento explica cómo usar los datos de parcelas de ejemplo que incluyen información detallada de linderos y colindancias.

## 📊 Parcelas Incluidas

### 1. **Parcela del Sol** (Lote-101)
- **Tipo:** Residencial
- **Ubicación:** La Paz, Bolivia (-16.5000, -68.1500)
- **Superficie:** 675 m² (0.0675 ha)
- **Forma:** Rectangular (15m × 45m)
- **Linderos:** 4 linderos con vecinos identificados
  - Norte: Villa Esperanza (Lote-102) - Cerca de madera 15m
  - Sur: Calle de la Luna - Frente libre 15m
  - Este: Casa Girasol (Lote-103) - Muro de ladrillo 45m
  - Oeste: Terreno Baldío (Lote-104) - Cerca de alambre 45m

### 2. **Finca El Roble** (Finca-A23)
- **Tipo:** Agrícola
- **Ubicación:** México (18.99430, -99.23038)
- **Superficie:** 10 hectáreas (100,000 m²)
- **Forma:** Irregular (4 puntos GPS)
- **Coordenadas GPS WGS84:**
  - Punto A: 18.99540, -99.23150
  - Punto B: 18.99560, -99.23000
  - Punto C: 18.99420, -99.22900
  - Punto D: 18.99300, -99.23100
- **Linderos:** 4 linderos (AB, BC, CD, DA)
  - AB: Arroyo Seco - Límite natural 150m
  - BC: Rancho La Ponderosa - Cerco de piedras 200m
  - CD: Camino Real - Frente a camino 250m
  - DA: Parcela Los Cerezos - Alambrado de púas 100m

### 3. **Lote Urbano 5** (Condominio-L5)
- **Tipo:** Urbano
- **Ubicación:** Cochabamba, Bolivia (-17.3950, -66.1570)
- **Superficie:** 180 m² (0.018 ha)
- **Forma:** Rectangular (12m × 15m)
- **Linderos:** 4 linderos dentro de condominio
  - Norte: Casa 6 (Condominio-L6) - Muro de concreto
  - Sur: Parqueadero Común - Jardinera delimitadora
  - Este: Casa 4 (Condominio-L4) - Barda divisoria
  - Oeste: Calle Peatonal - Frente peatonal

---

## 🚀 Cómo Cargar los Datos de Ejemplo

### Opción 1: Mediante Consola del Navegador (Método Rápido)

1. Abre la aplicación en el navegador
2. Abre la consola de desarrollador (F12)
3. Ejecuta el siguiente código:

```javascript
// Importar función
import { loadExampleParcels } from './lib/utils/load-example-data';

// Cargar parcelas de ejemplo
const loaded = loadExampleParcels();
console.log(`✅ ${loaded} parcelas cargadas exitosamente`);

// Recargar la página para ver los cambios
window.location.reload();
```

### Opción 2: Crear Botón en la Interfaz (Recomendado)

Agrega un botón en la página de Parcelas para cargar datos de ejemplo:

```typescript
// En components/ParcelList.tsx o similar
import { loadExampleParcels, hasExampleParcels } from '@/lib/utils/load-example-data';

function ParcelList() {
  const handleLoadExamples = () => {
    if (hasExampleParcels()) {
      alert('⚠️ Las parcelas de ejemplo ya están cargadas');
      return;
    }
    
    const count = loadExampleParcels();
    alert(`✅ ${count} parcelas de ejemplo cargadas correctamente`);
    window.location.reload(); // O actualizar estado
  };

  return (
    <div>
      <button onClick={handleLoadExamples}>
        📊 Cargar Datos de Ejemplo
      </button>
      {/* ... resto del componente */}
    </div>
  );
}
```

### Opción 3: Cargar Automáticamente al Iniciar (Desarrollo)

Para desarrollo, puedes cargar automáticamente los datos si no existen parcelas:

```typescript
// En app/page.tsx o layout
import { loadExampleParcels, hasExampleParcels } from '@/lib/utils/load-example-data';
import { useParcelStore } from '@/lib/stores/parcelStore';

useEffect(() => {
  const parcels = useParcelStore.getState().getParcels();
  
  // Si no hay parcelas, cargar ejemplos
  if (parcels.length === 0 && !hasExampleParcels()) {
    loadExampleParcels();
  }
}, []);
```

---

## 🔍 Verificar Datos Cargados

### En el Globo 3D:
1. Ve a la pestaña "Globo"
2. Verás puntos verdes en 3 ubicaciones:
   - La Paz, Bolivia (Parcela del Sol)
   - México (Finca El Roble)
   - Cochabamba, Bolivia (Lote Urbano 5)
3. Haz zoom para ver los polígonos aparecer
4. Click en un polígono para ver el InfoBox con identificador catastral

### En la Lista de Parcelas:
1. Ve a la pestaña "Parcelas"
2. Verás 3 tarjetas con las parcelas de ejemplo
3. Cada tarjeta muestra el identificador (Lote-101, Finca-A23, Condominio-L5)

### En Vista Detallada:
1. Click en una parcela
2. Ve a la pestaña "Detalle"
3. Verás una sección nueva: **"Información Catastral y Linderos"**
4. Incluye:
   - Identificador catastral
   - Tipo de terreno
   - Superficie en m²
   - Lista completa de linderos con:
     - Lado (Norte, Sur, Este, Oeste)
     - Descripción
     - Longitud
     - Vecino colindante
     - Material del lindero

---

## 📐 Estructura de Datos

### Modelo de Lindero (Boundary)
```typescript
interface Boundary {
  side: string;          // "Norte", "Sur", "Este", "Oeste", "AB", etc.
  description: string;   // Descripción textual
  length?: number;       // Longitud en metros
  neighbor?: string;     // Nombre del vecino
  neighborId?: string;   // ID del vecino si existe
  material?: string;     // Material: "Muro de ladrillo", "Cerca de madera", etc.
}
```

### Modelo de Parcela Extendido
```typescript
interface Parcel {
  // Campos existentes
  id: string;
  name: string;
  cropType: string;
  plantingDate: string;
  areaHectares: number;
  latitude: number;
  longitude: number;
  coordinates: number[][];
  description?: string;
  createdAt: string;
  
  // Campos nuevos para linderos
  identifier?: string;   // "Lote-101", "Finca-A23", etc.
  boundaries?: Boundary[]; // Array de linderos
  surfaceM2?: number;    // Superficie en m²
  parcelType?: 'residential' | 'agricultural' | 'urban' | 'commercial';
}
```

---

## 🛠️ Herramientas para Generar Más Datos

### 1. Generadores Online
- **Mockaroo**: https://www.mockaroo.com/
  - Configura campos: latitude, longitude, name, area, etc.
  - Exporta en JSON

### 2. Software SIG
- **QGIS** (Gratuito): https://qgis.org/
  - Crear polígonos visualmente
  - Exportar coordenadas en GeoJSON
  - Convertir a formato de la app

- **ArcGIS Online**: https://www.arcgis.com/
  - Dibujar parcelas en mapa
  - Obtener coordenadas WGS84

### 3. APIs de Mapas
- **OneSoil API**: https://onesoil.ai/
  - Datos reales de parcelas agrícolas
  - API gratuita para desarrollo

- **OpenStreetMap Overpass API**:
  - Obtener límites de terrenos reales
  - Query por tipo de uso de suelo

### 4. Script Personalizado

Crea tu propia función para generar parcelas:

```typescript
// lib/utils/generate-parcel.ts
export function generateRandomParcel(
  centerLat: number,
  centerLon: number,
  areaHa: number
): Omit<Parcel, 'id' | 'createdAt'> {
  // Calcular coordenadas del polígono
  const sideLength = Math.sqrt(areaHa * 10000);
  const deltaLat = (sideLength / 2) / 111000;
  const deltaLon = (sideLength / 2) / (111000 * Math.cos(centerLat * Math.PI / 180));
  
  return {
    name: `Parcela ${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    cropType: ['Maíz', 'Trigo', 'Papa', 'Quinua'][Math.floor(Math.random() * 4)],
    plantingDate: new Date().toISOString().split('T')[0],
    areaHectares: areaHa,
    latitude: centerLat,
    longitude: centerLon,
    coordinates: [
      [centerLon - deltaLon, centerLat - deltaLat],
      [centerLon + deltaLon, centerLat - deltaLat],
      [centerLon + deltaLon, centerLat + deltaLat],
      [centerLon - deltaLon, centerLat + deltaLat],
    ],
    description: 'Parcela generada automáticamente'
  };
}
```

---

## 🧪 Casos de Uso

### 1. Demostración del Sistema
- Muestra capacidades completas con datos reales
- Incluye diferentes tipos de terrenos
- Diferentes ubicaciones geográficas

### 2. Pruebas de Desarrollo
- Verifica renderizado de polígonos
- Prueba cálculo de áreas
- Valida integración de APIs climáticas

### 3. Capacitación de Usuarios
- Ejemplos claros de cómo llenar datos
- Diferentes formatos de coordenadas
- Tipos de linderos variados

### 4. Testing Automatizado
- Datos consistentes para pruebas
- Coordenadas conocidas
- Valores esperados calculables

---

## ⚠️ Notas Importantes

1. **Datos Ficticios:** Las parcelas son de ejemplo, no representan propiedades reales
2. **Coordenadas Mixtas:** Finca El Roble usa coords de México para mostrar flexibilidad
3. **Actualización:** Los datos se guardan en localStorage (persisten entre sesiones)
4. **Eliminación:** Usa `removeExampleParcels()` para limpiar datos de ejemplo
5. **Conflictos:** Si editas una parcela de ejemplo, se guardará con los cambios

---

## 📞 Soporte

Si tienes problemas cargando los datos:
1. Verifica que el navegador permita localStorage
2. Revisa la consola por errores
3. Recarga la página después de cargar datos
4. Limpia el localStorage si hay conflictos: `localStorage.clear()`

