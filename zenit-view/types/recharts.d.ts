declare module 'recharts' {
  import * as React from 'react';

  export interface LineChartProps {
    data?: any[];
    width?: number;
    height?: number;
    children?: React.ReactNode;
  }

  export interface LineProps {
    type?: string;
    dataKey?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    name?: string;
  }

  export const LineChart: React.FC<LineChartProps>;
  export const Line: React.FC<LineProps>;
  export const XAxis: React.FC<any>;
  export const YAxis: React.FC<any>;
  export const CartesianGrid: React.FC<any>;
  export const Tooltip: React.FC<any>;
  export const Legend: React.FC<any>;
  export const ResponsiveContainer: React.FC<any>;
}
