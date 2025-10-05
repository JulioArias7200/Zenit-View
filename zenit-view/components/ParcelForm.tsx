'use client';

import { useState } from 'react';
import { useParcelStore } from '@/lib/stores/parcelStore';

export default function ParcelForm() {
  const addParcel = useParcelStore((state) => state.addParcel);
  
  const [formData, setFormData] = useState({
    name: '',
    cropType: '',
    plantingDate: '',
    areaHectares: '',
    latitude: '',
    longitude: '',
    description: '',
  });

  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Crear polígono simple alrededor del punto central
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    const offset = 0.01; // ~1km

    const coordinates = [
      [lng - offset, lat - offset],
      [lng + offset, lat - offset],
      [lng + offset, lat + offset],
      [lng - offset, lat + offset],
      [lng - offset, lat - offset], // Cerrar el polígono
    ];

    addParcel({
      name: formData.name,
      cropType: formData.cropType,
      plantingDate: formData.plantingDate,
      areaHectares: parseFloat(formData.areaHectares),
      latitude: lat,
      longitude: lng,
      coordinates: coordinates,
      description: formData.description,
    });

    // Reset form
    setFormData({
      name: '',
      cropType: '',
      plantingDate: '',
      areaHectares: '',
      latitude: '',
      longitude: '',
      description: '',
    });
    
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-nebular-orange text-white py-3 px-4 rounded-lg hover:opacity-90 transition-all font-medium flex items-center justify-center gap-2 shadow-md"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Nueva Parcela
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-orbit-gray">Nueva Parcela</h3>
        <button
          onClick={() => setShowForm(false)}
          className="text-starlight-gray hover:text-orbit-gray"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-orbit-gray mb-1">
              Nombre de la Parcela *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
              placeholder="Ej: Parcela Norte"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orbit-gray mb-1">
              Tipo de Cultivo *
            </label>
            <select
              required
              value={formData.cropType}
              onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
            >
              <option value="">Seleccionar...</option>
              <option value="Maíz">🌽 Maíz</option>
              <option value="Trigo">🌾 Trigo</option>
              <option value="Arroz">🌾 Arroz</option>
              <option value="Soja">🌱 Soja</option>
              <option value="Quinua">🌾 Quinua</option>
              <option value="Papa">🥔 Papa</option>
              <option value="Tomate">🍅 Tomate</option>
              <option value="Café">☕ Café</option>
              <option value="Otro">🌿 Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-orbit-gray mb-1">
              Fecha de Siembra *
            </label>
            <input
              type="date"
              required
              value={formData.plantingDate}
              onChange={(e) => setFormData({ ...formData, plantingDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orbit-gray mb-1">
              Área (hectáreas) *
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={formData.areaHectares}
              onChange={(e) => setFormData({ ...formData, areaHectares: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
              placeholder="Ej: 10.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orbit-gray mb-1">
              Latitud *
            </label>
            <input
              type="number"
              required
              step="0.0001"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
              placeholder="Ej: -16.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orbit-gray mb-1">
              Longitud *
            </label>
            <input
              type="number"
              required
              step="0.0001"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
              placeholder="Ej: -68.15"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-orbit-gray mb-1">
            Descripción (opcional)
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
            placeholder="Información adicional sobre la parcela..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-nebular-orange text-white py-2 px-4 rounded-md hover:opacity-90 transition-all font-medium shadow-md"
          >
            Guardar Parcela
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
