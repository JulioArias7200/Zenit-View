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
    let backendResponse = null;
    let usingBackend = false;

    try {
      const response = await fetch(`${backendUrl}/api/v1/bloom/train-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: body.coordinates }),
        signal: AbortSignal.timeout(30000) // 30 segundos timeout
      });

      if (response.ok) {
        backendResponse = await response.json();
        usingBackend = true;
        
        return NextResponse.json({
          ...backendResponse,
          backend_used: true,
          backend_url: backendUrl
        }, { status: 200 });
      }
    } catch (backendError) {
      console.warn('Backend de Python no disponible, usando fallback con OpenRouter AI:', backendError);
    }

    // Calcular información del polígono
    const areaHectares = calculatePolygonArea(body.coordinates).toFixed(4);
    const pointsCount = body.coordinates.length;

    // Llamar a OpenRouter AI para obtener análisis del entrenamiento
    const apiKey = process.env.NEXT_PUBLIC_OPEN_AI_20B_API_KEY;
    let aiResponse = null;

    if (apiKey) {
      try {
        const aiPrompt = `Eres un experto en agricultura y análisis de modelos de machine learning para predicción de floración. 
Se está entrenando un modelo con los siguientes datos:
- Área de la parcela: ${areaHectares} hectáreas
- Número de puntos del polígono: ${pointsCount}
- Coordenadas centrales: ${JSON.stringify(body.coordinates[0])}

Proporciona un análisis breve (máximo 150 palabras) sobre:
1. La viabilidad del área para entrenamiento del modelo
2. Recomendaciones para mejorar la precisión del modelo
3. Factores climáticos clave a monitorear

Responde en formato JSON con la siguiente estructura:
{
  "viability": "texto aquí",
  "recommendations": ["recomendación 1", "recomendación 2"],
  "key_factors": ["factor 1", "factor 2"]
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
            aiResponse = JSON.parse(content);
          } catch {
            aiResponse = { raw_response: content };
          }
        }
      } catch (aiError) {
        console.error('Error calling OpenRouter AI:', aiError);
      }
    }

    // Fallback: respuesta sin backend de Python
    const response = {
      message: 'Modelo de entrenamiento iniciado con análisis de IA (Modo Fallback)',
      polygon: body.coordinates,
      backend_used: false,
      fallback_mode: true,
      model_status: {
        status: 'training_initiated_fallback',
        model_id: `model_${Date.now()}`,
        points_count: pointsCount,
        estimated_completion: 'N/A - Backend no disponible',
        message: '⚠️ Backend de Python no disponible. Usando modo de demostración con OpenRouter AI.',
        area_hectares: areaHectares,
        ai_analysis: aiResponse || { note: 'AI analysis not available. Check NEXT_PUBLIC_OPEN_AI_20B_API_KEY configuration.' },
        backend_available: false,
        recommendation: 'Inicia el backend de Python (FastAPI) en http://localhost:8000 para entrenar modelos reales'
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error en /api/train-model:', error);
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
  // Esta es una aproximación simple, para cálculos precisos usar librerías geoespaciales
  const metersPerDegree = 111320; // aproximadamente a nivel del ecuador
  const areaMeters = area * metersPerDegree * metersPerDegree;
  const areaHectares = areaMeters / 10000;
  
  return areaHectares;
}
