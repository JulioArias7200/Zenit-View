# Configuración de Google Maps API

## 🔑 Cómo obtener tu API Key de Google Maps

El editor de polígonos requiere una **API Key de Google Maps** para funcionar. Sigue estos pasos:

---

## 📋 Pasos para Configurar

### 1. Crear/Acceder a Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Inicia sesión con tu cuenta de Google
3. Crea un nuevo proyecto o selecciona uno existente:
   - Click en el selector de proyecto (parte superior)
   - Click en "NUEVO PROYECTO"
   - Nombre: `Zenit View Hackaton` (o el nombre que prefieras)
   - Click en "CREAR"

### 2. Habilitar Google Maps JavaScript API

1. En el menú lateral, ve a **APIs y servicios** → **Biblioteca**
2. Busca: `Maps JavaScript API`
3. Click en **Maps JavaScript API**
4. Click en **HABILITAR**

### 3. Crear Credenciales (API Key)

1. En el menú lateral, ve a **APIs y servicios** → **Credenciales**
2. Click en **+ CREAR CREDENCIALES** → **Clave de API**
3. Se creará tu API Key (algo como: `AIzaSyD...`)
4. **IMPORTANTE:** Click en **RESTRINGIR CLAVE** para configurar:

#### Restricciones Recomendadas:

**Restricciones de aplicación:**
- Selecciona: **Referentes HTTP (sitios web)**
- Agrega estos referentes:
  ```
  localhost:3000/*
  localhost:*
  127.0.0.1:*
  ```
  (Para producción, agrega tu dominio real)

**Restricciones de API:**
- Selecciona: **Restringir clave**
- Marca solo:
  - ✅ Maps JavaScript API
  - ✅ Geocoding API (opcional)
  - ✅ Places API (opcional)

5. Click en **GUARDAR**

### 4. Configurar en tu Proyecto

1. Crea un archivo `.env.local` en la raíz del proyecto (si no existe):
   ```bash
   # En Windows (PowerShell)
   New-Item -ItemType File -Path .env.local
   
   # O simplemente créalo en tu editor de código
   ```

2. Agrega tu API Key al archivo `.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD...tu_clave_aqui
   ```

3. **IMPORTANTE:** Asegúrate de que `.env.local` NO esté en tu repositorio:
   - Verifica que `.env.local` esté en `.gitignore`
   - NUNCA subas tu API Key a GitHub

### 5. Reiniciar el Servidor

```bash
# Detén el servidor (Ctrl+C)
# Inicia de nuevo:
npm run dev
```

---

## ✅ Verificar que Funciona

1. Ve a la pestaña **Parcelas**
2. Click en el botón **✏️ Editar** (verde) de cualquier parcela
3. Deberías ver el mapa satelital de Google Maps
4. Si ves un error, revisa:
   - ✅ API Key está correctamente copiada en `.env.local`
   - ✅ No hay espacios extra al inicio/final de la clave
   - ✅ La variable se llama exactamente `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - ✅ Reiniciaste el servidor después de crear `.env.local`

---

## 🚨 Problemas Comunes

### Error: "BillingNotEnabledMapError" ⚠️ MUY COMÚN
**Causa:** El proyecto de Google Cloud no tiene facturación habilitada.

**Solución:**
1. **Ve a**: [Google Cloud Billing](https://console.cloud.google.com/billing)
2. **Selecciona** tu proyecto en el selector de proyectos (parte superior)
3. **Click en** "Vincular una cuenta de facturación"
4. **Crea** una cuenta de facturación (requiere tarjeta de crédito)
5. **Importante:** Google ofrece **$200 USD gratis** cada mes
6. **Para desarrollo:** Nunca se cobra si no excedes $200/mes
7. **Reinicia** el servidor después de habilitar facturación

**Nota:** Aunque requiere tarjeta, NO se cobra automáticamente. Los $200 gratis son más que suficientes para desarrollo.

### Error: "ApiProjectMapError"
**Causa:** La API Key está vacía o mal configurada.

**Solución:**
1. Verifica que `.env.local` existe en la raíz del proyecto
2. Verifica que la variable se llama `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
3. Verifica que no hay espacios: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...` (sin espacios)
4. Reinicia el servidor

### Error: "Esta página no puede cargar Google Maps correctamente"
**Causa:** La API Key no tiene permisos o está restringida incorrectamente.

**Solución:**
1. Ve a Google Cloud Console → Credenciales
2. Click en tu API Key
3. En "Restricciones de API", asegúrate de que "Maps JavaScript API" esté habilitada
4. En "Restricciones de aplicación", agrega `localhost:*` a los referentes

### Error: "RefererNotAllowedMapError"
**Causa:** Tu dominio no está en la lista de referentes permitidos.

**Solución:**
1. Ve a Google Cloud Console → Credenciales → Tu API Key
2. En "Restricciones de aplicación" agrega:
   - `localhost:*`
   - `127.0.0.1:*`

---

## 💰 Costos

Google Maps ofrece **$200 USD de crédito gratis mensual**.

Para desarrollo local y proyectos pequeños, esto es más que suficiente.

**Uso estimado del editor de polígonos:**
- Maps JavaScript API: ~$0.007 por carga de mapa
- Con $200 gratis: ~28,000 cargas de mapa gratis al mes

---

## 📚 Recursos

- [Documentación oficial de Google Maps API](https://developers.google.com/maps/documentation/javascript)
- [Obtener una API Key](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [Consola de Google Cloud](https://console.cloud.google.com)
- [Precios de Google Maps](https://mapsplatform.google.com/pricing/)

---

## 🔐 Seguridad

**IMPORTANTE:**
- ✅ Siempre usa restricciones de API
- ✅ Siempre usa restricciones de dominio
- ✅ NUNCA subas `.env.local` a GitHub
- ✅ Si expones tu clave accidentalmente, regénérala inmediatamente

---

## 📝 Ejemplo Completo

Tu archivo `.env.local` debe verse así:

```env
# Google Maps API Key para editor de polígonos
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Otras variables de entorno (si las tienes)
# NASA_API_KEY=...
# etc.
```

---

**¿Problemas?** Revisa la documentación en `OBSERVACIONES_Y_SOLUCIONES.md` sección #20.
