'use client';

import React from 'react';
import { Copy, Check } from 'lucide-react';

interface ColorInfo {
  role: string;
  name: string;
  hex: string;
  description: string;
  tailwindClass: string;
}

const colors: ColorInfo[] = [
  {
    role: 'Primario',
    name: 'Azul Cósmico',
    hex: '#0B3D91',
    description: 'Azul profundo inspirado en la NASA, da confianza y estabilidad.',
    tailwindClass: 'cosmic-blue'
  },
  {
    role: 'Secundario',
    name: 'Rosa Flor de Cerezo',
    hex: '#FF82A9',
    description: 'Toque floral y humano, representa creatividad y vida.',
    tailwindClass: 'cherry-blossom'
  },
  {
    role: 'Acento 1',
    name: 'Verde Brote',
    hex: '#A4DE02',
    description: 'Energía de crecimiento, simboliza innovación y naturaleza.',
    tailwindClass: 'sprout-green'
  },
  {
    role: 'Acento 2',
    name: 'Naranja Nebular',
    hex: '#FFB347',
    description: 'Vitalidad, ideal para botones o llamadas a la acción.',
    tailwindClass: 'nebular-orange'
  },
  {
    role: 'Fondo',
    name: 'Blanco Lunar',
    hex: '#F5F6FA',
    description: 'Fondo claro, limpio y neutral.',
    tailwindClass: 'lunar-white'
  },
  {
    role: 'Texto principal',
    name: 'Gris Órbita',
    hex: '#2E2E2E',
    description: 'Legible y sobrio sobre fondos claros.',
    tailwindClass: 'orbit-gray'
  },
  {
    role: 'Texto secundario',
    name: 'Gris Luz Estelar',
    hex: '#6F6F6F',
    description: 'Para subtítulos o descripciones.',
    tailwindClass: 'starlight-gray'
  }
];

const ColorCard: React.FC<{ color: ColorInfo }> = ({ color }) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div 
        className="h-32 w-full" 
        style={{ backgroundColor: color.hex }}
      />
      <div className="p-4 bg-white">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {color.role}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">
              {color.name}
            </h3>
          </div>
          <button
            onClick={() => copyToClipboard(color.hex)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Copiar código HEX"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">HEX:</span>
            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
              {color.hex}
            </code>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Tailwind:</span>
            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
              {color.tailwindClass}
            </code>
          </div>
          
          <p className="text-gray-600 text-xs mt-3 leading-relaxed">
            {color.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function ColorPalette() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Paleta de Colores Zenit View
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Sistema de colores inspirado en el espacio y la naturaleza, 
            diseñado para transmitir confianza, innovación y vitalidad.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {colors.map((color) => (
            <ColorCard key={color.hex} color={color} />
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Uso en el Proyecto
          </h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold mb-2">Con Tailwind CSS:</h3>
              <div className="bg-gray-100 p-4 rounded font-mono text-sm space-y-1">
                <div><span className="text-blue-600">{'<div'}</span> className=<span className="text-green-600">"bg-cosmic-blue text-white"</span>{'>'}</div>
                <div><span className="text-blue-600">{'<button'}</span> className=<span className="text-green-600">"bg-nebular-orange hover:opacity-90"</span>{'>'}</div>
                <div><span className="text-blue-600">{'<p'}</span> className=<span className="text-green-600">"text-orbit-gray"</span>{'>'}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Con CSS Variables:</h3>
              <div className="bg-gray-100 p-4 rounded font-mono text-sm space-y-1">
                <div>background-color: <span className="text-purple-600">var(--color-cosmic-blue)</span>;</div>
                <div>color: <span className="text-purple-600">var(--color-orbit-gray)</span>;</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
