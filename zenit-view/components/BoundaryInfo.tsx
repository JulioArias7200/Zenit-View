'use client';

import { Boundary } from '@/lib/stores/parcelStore';

interface BoundaryInfoProps {
  boundaries?: Boundary[];
  identifier?: string;
  surfaceM2?: number;
  parcelType?: string;
}

export default function BoundaryInfo({ 
  boundaries, 
  identifier, 
  surfaceM2,
  parcelType 
}: BoundaryInfoProps) {
  if (!boundaries || boundaries.length === 0) {
    return null;
  }

  const typeLabels = {
    residential: 'Residencial',
    agricultural: 'Agrícola',
    urban: 'Urbano',
    commercial: 'Comercial'
  };

  const getBoundaryIcon = (material?: string) => {
    if (!material) return '📏';
    const lower = material.toLowerCase();
    if (lower.includes('muro') || lower.includes('concreto')) return '🧱';
    if (lower.includes('cerca') || lower.includes('alambre')) return '🪵';
    if (lower.includes('piedra')) return '🪨';
    if (lower.includes('arroyo') || lower.includes('natural')) return '🌊';
    if (lower.includes('jardinera')) return '🌿';
    return '📏';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="border-b pb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span className="text-2xl">🗺️</span>
          Información Catastral y Linderos
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {identifier && (
            <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
              <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Identificador</p>
              <p className="text-sm font-bold text-blue-900">{identifier}</p>
            </div>
          )}
          
          {parcelType && (
            <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
              <p className="text-xs text-green-600 font-semibold uppercase mb-1">Tipo de Terreno</p>
              <p className="text-sm font-bold text-green-900">
                {typeLabels[parcelType as keyof typeof typeLabels] || parcelType}
              </p>
            </div>
          )}
          
          {surfaceM2 && (
            <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
              <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Superficie m²</p>
              <p className="text-sm font-bold text-purple-900">{surfaceM2.toLocaleString()} m²</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span>📐</span>
          Linderos y Colindancias
        </h4>
        
        <div className="space-y-3">
          {boundaries.map((boundary, index) => (
            <div 
              key={index}
              className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getBoundaryIcon(boundary.material)}</span>
                  <span className="font-bold text-gray-800 text-lg">{boundary.side}</span>
                </div>
                {boundary.length && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {boundary.length} m
                  </span>
                )}
              </div>
              
              <p className="text-gray-700 mb-2 text-sm">{boundary.description}</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {boundary.neighbor && (
                  <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-300 text-xs">
                    <span>🏘️</span>
                    <span className="font-medium text-gray-700">{boundary.neighbor}</span>
                  </div>
                )}
                
                {boundary.neighborId && (
                  <div className="flex items-center gap-1 bg-gray-200 px-3 py-1 rounded-full text-xs">
                    <span>🆔</span>
                    <span className="font-mono text-gray-600">{boundary.neighborId}</span>
                  </div>
                )}
                
                {boundary.material && (
                  <div className="flex items-center gap-1 bg-orange-100 px-3 py-1 rounded-full border border-orange-300 text-xs">
                    <span>🔨</span>
                    <span className="text-orange-700">{boundary.material}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-200 mt-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-semibold text-amber-900 mb-1">Información Legal</p>
            <p className="text-sm text-amber-800">
              Los linderos y colindancias aquí descritos corresponden a la información catastral registrada. 
              Para verificación oficial, consulte el registro público de la propiedad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
