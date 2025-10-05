# Paleta de Colores Zenit View

## 🎨 Colores Implementados

| Rol | Nombre | Hex | Tailwind Class | CSS Variable |
|-----|--------|-----|----------------|--------------|
| **Primario** | Azul Cósmico | `#0B3D91` | `cosmic-blue` | `--color-cosmic-blue` |
| **Secundario** | Rosa Flor de Cerezo | `#FF82A9` | `cherry-blossom` | `--color-cherry-blossom` |
| **Acento 1** | Verde Brote | `#A4DE02` | `sprout-green` | `--color-sprout-green` |
| **Acento 2** | Naranja Nebular | `#FFB347` | `nebular-orange` | `--color-nebular-orange` |
| **Fondo** | Blanco Lunar | `#F5F6FA` | `lunar-white` | `--color-lunar-white` |
| **Texto Principal** | Gris Órbita | `#2E2E2E` | `orbit-gray` | `--color-orbit-gray` |
| **Texto Secundario** | Gris Luz Estelar | `#6F6F6F` | `starlight-gray` | `--color-starlight-gray` |

## 📋 Uso

### Con Tailwind CSS (Recomendado)

```tsx
// Fondos
<div className="bg-cosmic-blue">...</div>
<div className="bg-cherry-blossom">...</div>

// Textos
<p className="text-orbit-gray">Texto principal</p>
<span className="text-starlight-gray">Texto secundario</span>

// Bordes
<button className="border-2 border-sprout-green">...</button>

// Combinado
<button className="bg-nebular-orange text-white hover:opacity-90">
  Call to Action
</button>
```

### Con CSS Variables

```css
.custom-element {
  background-color: var(--color-cosmic-blue);
  color: var(--color-lunar-white);
  border: 2px solid var(--color-sprout-green);
}
```

### En Estilos Inline (React)

```tsx
<div style={{ backgroundColor: 'var(--color-cosmic-blue)', color: '#fff' }}>
  Contenido
</div>
```

## 🔍 Ver Paleta Completa

Para ver la documentación visual completa de la paleta:

```tsx
import ColorPalette from '@/components/ColorPalette';

// En tu página o componente
<ColorPalette />
```

## 📍 Ubicación de Archivos

- **Configuración**: `app/globals.css` (líneas 14-21)
- **Componente de Documentación**: `components/ColorPalette.tsx`

## ⚙️ Características

✅ Integrada en Tailwind CSS  
✅ Disponible como CSS variables  
✅ No interfiere con configuraciones existentes  
✅ Componente visual interactivo con copia de códigos  
✅ Compatible con toda la aplicación  

## 💡 Recomendaciones de Uso

- **Primario (Azul Cósmico)**: Headers, navegación, elementos principales
- **Secundario (Rosa Flor de Cerezo)**: Highlights, badges, elementos decorativos
- **Verde Brote**: Estados de éxito, crecimiento, datos positivos
- **Naranja Nebular**: Botones de acción, alertas importantes, CTAs
- **Blanco Lunar**: Fondos de cards, modales, secciones claras
- **Gris Órbita**: Texto principal, títulos
- **Gris Luz Estelar**: Subtítulos, descripciones, texto secundario
