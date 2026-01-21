/**
 * Climate Data Panel Component
 * 
 * Displays integrated climate data from multiple sources (CORDEX, WRI Aqueduct)
 * with data quality indicators and source attribution
 */

import React from 'react';
import { IntegratedClimateData } from '../services/climateDataIntegration';
import { getWaterRiskIndicators } from '../services/climateDataIntegration';
import { Asset } from '../types';
import { CheckCircle, AlertTriangle, Info, Database, Globe } from 'lucide-react';

interface Props {
  integratedData: IntegratedClimateData;
  asset: Asset;
}

const ClimateDataPanel: React.FC<Props> = ({ integratedData, asset }) => {
  const waterRiskIndicators = getWaterRiskIndicators(integratedData, asset);

  const getQualityColor = (quality: 'high' | 'medium' | 'low' | 'unavailable') => {
    switch (quality) {
      case 'high':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-slate-400 bg-slate-50 border-slate-200';
    }
  };

  const getQualityIcon = (quality: 'high' | 'medium' | 'low' | 'unavailable') => {
    if (quality === 'high') {
      return <CheckCircle size={14} className="text-emerald-600" />;
    } else if (quality === 'unavailable') {
      return <AlertTriangle size={14} className="text-slate-400" />;
    }
    return <Info size={14} className="text-amber-600" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center">
          <Database size={20} className="mr-2 text-blue-600" />
          Datos Climáticos Integrados
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center space-x-1 ${getQualityColor(integratedData.dataQuality.overall)}`}>
          {getQualityIcon(integratedData.dataQuality.overall)}
          <span>Calidad: {integratedData.dataQuality.overall}</span>
        </div>
      </div>

      {/* Data Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* CORDEX Data */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center">
              <Globe size={14} className="mr-1.5" />
              CORDEX
            </h4>
            <div className={`px-2 py-0.5 rounded text-xs font-medium border flex items-center space-x-1 ${getQualityColor(integratedData.dataQuality.cordex)}`}>
              {getQualityIcon(integratedData.dataQuality.cordex)}
              <span>{integratedData.dataQuality.cordex}</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-2">
            Proyecciones climáticas regionales de alta resolución (CORDEX-EUR-11)
          </p>
          <div className="text-xs text-slate-500">
            <p>Proyecciones disponibles: {Object.keys(integratedData.cordexProjections).length} hazards</p>
            <p>Resolución: 0.11° (~12km)</p>
          </div>
        </div>

        {/* WRI Aqueduct Data */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center">
              <Globe size={14} className="mr-1.5" />
              WRI Aqueduct
            </h4>
            <div className={`px-2 py-0.5 rounded text-xs font-medium border flex items-center space-x-1 ${getQualityColor(integratedData.dataQuality.aqueduct)}`}>
              {getQualityIcon(integratedData.dataQuality.aqueduct)}
              <span>{integratedData.dataQuality.aqueduct}</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-2">
            Atlas de riesgo hídrico global (WRI Aqueduct 3.0)
          </p>
          {integratedData.aqueductData && (
            <div className="text-xs text-slate-500">
              <p>Cuenca: {integratedData.aqueductData.basin || 'N/A'}</p>
              <p>Indicadores: {integratedData.aqueductData.indicators.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Water Risk Indicators */}
      {waterRiskIndicators.indicators.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Indicadores de Riesgo Hídrico</h4>
          <div className="space-y-2">
            {waterRiskIndicators.indicators.map((indicator, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  indicator.relevance === 'high'
                    ? 'bg-red-50 border-red-200'
                    : indicator.relevance === 'medium'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900">{indicator.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    indicator.level === 'Very High' ? 'bg-red-100 text-red-700' :
                    indicator.level === 'High' ? 'bg-orange-100 text-orange-700' :
                    indicator.level === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {indicator.level}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Valor: {indicator.value.toFixed(2)}</span>
                  {indicator.relevance === 'high' && (
                    <span className="text-red-600 font-semibold">Alta relevancia</span>
                  )}
                </div>
                {indicator.impact && (
                  <p className="text-xs text-slate-600 mt-1 italic">{indicator.impact}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-900">Riesgo Hídrico General</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                waterRiskIndicators.overallRisk === 'Very High' ? 'bg-red-100 text-red-800' :
                waterRiskIndicators.overallRisk === 'High' ? 'bg-orange-100 text-orange-800' :
                waterRiskIndicators.overallRisk === 'Medium' ? 'bg-amber-100 text-amber-800' :
                'bg-emerald-100 text-emerald-800'
              }`}>
                {waterRiskIndicators.overallRisk}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Última actualización: {new Date(integratedData.lastUpdated).toLocaleString('es-ES')}
        </p>
      </div>
    </div>
  );
};

export default ClimateDataPanel;
