
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from 'recharts';
import { SkillType } from '../types';

interface SkillRadarProps {
  skills: Record<SkillType, number>;
  t?: (key: string) => string;
}

export const SkillRadar: React.FC<SkillRadarProps> = ({ skills, t }) => {
  const data = Object.entries(skills).map(([key, value]) => ({
    subject: t ? t(`skill.${key.toUpperCase()}`) : key,
    originalSubject: key,
    A: value,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-64 relative flex items-center justify-center">
      {/* Cyberpunk Grid Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(196,95,255,0.1)_0%,transparent_70%)] pointer-events-none"></div>
      
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#333" strokeDasharray="4 4" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#00FFFF', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Skills"
            dataKey="A"
            stroke="#C45FFF"
            strokeWidth={3}
            fill="#C45FFF"
            fillOpacity={0.4}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
      
      {/* Center Glow */}
      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_15px_#fff] transform -translate-x-1/2 -translate-y-1/2"></div>
    </div>
  );
};
