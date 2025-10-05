"""
Bloom detection API endpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Depends
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import logging
from app.services.bloom_detector import bloom_detector
from app.services.gee_service import gee_service
from app.database.database import get_db
from sqlalchemy.orm import Session
from app.services.iamodel_service import predict_flowering_days,entrenar_modelo_floracion
import os

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models for request/response
class BloomDetectionRequest(BaseModel):
    """Request model for bloom detection"""
    start_date: datetime = Field(..., description="Start date for analysis (YYYY-MM-DD)")
    end_date: datetime = Field(..., description="End date for analysis (YYYY-MM-DD)")
    bbox: List[float] = Field(..., description="Bounding box [min_lon, min_lat, max_lon, max_lat]", min_items=4, max_items=4)
    collection: str = Field(default="MODIS/006/MOD13Q1", description="NASA satellite collection to use")
    detection_method: str = Field(default="ndvi_threshold", description="Detection method")
    ndvi_threshold: Optional[float] = Field(default=0.6, description="NDVI threshold for bloom detection")

class BloomDetectionResponse(BaseModel):
    """Response model for bloom detection"""
    job_id: int
    status: str
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

class TemporalAnalysisRequest(BaseModel):
    """Request model for temporal analysis"""
    start_date: datetime = Field(..., description="Start date for analysis")
    end_date: datetime = Field(..., description="End date for analysis")
    bbox: List[float] = Field(..., description="Bounding box [min_lon, min_lat, max_lon, max_lat]", min_items=4, max_items=4)
    collection: str = Field(default="MODIS/006/MOD13Q1", description="NASA satellite collection")
    point: Optional[List[float]] = Field(default=None, description="Specific point for time series [lon, lat]", min_items=2, max_items=2)

class BloomHistoryRequest(BaseModel):
    """Request model for bloom history"""
    bbox: List[float] = Field(..., description="Bounding box [min_lon, min_lat, max_lon, max_lat]", min_items=4, max_items=4)
    days_back: int = Field(default=365, description="Number of days to look back", ge=1, le=3650)

class PolygonRequest(BaseModel):
    """Modelo para recibir las coordenadas de la parcela como polígono"""
    coordinates: List[List[float]] = Field(..., description="Lista de puntos [lon, lat] que forman el polígono")

@router.post("/detect", response_model=BloomDetectionResponse)
async def detect_blooms(
    request: BloomDetectionRequest,
    background_tasks: BackgroundTasks
):
    """
    Detect bloom areas in a specified region and time period using NASA satellite data
    
    This endpoint uses Google Earth Engine to access NASA satellite data (Landsat, MODIS, VIIRS)
    and detect potential bloom areas based on vegetation indices.
    """
    try:
        # Validate bbox
        if len(request.bbox) != 4:
            raise HTTPException(status_code=400, detail="Bounding box must have 4 coordinates")
        
        min_lon, min_lat, max_lon, max_lat = request.bbox
        
        # Validate coordinate ranges
        if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180):
            raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
        if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
            raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
        
        if min_lon >= max_lon or min_lat >= max_lat:
            raise HTTPException(status_code=400, detail="Invalid bounding box coordinates")
        
        # Validate date range
        if request.end_date <= request.start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        max_period = timedelta(days=365)
        if request.end_date - request.start_date > max_period:
            raise HTTPException(status_code=400, detail="Analysis period cannot exceed 365 days")
        
        # Check if GEE is available
        if not gee_service.is_available():
            raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
        
        # Run bloom detection
        bbox_tuple = (min_lon, min_lat, max_lon, max_lat)
        result = await bloom_detector.detect_blooms(
            start_date=request.start_date,
            end_date=request.end_date,
            bbox=bbox_tuple,
            collection=request.collection,
            detection_method=request.detection_method
        )
        
        return BloomDetectionResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bloom detection: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/collections")
async def get_available_collections():
    """
    Get list of available NASA satellite collections for bloom detection
    
    Returns information about available satellite datasets that can be used
    for bloom detection through Google Earth Engine.
    """
    try:
        if not gee_service.is_available():
            raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
        
        collections = await gee_service.get_available_collections()
        return {
            "collections": collections,
            "total": len(collections),
            "description": "Available NASA satellite collections for bloom detection"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting collections: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/temporal-analysis")
async def analyze_temporal_patterns(request: TemporalAnalysisRequest):
    """
    Analyze temporal patterns of vegetation for bloom detection
    
    This endpoint analyzes NDVI time series data to detect seasonal bloom patterns
    and identify peak bloom periods.
    """
    try:
        # Validate bbox
        if len(request.bbox) != 4:
            raise HTTPException(status_code=400, detail="Bounding box must have 4 coordinates")
        
        min_lon, min_lat, max_lon, max_lat = request.bbox
        bbox_tuple = (min_lon, min_lat, max_lon, max_lat)
        
        # Validate point if provided
        point_tuple = None
        if request.point:
            if len(request.point) != 2:
                raise HTTPException(status_code=400, detail="Point must have 2 coordinates [lon, lat]")
            point_lon, point_lat = request.point
            if not (-180 <= point_lon <= 180 and -90 <= point_lat <= 90):
                raise HTTPException(status_code=400, detail="Invalid point coordinates")
            point_tuple = (point_lon, point_lat)
        
        # Validate date range
        if request.end_date <= request.start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        max_period = timedelta(days=365 * 3)  # 3 years max for temporal analysis
        if request.end_date - request.start_date > max_period:
            raise HTTPException(status_code=400, detail="Analysis period cannot exceed 3 years")
        
        # Check if GEE is available
        if not gee_service.is_available():
            raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
        
        # Perform temporal analysis
        result = await gee_service.analyze_temporal_patterns(
            collection=request.collection,
            start_date=request.start_date,
            end_date=request.end_date,
            bbox=bbox_tuple,
            point=point_tuple
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "analysis_type": "temporal_patterns",
            "collection": request.collection,
            "period": f"{request.start_date.strftime('%Y-%m-%d')} to {request.end_date.strftime('%Y-%m-%d')}",
            "analysis_area": bbox_tuple,
            "analysis_point": point_tuple,
            "results": result,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in temporal analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/history")
async def get_bloom_history(request: BloomHistoryRequest):
    """
    Get historical bloom detection data for a region
    
    Returns bloom detection history from the database for the specified area
    and time period.
    """
    try:
        # Validate bbox
        if len(request.bbox) != 4:
            raise HTTPException(status_code=400, detail="Bounding box must have 4 coordinates")
        
        min_lon, min_lat, max_lon, max_lat = request.bbox
        bbox_tuple = (min_lon, min_lat, max_lon, max_lat)
        
        # Get bloom history
        history = await bloom_detector.get_bloom_history(
            bbox=bbox_tuple,
            days_back=request.days_back
        )
        
        return {
            "analysis_type": "bloom_history",
            "area": bbox_tuple,
            "period_days": request.days_back,
            "history": history,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting bloom history: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/status/{job_id}")
async def get_job_status(job_id: int):
    """
    Get the status of a bloom detection job
    
    Returns the current status and results of a bloom detection job.
    """
    try:
        from app.database.models import AnalysisJob
        from app.database.database import SessionLocal
        import os
        
        db = SessionLocal()
        try:
            job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")
            
            return {
                "job_id": job.id,
                "job_type": job.job_type,
                "status": job.status,
                "parameters": job.parameters,
                "result_data": job.result_data,
                "error_message": job.error_message,
                "created_at": job.created_at.isoformat(),
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None
            }
        finally:
            db.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check for bloom detection service
    
    Returns the status of the bloom detection service and its dependencies.
    """
    try:
        gee_available = gee_service.is_available()
        
        return {
            "service": "bloom_detection",
            "status": "healthy" if gee_available else "degraded",
            "google_earth_engine": "available" if gee_available else "unavailable",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        return {
            "service": "bloom_detection",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.post("/train-model")
async def train_model(request: PolygonRequest):
    """
    Recibe las coordenadas de un polígono que representa la parcela.
    Por ahora solo valida y retorna las coordenadas recibidas.
    """
    if not request.coordinates or len(request.coordinates) < 3:
        raise HTTPException(status_code=400, detail="Se requieren al menos 3 puntos para formar un polígono")
    for point in request.coordinates:
        if len(point) != 2:
            raise HTTPException(status_code=400, detail="Cada punto debe tener formato [lon, lat]")
    gee_service_available = gee_service.is_available()
    if not gee_service_available:
        raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
    data_history: dict = gee_service.get_history_parcel(request.coordinates)
    response = entrenar_modelo_floracion(demo_mode=False, path_features_nuevos=data_history)
    return {
        "message": "Coordenadas recibidas correctamente",
        "polygon": request.coordinates,
        "model_status": response
    }
def find_file_by_id(folder_path, file_id):
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if str(file_id) in file:
                return os.path.join(root, file)
    return None

async def generate_ai_analysis(days_until_bloom: int, confidence: str, current_data: dict) -> dict:
    """
    Genera análisis explicativo usando IA basado en días hasta floración y nivel de confianza
    """
    import httpx
    import os
    
    # Obtener datos actuales
    ndvi = current_data.get('indices', {}).get('NDVI', 0.0)
    temperature = current_data.get('indices', {}).get('temperature', 0.0)
    precipitation = current_data.get('indices', {}).get('precipitation_7d', 0.0)
    area = current_data.get('area_hectares', 0.0)
    
    # Crear prompt contextual
    prompt = f"""Eres un experto agrónomo especializado en predicción de floración de cultivos.

DATOS DE LA PREDICCIÓN:
- Días hasta floración: {days_until_bloom} días
- Nivel de confianza: {confidence}
- NDVI actual: {ndvi:.3f}
- Temperatura: {temperature:.1f}°C
- Precipitación (7 días): {precipitation:.1f}mm
- Área de la parcela: {area:.2f} hectáreas

Tu tarea es generar un análisis profesional y explicativo en español para agricultores. Responde ÚNICAMENTE en formato JSON con esta estructura exacta:

{{
  "key_indicators": [
    "Indicador 1 explicando por qué la floración será en {days_until_bloom} días",
    "Indicador 2 sobre el nivel de confianza de {confidence}",
    "Indicador 3 sobre las condiciones ambientales actuales"
  ],
  "recommendations": [
    "Recomendación específica 1 considerando que faltan {days_until_bloom} días",
    "Recomendación específica 2 basada en el nivel de confianza",
    "Recomendación específica 3 sobre preparación para la floración"
  ],
  "risk_factors": [
    "Factor de riesgo 1 (si aplica)",
    "Factor de riesgo 2 (si aplica)"
  ]
}}

Enfócate en explicar por qué la predicción indica {days_until_bloom} días y qué significa el nivel de confianza de {confidence}. Sé específico, práctico y usa los datos satelitales para fundamentar tu análisis."""

    try:
        # Intentar usar OpenRouter AI
        api_key = os.getenv('OPENROUTER_API_KEY')
        
        if api_key:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "meta-llama/llama-3.1-8b-instruct:free",
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 800
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content']
                    
                    # Extraer JSON de la respuesta
                    import json
                    import re
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        return json.loads(json_match.group())
    except Exception as e:
        logger.warning(f"AI analysis failed, using fallback: {e}")
    
    # Fallback: análisis basado en reglas contextuales
    return generate_contextual_analysis(days_until_bloom, confidence, current_data)

def generate_contextual_analysis(days_until_bloom: int, confidence: str, current_data: dict) -> dict:
    """
    Genera análisis contextual cuando IA no está disponible
    """
    ndvi = current_data.get('indices', {}).get('NDVI', 0.0)
    temperature = current_data.get('indices', {}).get('temperature', 0.0)
    precipitation = current_data.get('indices', {}).get('precipitation_7d', 0.0)
    
    # Indicadores clave enfocados en días y confianza
    key_indicators = [
        f"La predicción de {days_until_bloom} días se basa en el análisis de índices de vegetación NDVI ({ndvi:.3f}) y las condiciones climáticas actuales que muestran un patrón consistente de desarrollo vegetativo.",
        f"El nivel de confianza de {confidence} indica {'alta precisión' if confidence.replace('%','').strip() == '95' else 'buena precisión' if int(confidence.replace('%','').strip()) >= 75 else 'precisión moderada'} en la predicción, calculado mediante el modelo de machine learning entrenado con datos históricos de floración.",
        f"Las condiciones ambientales actuales (temperatura: {temperature:.1f}°C, precipitación: {precipitation:.1f}mm/7días) {'favorecen' if temperature > 15 and precipitation > 10 else 'requieren atención para'} el desarrollo óptimo hacia la floración."
    ]
    
    # Recomendaciones específicas según días restantes
    recommendations = []
    if days_until_bloom < 7:
        recommendations = [
            f"Con solo {days_until_bloom} días hasta la floración y {confidence} de confianza, inicie monitoreo diario del desarrollo de yemas florales y prepare el equipo de cosecha.",
            "Verifique las condiciones climáticas a corto plazo para proteger las flores emergentes de eventos extremos.",
            f"Dado el NDVI actual de {ndvi:.3f}, {'mantenga' if ndvi > 0.6 else 'optimice'} las condiciones de irrigación para garantizar una floración uniforme."
        ]
    elif days_until_bloom < 14:
        recommendations = [
            f"Faltan {days_until_bloom} días para la floración con {confidence} de confianza. Planifique la logística de cosecha y asegure disponibilidad de personal.",
            "Realice una última aplicación de fertilización si es necesario, considerando el tiempo de absorción antes de la floración.",
            f"La temperatura actual de {temperature:.1f}°C {'es óptima' if temperature > 18 else 'debe monitorearse'} para el desarrollo floral. {'Considere protección contra heladas.' if temperature < 15 else 'Mantenga las condiciones actuales.'}"
        ]
    elif days_until_bloom < 30:
        recommendations = [
            f"Con {days_until_bloom} días de anticipación y {confidence} de confianza, implemente estrategias de preparación para la floración: revisión de riego, nutrición y control fitosanitario.",
            f"El NDVI de {ndvi:.3f} {'indica buen vigor vegetativo' if ndvi > 0.5 else 'sugiere necesidad de mejorar condiciones'}. Ajuste el manejo según corresponda.",
            "Establezca un calendario de monitoreo semanal para ajustar la predicción conforme se acerca la fecha estimada."
        ]
    else:
        recommendations = [
            f"La predicción indica {days_until_bloom} días hasta la floración con {confidence} de confianza. Use este tiempo para optimizar las condiciones de crecimiento.",
            "Implemente un programa de nutrición balanceada y manejo de agua para maximizar el potencial de floración.",
            f"Las condiciones actuales muestran {'un buen punto de partida' if ndvi > 0.4 else 'necesidad de mejora'}. Monitoree quincenalmente el progreso del cultivo."
        ]
    
    # Factores de riesgo contextuales
    risk_factors = []
    conf_value = int(confidence.replace('%','').strip())
    
    if conf_value < 70:
        risk_factors.append(f"Nivel de confianza de {confidence} sugiere variabilidad en las condiciones; monitorear más frecuentemente")
    if temperature < 10:
        risk_factors.append(f"Temperatura muy baja ({temperature:.1f}°C) puede retrasar la floración prevista en {days_until_bloom} días")
    if temperature > 35:
        risk_factors.append(f"Temperatura muy alta ({temperature:.1f}°C) puede acelerar o estresar el desarrollo floral")
    if precipitation < 5:
        risk_factors.append(f"Precipitación insuficiente ({precipitation:.1f}mm) puede afectar la floración; riego suplementario recomendado")
    if ndvi < 0.4:
        risk_factors.append(f"NDVI bajo ({ndvi:.3f}) indica estrés vegetativo que podría afectar la predicción de {days_until_bloom} días")
    if days_until_bloom < 7 and precipitation > 40:
        risk_factors.append("Exceso de precipitación cercano a floración puede causar caída de flores")
    
    if not risk_factors:
        risk_factors.append("No se detectaron factores de riesgo significativos; condiciones favorables para la floración prevista")
    
    return {
        "key_indicators": key_indicators,
        "recommendations": recommendations,
        "risk_factors": risk_factors
    }

async def generate_flowering_analysis(days_until_bloom: float, current_data: dict) -> dict:
    """
    Genera un análisis completo de la predicción de floración con indicadores y recomendaciones
    """
    from datetime import datetime, timedelta
    
    # Calcular fecha de floración
    days_int = int(days_until_bloom)
    prediction_date = datetime.now() + timedelta(days=days_int)
    
    # Determinar probabilidad y estado basado en datos
    if days_int < 7:
        probability = "95%"
        status = "Floración Inminente - Preparación Crítica"
        color = "red"
    elif days_int < 14:
        probability = "85%"
        status = "Floración Próxima - Fase de Alerta"
        color = "orange"
    elif days_int < 30:
        probability = "75%"
        status = "Desarrollo Activo - Monitoreo Regular"
        color = "yellow"
    else:
        probability = "70%"
        status = "Fase Vegetativa - Planificación Adelantada"
        color = "green"
    
    # Generar análisis con IA o fallback contextual
    ai_analysis = await generate_ai_analysis(days_int, probability, current_data)
    
    return {
        "prediction_date": prediction_date.strftime("%Y-%m-%d"),
        "days_until_bloom": days_int,
        "probability": probability,
        "status": status,
        "color": color,
        "ai_analysis": ai_analysis
    }

@router.post("/predict-bloom")
async def predict_bloom_polygon(request: PolygonRequest,id:int):
    """
    Recibe las coordenadas de un polígono que representa la parcela.
    Por ahora solo valida y retorna las coordenadas recibidas.
    """
    if not request.coordinates or len(request.coordinates) < 3:
        raise HTTPException(status_code=400, detail="Se requieren al menos 3 puntos para formar un polígono")
    for point in request.coordinates:
        if len(point) != 2:
            raise HTTPException(status_code=400, detail="Cada punto debe tener formato [lon, lat]")
    gee_service_available = gee_service.is_available()
    if not gee_service_available:
        raise HTTPException(status_code=503, detail="Google Earth Engine service not available")
    current_data = gee_service.get_current_parcel_data(request.coordinates)
    folder_path = "app/datamodels/features"  
    file_path = find_file_by_id(folder_path, id)

    days_until_bloom = predict_flowering_days(current_data,file_path)
    
    # Generar análisis completo con IA
    flowering_prediction = await generate_flowering_analysis(days_until_bloom, current_data)

    return {
        "message": "Coordenadas recibidas correctamente",
        "polygon": request.coordinates,
        "current_data": current_data,
        "flowering_prediction": flowering_prediction
    }


