/**
 * Adaptation Decision Tree Component
 * 
 * Visualizes the "Árbol de Oportunidades y Soluciones" (Tree of Opportunities and Solutions)
 * for adaptation planning, aligned with Equator Principles EP4
 */

import React, { useState } from 'react';
import { DecisionNode, AdaptationDecisionTree } from '../services/adaptationDecisionTree';
import { EPAdaptationPathwayType, EP4_TERMINOLOGY } from '../constants/equatorPrinciples';
import { ChevronRight, ChevronDown, AlertCircle, CheckCircle, DollarSign, Clock, Target } from 'lucide-react';

interface Props {
  tree: AdaptationDecisionTree;
  onPathwaySelect?: (pathwayType: EPAdaptationPathwayType) => void;
  selectedPathway?: EPAdaptationPathwayType;
}

const AdaptationDecisionTreeComponent: React.FC<Props> = ({ tree, onPathwaySelect, selectedPathway }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([tree.rootProblem.id]));

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderNode = (node: DecisionNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="mb-2">
        <div
          className={`flex items-start space-x-2 p-3 rounded-lg border transition-colors ${
            node.type === 'problem'
              ? 'bg-red-50 border-red-200'
              : node.type === 'cause'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
          } ${level === 0 ? 'font-semibold' : ''}`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.id)}
              className="mt-0.5 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-slate-600" />
              ) : (
                <ChevronRight size={16} className="text-slate-600" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              {node.type === 'problem' && <AlertCircle size={16} className="text-red-600 flex-shrink-0" />}
              {node.type === 'cause' && <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />}
              {node.type === 'solution' && <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />}
              <span className={`text-sm ${level === 0 ? 'font-bold' : 'font-medium'} text-slate-900`}>
                {node.label}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-2">{node.description}</p>

            {/* Criteria display for solutions */}
            {node.type === 'solution' && node.criteria && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {node.criteria.costRange && (
                  <div className="flex items-center space-x-1 text-xs text-slate-600">
                    <DollarSign size={12} />
                    <span>
                      €{node.criteria.costRange.min.toLocaleString()} - €{node.criteria.costRange.max.toLocaleString()}
                    </span>
                  </div>
                )}
                {node.criteria.effectiveness !== undefined && (
                  <div className="flex items-center space-x-1 text-xs text-slate-600">
                    <Target size={12} />
                    <span>{node.criteria.effectiveness}% efectividad</span>
                  </div>
                )}
                {node.criteria.implementationTime && (
                  <div className="flex items-center space-x-1 text-xs text-slate-600">
                    <Clock size={12} />
                    <span>
                      {node.criteria.implementationTime === 'short' ? 'Corto plazo' :
                       node.criteria.implementationTime === 'medium' ? 'Medio plazo' : 'Largo plazo'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-2">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          Árbol de Oportunidades y Soluciones
        </h3>
        <p className="text-sm text-slate-600">
          Visualización estructurada de problemas, causas raíz y soluciones de adaptación para{' '}
          <strong>{tree.hazardName}</strong>
        </p>
      </div>

      {/* Root Problem */}
      <div className="mb-6">
        {renderNode(tree.rootProblem)}
      </div>

      {/* Adaptation Pathways */}
      <div className="mt-8 border-t border-slate-200 pt-6">
        <h4 className="text-sm font-bold text-slate-700 uppercase mb-4">
          {EP4_TERMINOLOGY['Adaptation Pathway']}s Disponibles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tree.pathways.map(pathway => {
            const isSelected = selectedPathway === pathway.type;
            return (
              <div
                key={pathway.type}
                onClick={() => onPathwaySelect?.(pathway.type)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-slate-900">
                    {pathway.type === 'Avoid' ? 'Evitar' :
                     pathway.type === 'Reduce' ? 'Reducir' :
                     pathway.type === 'Transfer' ? 'Transferir' :
                     'Aceptar'}
                  </h5>
                  {isSelected && (
                    <CheckCircle size={20} className="text-blue-600" />
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Efectividad:</span>
                    <span className="font-semibold text-slate-900">{pathway.effectiveness}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Costo estimado:</span>
                    <span className="font-semibold text-slate-900">
                      €{pathway.cost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Riesgo residual:</span>
                    <span className={`font-semibold ${
                      pathway.residualRisk.level === 'Low' ? 'text-emerald-600' :
                      pathway.residualRisk.level === 'Medium' ? 'text-amber-600' :
                      pathway.residualRisk.level === 'High' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {pathway.residualRisk.level}
                    </span>
                  </div>
                </div>

                {pathway.measures.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">Medidas incluidas:</p>
                    <div className="flex flex-wrap gap-1">
                      {pathway.measures.slice(0, 3).map(measure => (
                        <span
                          key={measure.id}
                          className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                        >
                          {measure.name}
                        </span>
                      ))}
                      {pathway.measures.length > 3 && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                          +{pathway.measures.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdaptationDecisionTreeComponent;
