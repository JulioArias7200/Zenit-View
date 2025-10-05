# 🔑 Configuración de APIs - ZENIT VIEW

Este documento explica cómo configurar las API keys necesarias para el funcionamiento completo de la plataforma.

---

## 📡 APIs Utilizadas

### 1. **OpenWeather API** (Clima en tiempo real)
**Estado:** ⚠️ Requiere configuración  
**Costo:** Gratis (60 requests/minuto)  
**Necesario para:** Clima actual en tarjetas de parcelas y vista detallada

#### Cómo obtener la API Key:

1. **Regístrate en OpenWeather:**
   - Ve a: https://openweathermap.org/api
   - Click en "Sign Up" (esquina superior derecha)
   - Completa el formulario de registro
   - Verifica tu email

2. **Obtén tu API Key:**
   - Inicia sesión en tu cuenta
   - Ve a: https://home.openweathermap.org/api_keys
   - Copia tu API Key (la que dice "Default")
   - **IMPORTANTE:** Puede tardar 10-30 minutos en activarse

3. **Configura en el proyecto:**
   - Abre el archivo `.env.local` en la raíz del proyecto
   - Si no existe, créalo
   - Agrega la siguiente línea:
   ```
   NEXT_PUBLIC_OPENWEATHER_API_KEY=tu_api_key_aqui
   ```
   - Reemplaza `tu_api_key_aqui` con tu API key real

4. **Reinicia el servidor de desarrollo:**
   ```bash
   # Detén el servidor (Ctrl + C)
   # Inicia nuevamente
   npm run dev
   ```

#### Ejemplo de .env.local:
```env
# OpenWeather API
NEXT_PUBLIC_OPENWEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Cesium Ion Token
NEXT_PUBLIC_CESIUM_ION_TOKEN=tu_token_de_cesium
```

---

### 2. **NASA POWER API** (Datos climáticos históricos)
**Estado:** ✅ Funciona sin configuración  
**Costo:** Gratis y sin API key  
**Necesario para:** Datos climáticos históricos de 30 días

#### No requiere configuración
- La NASA POWER API es completamente pública
- No necesita API key
- Funciona directamente sin configuración adicional

---

### 3. **Cesium Ion** (Globo 3D)
**Estado:** ⚠️ Requiere token  
**Costo:** Gratis (hasta 5 GB/mes de tilesets)  
**Necesario para:** Visualización del globo terráqueo 3D

#### Cómo obtener el token:

1. **Regístrate en Cesium Ion:**
   - Ve a: https://cesium.com/ion/signup
   - Completa el registro

2. **Obtén tu Access Token:**
   - Inicia sesión en Cesium Ion
   - Ve a: https://cesium.com/ion/tokens
   - Copia tu "Default" token

3. **Configura en el proyecto:**
   - Abre `.env.local`
   - Agrega:
   ```
   NEXT_PUBLIC_CESIUM_ION_TOKEN=tu_token_de_cesium
   ```

---

### 4. **Perenual Plant API** (Información de plantas)
**Estado:** 🔄 Opcional (preparado pero no usado actualmente)  
**Costo:** Gratis (100 requests/día)  
**Necesario para:** Información detallada de especies vegetales

#### Actualmente no es necesaria
La integración está preparada pero no se usa en la versión actual.

---

## 🚨 MODO DEMO (Sin API Keys)

Si **NO** configuras las API keys, la aplicación funciona en **MODO DEMO**:

### ✅ Funciona:
- Globo 3D (con token básico de Cesium)
- Gestión de parcelas (CRUD)
- Análisis de floración (datos del CSV)
- Interfaz completa

### ⚠️ Datos Simulados:
- **Clima actual:** Muestra datos aleatorios realistas
- **Badge "Demo"** o **"MODO DEMO"** en las tarjetas
- Temperaturas: 18-30°C
- Humedad: 40-80%
- Viento: 0-5 m/s

### ❌ No Funciona:
- Datos climáticos reales de OpenWeather
- (Las demás funcionalidades principales SÍ funcionan)

---

## 📋 Checklist de Configuración

### Mínimo Necesario (para presentación):
- [ ] Cesium Ion Token
- [ ] OpenWeather API Key (o dejar en modo demo)

### Configuración Completa:
- [ ] Cesium Ion Token
- [ ] OpenWeather API Key
- [ ] Verificar que NASA POWER funciona (sin config)
- [ ] (Opcional) Perenual Plant API

---

## 🔧 Solución de Problemas

### Error: "401 Unauthorized" en OpenWeather
**Causa:** API key no configurada o inválida  
**Solución:**
1. Verifica que la API key está en `.env.local`
2. Verifica que la variable empieza con `NEXT_PUBLIC_`
3. Espera 10-30 minutos después de crear la key
4. Reinicia el servidor de desarrollo

### Error: Cesium InfoBox no funciona
**Causa:** Sandbox blocking scripts  
**Solución:** Ya está resuelto en el código (ver commit actual)

### Error: NASA POWER tarda mucho
**Causa:** Es normal, la API es lenta  
**Solución:** Espera 5-10 segundos, muestra spinner de carga

---

## 💡 Recomendaciones

### Para Desarrollo:
- Usa MODO DEMO si no necesitas datos climáticos reales
- Configura OpenWeather solo si necesitas datos precisos

### Para Presentación/Producción:
- **Configura todas las APIs** para datos reales
- Verifica que las keys funcionan antes de la presentación
- Ten datos de ejemplo cargados como respaldo

### Para Hackathon:
- Carga las 4 parcelas de ejemplo
- Asegúrate de que el globo 3D funciona
- Ten la presentación de floración lista
- El modo demo es suficiente si no tienes tiempo de configurar APIs

---

## 📊 Límites de las APIs (Plan Gratuito)

| API | Requests | Límite | Renovación |
|-----|----------|--------|------------|
| OpenWeather | 60 | por minuto | Continuo |
| OpenWeather | 1,000 | por día | Diario |
| NASA POWER | Sin límite | conocido | N/A |
| Cesium Ion | 5 GB | por mes | Mensual |

---

## 🎯 Estado Actual del Proyecto

### ✅ Completado:
- Integración con OpenWeather (con fallback a demo)
- Integración con NASA POWER (funciona sin config)
- Manejo de errores graceful
- Modo demo automático
- Indicadores visuales de demo

### 🔄 En Progreso:
- Configuración de APIs por el usuario

### 📝 Pendiente:
- Cache de datos de APIs
- Retry automático con backoff
- Perenual Plant API integration

---

*Última actualización: 04 de Octubre, 2025 - 21:30*
