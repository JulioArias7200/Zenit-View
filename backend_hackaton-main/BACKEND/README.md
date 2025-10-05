# 🌸 BloomWatch Backend - NASA Space Apps Challenge 2025

**BloomWatch** es un sistema backend para detectar y monitorear floraciones de plantas usando datos satelitales de la NASA a través de Google Earth Engine.

## 🚀 Características Principales

- **Detección de Floraciones**: Utiliza algoritmos de NDVI y análisis espectral para detectar floraciones de plantas
- **Datos NASA**: Acceso directo a Landsat, MODIS y VIIRS a través de Google Earth Engine
- **Análisis Temporal**: Identificación de patrones estacionales y picos de floración
- **Visualizaciones**: Generación de mapas interactivos y gráficos temporales
- **API REST**: Endpoints completos para integración con frontend
- **Base de Datos**: Almacenamiento de resultados y análisis históricos

## 🛰️ Satélites Soportados

| Satélite | Resolución | Frecuencia | Mejor Para |
|----------|------------|------------|------------|
| **Landsat 8/9** | 30m | 16 días | Detección detallada de floraciones |
| **MODIS** | 250m | 16 días | Monitoreo regional |
| **VIIRS** | 500m | 16 días | Monitoreo global |

## 🏗️ Arquitectura

```
app/
├── main.py                 # Aplicación principal FastAPI
├── core/
│   └── config.py          # Configuración y variables de entorno
├── services/
│   ├── gee_service.py     # Integración con Google Earth Engine
│   ├── bloom_detector.py  # Algoritmos de detección de floraciones
│   └── data_processor.py  # Procesamiento de datos satelitales
├── database/
│   ├── models.py          # Modelos de base de datos
│   └── database.py        # Configuración de base de datos
└── api/routes/
    ├── bloom.py           # Endpoints de detección de floraciones
    ├── nasa_data.py       # Endpoints de datos NASA
    └── visualization.py   # Endpoints de visualización
```

## 🛠️ Instalación

### Prerrequisitos

- Python 3.8+
- PostgreSQL
- Redis (opcional, para tareas en background)
- Cuenta de Google Earth Engine

### Configuración de Google Earth Engine

1. **Registrarse en GEE**: Ve a [Google Earth Engine](https://earthengine.google.com/)
2. **Autenticación**: Ejecuta en tu terminal:
   ```bash
   earthengine authenticate
   ```
3. **Verificar acceso**: Asegúrate de tener acceso a los datasets de NASA

### Instalación del Proyecto

1. **Clonar el repositorio**:
   ```bash
   git clone <repository-url>
   cd NASA/BACKEND
   ```

2. **Crear entorno virtual**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # o
   venv\Scripts\activate     # Windows
   ```

3. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno**:
   ```bash
   cp env_example.txt .env
   # Editar .env con tus configuraciones
   ```

5. **Configurar base de datos**:
   ```bash
   # Crear base de datos PostgreSQL
   createdb bloomwatch_db
   
   # Ejecutar migraciones (si usas Alembic)
   alembic upgrade head
   ```

6. **Ejecutar la aplicación**:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

## 📖 Uso de la API

### Endpoints Principales

#### 1. Detección de Floraciones
```http
POST /api/v1/bloom/detect
Content-Type: application/json

{
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "bbox": [-74.0, 40.7, -73.9, 40.8],
  "collection": "MODIS/006/MOD13Q1",
  "detection_method": "ndvi_threshold",
  "ndvi_threshold": 0.6
}
```

#### 2. Análisis Temporal
```http
POST /api/v1/bloom/temporal-analysis
Content-Type: application/json

{
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "bbox": [-74.0, 40.7, -73.9, 40.8],
  "collection": "MODIS/006/MOD13Q1"
}
```

#### 3. Datos NDVI
```http
POST /api/v1/nasa/ndvi/modis
Content-Type: application/json

{
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-31T23:59:59Z",
  "bbox": [-74.0, 40.7, -73.9, 40.8],
  "collection": "MODIS/006/MOD13Q1"
}
```

#### 4. Generar Mapa
```http
POST /api/v1/viz/map/ndvi
Content-Type: application/json

{
  "bbox": [-74.0, 40.7, -73.9, 40.8],
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-31T23:59:59Z",
  "collection": "MODIS/006/MOD13Q1",
  "map_type": "ndvi"
}
```

### Colecciones Disponibles

- `LANDSAT/LC08/C02/T1_L2` - Landsat 8 (30m)
- `LANDSAT/LC09/C02/T1_L2` - Landsat 9 (30m)
- `MODIS/006/MOD13Q1` - MODIS NDVI (250m)
- `NOAA/VIIRS/001/VNP13A1` - VIIRS NDVI (500m)

## 🔬 Algoritmos de Detección

### 1. NDVI Threshold
- Calcula el Índice de Vegetación de Diferencia Normalizada
- Identifica áreas con NDVI > 0.6 como floraciones potenciales
- Aplica operaciones morfológicas para limpiar el ruido

### 2. Análisis Temporal
- Detecta picos en series temporales de NDVI
- Identifica patrones estacionales
- Calcula métricas de tendencia

### 3. Análisis Espectral
- Combina múltiples bandas espectrales
- Detecta anomalías espectrales
- Calcula índices adicionales (EVI, SAVI)

## 📊 Visualizaciones

### Mapas Interactivos
- Mapas NDVI con codificación de colores
- Áreas de floración destacadas
- Información estadística en popups

### Gráficos Temporales
- Series temporales de NDVI
- Detección automática de picos
- Líneas de umbral para floraciones

## 🗄️ Base de Datos

### Modelos Principales

- **SatelliteImage**: Metadatos de imágenes satelitales
- **BloomDetection**: Resultados de detección de floraciones
- **BloomCluster**: Clusters individuales de floraciones
- **TemporalAnalysis**: Análisis temporales
- **Visualization**: Archivos de visualización generados

## 🔧 Configuración

### Variables de Entorno

```env
# Google Earth Engine (automático con autenticación)
# No se requieren credenciales adicionales

# Base de datos
DATABASE_URL=postgresql://username:password@localhost:5432/bloomwatch_db
REDIS_URL=redis://localhost:6379

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
```

## 🧪 Testing

```bash
# Ejecutar tests
pytest

# Tests con cobertura
pytest --cov=app

# Tests específicos
pytest tests/test_bloom_detection.py
```

## 📈 Monitoreo

### Health Checks

```http
GET /health                    # Estado general
GET /api/v1/bloom/health      # Estado del servicio de floraciones
GET /api/v1/nasa/status       # Estado de datos NASA
```

### Métricas

- Tiempo de procesamiento
- Número de detecciones exitosas
- Uso de recursos de GEE
- Estadísticas de la base de datos

## 🚀 Despliegue

### Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Producción

1. **Configurar GEE**: Asegurar autenticación en el servidor
2. **Base de datos**: PostgreSQL con respaldos automáticos
3. **Redis**: Para tareas en background (opcional)
4. **Proxy reverso**: Nginx para SSL y balanceo
5. **Monitoreo**: Logs estructurados y alertas

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🏆 NASA Space Apps Challenge 2025

Este proyecto fue desarrollado para el **NASA Space Apps Challenge 2025** en el reto **BloomWatch**.

### Cumplimiento de Requisitos

✅ **Datos NASA**: Utiliza Landsat, MODIS y VIIRS oficiales  
✅ **Google Earth Engine**: Integración completa con GEE  
✅ **Costo Cero**: Completamente gratuito para académicos  
✅ **Escalabilidad**: Procesamiento masivo en la nube  
✅ **Detección de Floraciones**: Algoritmos avanzados de NDVI  

### Impacto Científico

- **Agricultura**: Predicción de floraciones para optimizar cosechas
- **Conservación**: Monitoreo de ecosistemas y biodiversidad
- **Clima**: Análisis de patrones estacionales y cambio climático
- **Salud Pública**: Predicción de niveles de polen

## 📞 Contacto

- **Proyecto**: BloomWatch NASA Space Apps 2025
- **Repositorio**: [GitHub Repository]
- **Documentación**: [API Docs](http://localhost:8000/docs)

---

*Desarrollado con ❤️ para el NASA Space Apps Challenge 2025*
