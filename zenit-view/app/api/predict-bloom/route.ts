import { NextRequest, NextResponse } from 'next/server';

interface PolygonRequest {
  coordinates: [number, number][];
}

export async function POST(request: NextRequest) {
  try {
    const body: PolygonRequest = await request.json();

    // Validar coordenadas
    if (!body.coordinates || body.coordinates.length < 3) {
      return NextResponse.json(
        { detail: 'Se requieren al menos 3 puntos para formar un polígono' },
        { status: 400 }
      );
    }

    // Validar formato de puntos
    for (const point of body.coordinates) {
      if (point.length !== 2) {
        return NextResponse.json(
          { detail: 'Cada punto debe tener formato [lon, lat]' },
          { status: 400 }
        );
      }
    }

    // Intentar conectar con el backend de Python (FastAPI)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    try {
      // TODO: El backend requiere un ID del modelo entrenado
      // Por ahora usamos un ID de ejemplo
      const modelId = 1;
      
      const response = await fetch(`${backendUrl}/api/v1/bloom/predict-bloom?id=${modelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: body.coordinates }),
        signal: AbortSignal.timeout(30000) // 30 segundos timeout
      });

      if (response.ok) {
        const backendResponse = await response.json();
        
        return NextResponse.json({
          ...backendResponse,
          backend_used: true,
          backend_url: backendUrl
        }, { status: 200 });
      }
    } catch (backendError) {
      console.warn('Backend de Python no disponible, usando fallback con OpenRouter AI:', backendError);
    }

    // Fallback: calcular información del polígono
    const areaHectares = calculatePolygonArea(body.coordinates).toFixed(4);
    const centroid = calculateCentroid(body.coordinates);
    
    // Datos simulados de índices (normalmente vendrían de Google Earth Engine)
    const currentIndices = {
      NDVI: 0.65,
      EVI: 0.45,
      NDWI: 0.32,
      temperature: 18.5,
      precipitation: 45.2
    };

    // Llamar a OpenRouter AI para predicción de floración
    const apiKey = process.env.NEXT_PUBLIC_OPEN_AI_20B_API_KEY;
    let aiPrediction = null;

    if (apiKey) {
      try {
        const aiPrompt = `Eres un experto en agricultura y predicción de floración de cultivos. 
Analiza los siguientes datos de una parcela agrícola y predice la floración:

DATOS DE LA PARCELA:
- Área: ${areaHectares} hectáreas
- Ubicación central: Lat ${centroid.lat.toFixed(4)}, Lng ${centroid.lng.toFixed(4)}
- Índices actuales:
  * NDVI (Índice de Vegetación): ${currentIndices.NDVI}
  * EVI (Índice de Vegetación Mejorado): ${currentIndices.EVI}
  * NDWI (Índice de Agua): ${currentIndices.NDWI}
  * Temperatura promedio: ${currentIndices.temperature}°C
  * Precipitación: ${currentIndices.precipitation}mm

TAREA:
Proporciona una predicción de floración detallada en formato JSON:
{
  "days_until_bloom": número estimado de días,
  "confidence_percentage": porcentaje de confianza (0-100),
  "bloom_status": "estado actual (ej: Pre-floración, Inicio de floración, etc)",
  "key_indicators": ["indicador 1", "indicador 2", "indicador 3"],
  "recommendations": ["recomendación 1", "recomendación 2", "recomendación 3"],
  "risk_factors": ["factor de riesgo 1", "factor de riesgo 2"]
}`;

        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "Zenit View - Bloom Prediction",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "model": "openai/gpt-oss-20b:free",
            "messages": [
              {
                "role": "user",
                "content": aiPrompt
              }
            ]
          })
        });

        if (openRouterResponse.ok) {
          const aiData = await openRouterResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          try {
            aiPrediction = JSON.parse(content);
          } catch {
            aiPrediction = { raw_response: content };
          }
        }
      } catch (aiError) {
        console.error('Error calling OpenRouter AI:', aiError);
      }
    }

    // Preparar respuesta fallback combinando datos simulados con predicción de IA
    const response = {
      message: 'Predicción de floración generada con análisis de IA (Modo Fallback)',
      polygon: body.coordinates,
      backend_used: false,
      fallback_mode: true,
      current_data: {
        timestamp: new Date().toISOString(),
        area_hectares: areaHectares,
        center_coordinates: centroid,
        indices: currentIndices,
        note: '⚠️ Índices simulados - Backend no disponible. Conecte con Google Earth Engine para datos reales'
      },
      flowering_prediction: aiPrediction ? {
        prediction_date: new Date(Date.now() + (aiPrediction.days_until_bloom || 14) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        days_until_bloom: aiPrediction.days_until_bloom || 14,
        confidence: (aiPrediction.confidence_percentage || 75) / 100,
        probability: `${aiPrediction.confidence_percentage || 75}%`,
        status: aiPrediction.bloom_status || 'Análisis completado (Fallback)',
        ai_analysis: {
          key_indicators: aiPrediction.key_indicators || [],
          recommendations: aiPrediction.recommendations || [],
          risk_factors: aiPrediction.risk_factors || []
        },
        backend_available: false,
        note: 'Predicción generada por IA - OpenRouter GPT-OSS-20B (Modo Fallback)',
        recommendation: 'Inicia el backend de Python en http://localhost:8000 para predicciones reales'
      } : {
        prediction_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        days_until_bloom: 14,
        confidence: 0.70,
        probability: '70%',
        status: 'Predicción básica (sin IA ni Backend)',
        recommendations: [
          'Inicia el backend de Python (FastAPI) en http://localhost:8000',
          'Configure NEXT_PUBLIC_OPEN_AI_20B_API_KEY para análisis de IA',
          'Monitorear índices de vegetación',
          'Verificar condiciones climáticas'
        ],
        backend_available: false,
        note: 'Backend y AI no disponibles. Usando datos simulados.'
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error en /api/predict-bloom:', error);
    return NextResponse.json(
      { detail: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función auxiliar para calcular el área del polígono (fórmula de Shoelace)
function calculatePolygonArea(coordinates: [number, number][]): number {
  let area = 0;
  const n = coordinates.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }
  
  area = Math.abs(area) / 2;
  
  // Convertir de grados cuadrados a hectáreas (aproximación)
  const metersPerDegree = 111320;
  const areaMeters = area * metersPerDegree * metersPerDegree;
  const areaHectares = areaMeters / 10000;
  
  return areaHectares;
}

// Función auxiliar para calcular el centroide del polígono
function calculateCentroid(coordinates: [number, number][]): { lat: number; lng: number } {
  let sumLat = 0;
  let sumLng = 0;
  
  for (const coord of coordinates) {
    sumLng += coord[0];
    sumLat += coord[1];
  }
  
  return {
    lng: sumLng / coordinates.length,
    lat: sumLat / coordinates.length
  };
}
