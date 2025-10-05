# 🌸 BloomWatch - NASA Space Apps Challenge 2025

**BloomWatch** es un sistema completo para detectar y monitorear floraciones de plantas usando datos satelitales de la NASA a través de Google Earth Engine.

## 🚀 Características Principales

- **🛰️ Datos NASA**: Acceso directo a Landsat, MODIS y VIIRS
- **🌱 Detección de Floraciones**: Algoritmos avanzados de NDVI
- **📊 Análisis Temporal**: Identificación de patrones estacionales
- **🗺️ Mapas Interactivos**: Visualización en tiempo real
- **📈 Gráficos Dinámicos**: Series temporales y análisis estadístico
- **🔬 API REST**: Endpoints completos para integración
- **💾 Base de Datos**: Almacenamiento de resultados y análisis

## 🏗️ Arquitectura

```
NASA/
├── BACKEND/                 # API FastAPI + Python
│   ├── app/
│   │   ├── api/routes/     # Endpoints REST
│   │   ├── services/       # Servicios de negocio
│   │   ├── database/       # Modelos y configuración DB
│   │   └── core/          # Configuración central
│   ├── requirements.txt    # Dependencias Python
│   └── run.py             # Script de inicio
├── FRONTEND/               # React + TypeScript
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── services/      # Servicios API
│   │   └── types/         # Tipos TypeScript
│   └── package.json       # Dependencias Node.js
└── README.md              # Este archivo
```

## 🛠️ Instalación y Configuración

### Prerrequisitos

- **Python 3.8+**
- **Node.js 16+**
- **PostgreSQL 12+**
- **Google Earth Engine Account** (gratuito para académicos)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/bloomwatch-nasa.git
cd bloomwatch-nasa
```

### 2. Configurar Backend

```bash
cd BACKEND

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp env_example.txt .env
# Editar .env con tus configuraciones

# Configurar Google Earth Engine
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/earthengine,https://www.googleapis.com/auth/devstorage.full_control
gcloud auth application-default set-quota-project tu-proyecto-gcp

# Iniciar servidor
python run.py
```

### 3. Configurar Frontend

```bash
cd FRONTEND

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

## 🌐 URLs de Acceso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs
- **Documentación ReDoc**: http://localhost:8000/redoc

## 🛰️ Satélites Soportados

| Satélite | Resolución | Frecuencia | Mejor Para |
|----------|------------|------------|------------|
| **Landsat 8/9** | 30m | 16 días | Detección detallada |
| **MODIS** | 250m | 16 días | Monitoreo regional |
| **VIIRS** | 500m | 16 días | Monitoreo global |

## 📖 Uso de la API

### Detección de Floraciones

```http
POST /api/v1/bloom/detect
Content-Type: application/json

{
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "bbox": [-74.0, 40.7, -73.9, 40.8],
  "collection": "MODIS/006/MOD13Q1",
  "ndvi_threshold": 0.6
}
```

### Análisis Temporal

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

## 🔧 Configuración de Google Earth Engine

### 1. Registro (Gratuito)

1. Ve a [Google Earth Engine](https://earthengine.google.com/signup/)
2. Regístrate con tu cuenta de Google
3. Selecciona "Academic/Research" (es gratuito)
4. Espera aprobación (24-48 horas)

### 2. Configuración Local

```bash
# Instalar Google Cloud SDK
# Windows: Descargar desde https://cloud.google.com/sdk/docs/install
# macOS: brew install google-cloud-sdk
# Linux: curl https://sdk.cloud.google.com | bash

# Autenticación
gcloud auth login
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/earthengine,https://www.googleapis.com/auth/devstorage.full_control

# Configurar proyecto
gcloud config set project tu-proyecto-gcp
gcloud services enable earthengine.googleapis.com
```

## 🐳 Docker (Opcional)

```bash
# Backend
cd BACKEND
docker build -t bloomwatch-api .
docker run -p 8000:8000 bloomwatch-api

# Frontend
cd FRONTEND
docker build -t bloomwatch-frontend .
docker run -p 3000:3000 bloomwatch-frontend
```

## 🧪 Testing

```bash
# Backend
cd BACKEND
pytest

# Frontend
cd FRONTEND
npm test
```

## 📊 Funcionalidades

### ✅ Implementadas
- [x] API REST completa
- [x] Interfaz web React
- [x] Mapas interactivos
- [x] Gráficos temporales
- [x] Integración con GEE
- [x] Base de datos PostgreSQL
- [x] Documentación API

### 🚧 En Desarrollo
- [ ] Análisis de machine learning
- [ ] Notificaciones automáticas
- [ ] Exportación de reportes
- [ ] Dashboard administrativo

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

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

- **🌾 Agricultura**: Predicción de floraciones para optimizar cosechas
- **🌿 Conservación**: Monitoreo de ecosistemas y biodiversidad
- **🌍 Clima**: Análisis de patrones estacionales y cambio climático
- **🏥 Salud Pública**: Predicción de niveles de polen

## 📞 Contacto

- **Proyecto**: BloomWatch NASA Space Apps 2025
- **Repositorio**: [GitHub Repository]
- **Documentación**: [API Docs](http://localhost:8000/docs)

---

*Desarrollado con ❤️ para el NASA Space Apps Challenge 2025*
