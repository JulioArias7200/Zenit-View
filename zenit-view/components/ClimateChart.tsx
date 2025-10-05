'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ClimateChartProps {
  data: Array<{
    date: string;
    temperatura?: number;
    tempMax?: number;
    tempMin?: number;
    precipitacion?: number;
    humedad?: number;
  }>;
  title?: string;
}

export default function ClimateChart({ data, title = 'Datos Climáticos' }: ClimateChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <p className="text-gray-600">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          
          {data[0]?.temperatura !== undefined && (
            <Line 
              type="monotone" 
              dataKey="temperatura" 
              stroke="#f59e0b" 
              name="Temperatura (°C)"
              strokeWidth={2}
            />
          )}
          
          {data[0]?.tempMax !== undefined && (
            <Line 
              type="monotone" 
              dataKey="tempMax" 
              stroke="#ef4444" 
              name="Temp. Máx (°C)"
              strokeWidth={1}
              strokeDasharray="5 5"
            />
          )}
          
          {data[0]?.tempMin !== undefined && (
            <Line 
              type="monotone" 
              dataKey="tempMin" 
              stroke="#3b82f6" 
              name="Temp. Mín (°C)"
              strokeWidth={1}
              strokeDasharray="5 5"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
