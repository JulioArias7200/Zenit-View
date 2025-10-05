export interface FloweringDataPoint {
  date: string;
  timestamp: number;
  NDVI: number;
  EVI: number;
  LST_day: number;
  LST_night: number;
  precip_7d: number;
  precip_30d: number;
  LST_mean: number;
  NDVI_change: number;
  season: string;
  thermal_stress: number;
}

/**
 * Cargar datos de florecimiento desde el CSV
 */
export async function loadFloweringData(): Promise<FloweringDataPoint[]> {
  try {
    const response = await fetch('/dataset_florecimiento.csv');
    const text = await response.text();
    
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    
    const data: FloweringDataPoint[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      
      if (values.length < headers.length) continue;
      
      const dataPoint: FloweringDataPoint = {
        date: values[0],
        timestamp: parseFloat(values[1]) || 0,
        NDVI: parseFloat(values[2]) || 0,
        EVI: parseFloat(values[3]) || 0,
        LST_day: parseFloat(values[4]) || 0,
        LST_night: parseFloat(values[5]) || 0,
        precip_7d: parseFloat(values[6]) || 0,
        precip_30d: parseFloat(values[9]) || 0,
        LST_mean: parseFloat(values[12]) || 0,
        NDVI_change: parseFloat(values[18]) || 0,
        season: values[16] || '',
        thermal_stress: parseFloat(values[17]) || 0,
      };
      
      data.push(dataPoint);
    }
    
    return data;
  } catch (error) {
    console.error('Error loading flowering data:', error);
    return [];
  }
}

/**
 * Analizar estado de floración basado en NDVI
 */
export function analyzeFloweringStatus(NDVI: number, NDVI_change: number): {
  status: string;
  probability: number;
  color: string;
  description: string;
} {
  // Lógica simplificada basada en NDVI
  if (NDVI > 0.7 && NDVI_change > 0.03) {
    return {
      status: 'Floración Activa',
      probability: 85,
      color: '#ec4899', // Pink
      description: 'Alto crecimiento vegetativo, probable floración en curso'
    };
  } else if (NDVI > 0.65 && NDVI_change > 0.01) {
    return {
      status: 'Pre-Floración',
      probability: 65,
      color: '#f59e0b', // Orange
      description: 'Indicadores positivos, floración probable en 7-14 días'
    };
  } else if (NDVI > 0.6) {
    return {
      status: 'Crecimiento Vegetativo',
      probability: 40,
      color: '#22c55e', // Green
      description: 'Desarrollo vegetativo normal'
    };
  } else if (NDVI < 0.3) {
    return {
      status: 'Estrés o Post-Floración',
      probability: 20,
      color: '#6b7280', // Gray
      description: 'Bajo vigor vegetativo, posible estrés o fase post-floración'
    };
  } else {
    return {
      status: 'Desarrollo Inicial',
      probability: 30,
      color: '#10b981', // Teal
      description: 'Etapa temprana de desarrollo'
    };
  }
}

/**
 * Obtener estadísticas del dataset
 */
export function getFloweringStats(data: FloweringDataPoint[]) {
  if (data.length === 0) return null;
  
  const avgNDVI = data.reduce((sum, d) => sum + d.NDVI, 0) / data.length;
  const maxNDVI = Math.max(...data.map(d => d.NDVI));
  const minNDVI = Math.min(...data.map(d => d.NDVI));
  
  const avgTemp = data.reduce((sum, d) => sum + d.LST_mean, 0) / data.length;
  const totalPrecip = data.reduce((sum, d) => sum + d.precip_30d, 0);
  
  // Contar eventos de probable floración
  const floweringEvents = data.filter(d => d.NDVI > 0.7 && d.NDVI_change > 0.03).length;
  
  return {
    avgNDVI: avgNDVI.toFixed(3),
    maxNDVI: maxNDVI.toFixed(3),
    minNDVI: minNDVI.toFixed(3),
    avgTemp: avgTemp.toFixed(1),
    totalPrecip: totalPrecip.toFixed(1),
    floweringEvents,
    totalDataPoints: data.length,
    dateRange: {
      start: data[0]?.date,
      end: data[data.length - 1]?.date
    }
  };
}

/**
 * Preparar datos para gráfico
 */
export function prepareChartData(data: FloweringDataPoint[]) {
  return data.map(d => ({
    date: d.date,
    NDVI: parseFloat(d.NDVI.toFixed(3)),
    EVI: parseFloat(d.EVI.toFixed(3)),
    temperatura: parseFloat(d.LST_mean.toFixed(1)),
    precipitacion: parseFloat(d.precip_7d.toFixed(1)),
  }));
}
