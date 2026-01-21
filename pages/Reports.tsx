import React, { useState, useMemo, useRef } from 'react';
import { DEMO_OPERATIONS, DEMO_CLIENTS, DNSH_CHECKLIST_TEMPLATES } from '../constants';
import { getAllMeasures } from '../constants/extendedMeasures';
import { FileText, Download, Printer, CheckCircle, AlertTriangle, XCircle, MapPin, FileCheck, FileX, Lightbulb, ChevronDown, ChevronUp, Building2, Briefcase, Layers, Sparkles, Edit3 } from 'lucide-react';
import { Operation, DnshObjective, AssetDnshEvaluation, EvidenceType, Client, Asset } from '../types';
import MapViewer from '../components/MapViewer';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { generateCompanyReport, generatePortfolioReport, generateAssetReport, ReportLevel, ReportSection } from '../services/reportingService';
import ReportingAIAssistant from '../components/ReportingAIAssistant';

const ReportsPage: React.FC = () => {
  // Report level selection
  const [reportLevel, setReportLevel] = useState<ReportLevel>(ReportLevel.PORTFOLIO);
  const [selectedClientId, setSelectedClientId] = useState<string>(DEMO_CLIENTS[0]?.id || '');
  const [selectedOpId, setSelectedOpId] = useState<string>(DEMO_OPERATIONS[0]?.id || '');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  
  // UI state
  const [expandedObjectives, setExpandedObjectives] = useState<Set<DnshObjective>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ReportSection | undefined>();
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Get selected entities - use data store for fresh data
  const { getClient, getOperation, getClientOperations } = require('../services/dataManagement');
  const [operations, setOperations] = React.useState(() => require('../services/dataManagement').getAllOperations());
  
  // Subscribe to data store changes
  React.useEffect(() => {
    const { dataStore } = require('../services/dataManagement');
    const unsubscribe = dataStore.subscribe(() => {
      setOperations(require('../services/dataManagement').getAllOperations());
    });
    return unsubscribe;
  }, []);
  
  const selectedClient = useMemo(() => 
    selectedClientId ? getClient(selectedClientId) : null,
    [selectedClientId]
  );
  const selectedOperation = useMemo(() => 
    selectedOpId ? getOperation(selectedOpId) : null,
    [selectedOpId, operations]
  );
  const selectedAsset = useMemo(() => 
    selectedAssetId && selectedOperation 
      ? selectedOperation.assets.find(a => a.id === selectedAssetId) 
      : null,
    [selectedAssetId, selectedOperation]
  );
  
  // Generate reports based on level
  const companyReport = useMemo(() => {
    if (reportLevel === ReportLevel.COMPANY && selectedClient) {
      const clientOperations = getClientOperations(selectedClient.id);
      return generateCompanyReport(selectedClient, clientOperations);
    }
    return null;
  }, [reportLevel, selectedClient, operations]);
  
  const portfolioReport = useMemo(() => {
    if (reportLevel === ReportLevel.PORTFOLIO && selectedOperation) {
      return generatePortfolioReport(selectedOperation);
    }
    return null;
  }, [reportLevel, selectedOperation]);
  
  const assetReport = useMemo(() => {
    if (reportLevel === ReportLevel.ASSET && selectedAsset && selectedOperation) {
      return generateAssetReport(selectedAsset, selectedOperation);
    }
    return null;
  }, [reportLevel, selectedAsset, selectedOperation]);
  
  // Get current report
  const currentReport = companyReport || portfolioReport || assetReport;
  
  // Handle section updates from AI assistant
  const handleSectionUpdate = (sectionId: string, content: string) => {
    if (companyReport) {
      const section = companyReport.sections.find(s => s.id === sectionId);
      if (section) {
        section.content = content;
        section.metadata = {
          ...section.metadata,
          lastModified: new Date().toISOString(),
          modifiedBy: 'AI Assistant'
        };
      }
    } else if (portfolioReport) {
      const section = portfolioReport.sections.find(s => s.id === sectionId);
      if (section) {
        section.content = content;
        section.metadata = {
          ...section.metadata,
          lastModified: new Date().toISOString(),
          modifiedBy: 'AI Assistant'
        };
      }
    } else if (assetReport) {
      const section = assetReport.sections.find(s => s.id === sectionId);
      if (section) {
        section.content = content;
        section.metadata = {
          ...section.metadata,
          lastModified: new Date().toISOString(),
          modifiedBy: 'AI Assistant'
        };
      }
    }
  };
  
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleObjective = (objective: DnshObjective) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(objective)) {
      newExpanded.delete(objective);
    } else {
      newExpanded.add(objective);
    }
    setExpandedObjectives(newExpanded);
  };

  // Calculate DNSH status per objective across all assets
  const getObjectiveStatus = (objective: DnshObjective): {
    status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
    compliantAssets: number;
    totalAssets: number;
    evidenceDocuments: any[];
    missingEvidence: string[];
    suggestedMeasures: any[];
  } => {
    if (!selectedOperation) {
      return {
        status: 'Not Assessed',
        compliantAssets: 0,
        totalAssets: 0,
        evidenceDocuments: [],
        missingEvidence: [],
        suggestedMeasures: []
      };
    }

    const totalAssets = selectedOperation.assets.length;
    let compliantAssets = 0;
    let hasNonCompliant = false;
    let hasConditional = false;
    const evidenceDocs: any[] = [];
    const missingEvidences: string[] = [];
    const suggestedMeasures: any[] = [];

    // Collect evidence documents for this objective
    selectedOperation.evidenceDocuments?.forEach(ev => {
      if (!ev.relatedObjective || ev.relatedObjective === objective) {
        evidenceDocs.push(ev);
      }
    });

    // Analyze each asset's evaluation
    selectedOperation.assets.forEach(asset => {
      const assetEvaluation = asset.dnshEvaluation;
      if (!assetEvaluation) {
        missingEvidences.push(`Evaluación DNSH pendiente para ${asset.name}`);
        return;
      }

      let assetStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' = 'Not Assessed';
      let assetEvidence: string[] = [];
      
      // Use centralized function to get status
      assetStatus = getObjectiveStatusFromAsset(assetEvaluation, objective);
      
      // Get evidence for this objective
      switch (objective) {
        case DnshObjective.MITIGATION:
          assetEvidence = assetEvaluation.mitigationEvidence || [];
          break;
        case DnshObjective.ADAPTATION:
          if (assetEvaluation.adaptationMeasures) {
            assetEvaluation.adaptationMeasures.forEach(measureId => {
              const measure = getAllMeasures().find(m => m.id === measureId);
              if (measure) suggestedMeasures.push({ ...measure, assetId: asset.id, assetName: asset.name });
            });
          }
          break;
        case DnshObjective.WATER:
          assetEvidence = assetEvaluation.waterEvidence || [];
          break;
        case DnshObjective.CIRCULAR:
          assetEvidence = assetEvaluation.circularEvidence || [];
          break;
        case DnshObjective.POLLUTION:
          assetEvidence = assetEvaluation.pollutionEvidence || [];
          break;
        case DnshObjective.BIODIVERSITY:
          assetEvidence = assetEvaluation.biodiversityEvidence || [];
          break;
      }

      if (assetStatus === 'Compliant') {
        compliantAssets++;
      } else if (assetStatus === 'Non-Compliant') {
        hasNonCompliant = true;
        // Suggest measures based on objective
        if (objective === DnshObjective.ADAPTATION) {
          suggestedMeasures.push(...getAllMeasures().slice(0, 3).map(m => ({ ...m, assetId: asset.id, assetName: asset.name })));
        }
      } else if (assetStatus === 'Conditional') {
        hasConditional = true;
      }

      // Check for missing evidence
      const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective);
      if (template && assetStatus !== 'Compliant' && assetStatus !== 'Not Assessed') {
        if (assetEvidence.length === 0) {
          missingEvidences.push(`Evidencia requerida para ${asset.name}: ${template.questions[0]?.guidance || 'Documentación de apoyo'}`);
        }
      }
    });

    // Determine overall status
    let overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
    if (compliantAssets === totalAssets && totalAssets > 0) {
      overallStatus = 'Compliant';
    } else if (hasNonCompliant) {
      overallStatus = 'Non-Compliant';
    } else if (hasConditional) {
      overallStatus = 'Conditional';
    } else {
      overallStatus = 'Not Assessed';
    }

    // Add general missing evidence suggestions
    if (overallStatus !== 'Compliant') {
      const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective);
      if (template) {
        template.questions.forEach(q => {
          const hasEvidence = evidenceDocs.some(ev => 
            ev.name.toLowerCase().includes(q.text.toLowerCase().substring(0, 20)) ||
            ev.description?.toLowerCase().includes(q.text.toLowerCase().substring(0, 20))
          );
          if (!hasEvidence && overallStatus !== 'Compliant') {
            missingEvidences.push(`Documentación requerida: ${q.text}`);
          }
        });
      }
    }

    return {
      status: overallStatus,
      compliantAssets,
      totalAssets,
      evidenceDocuments: evidenceDocs,
      missingEvidence: Array.from(new Set(missingEvidences)),
      suggestedMeasures: Array.from(new Set(suggestedMeasures.map(m => m.id))).map(id => suggestedMeasures.find(m => m.id === id)).filter(Boolean)
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Compliant':
        return <CheckCircle size={20} className="text-emerald-500" />;
      case 'Non-Compliant':
        return <XCircle size={20} className="text-red-500" />;
      case 'Conditional':
        return <AlertTriangle size={20} className="text-amber-500" />;
      default:
        return <FileText size={20} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'Non-Compliant':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'Conditional':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-600';
    }
  };

  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: '1. Mitigación Cambio Climático',
    [DnshObjective.ADAPTATION]: '2. Adaptación Cambio Climático',
    [DnshObjective.WATER]: '3. Uso Sostenible del Agua',
    [DnshObjective.CIRCULAR]: '4. Economía Circular',
    [DnshObjective.POLLUTION]: '5. Prevención de la Contaminación',
    [DnshObjective.BIODIVERSITY]: '6. Biodiversidad y Ecosistemas'
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsGeneratingPDF(true);
    
    try {
      // Expand all sections for PDF generation
      if (currentReport) {
        const allSectionIds = new Set(currentReport.sections.map(s => s.id));
        setExpandedSections(allSectionIds);
      }
      
      // Wait a bit for DOM to update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Try dynamic import for html2canvas and jspdf
      // Using Function constructor to prevent Vite from analyzing these imports statically
      let html2canvas: any;
      let jsPDF: any;
      let pdfGenerationAvailable = false;
      
      try {
        // Use Function constructor to create dynamic imports that Vite won't analyze
        const dynamicImport = (moduleName: string) => {
          return new Function('return import("' + moduleName + '")')();
        };
        
        const html2canvasModule = await dynamicImport('html2canvas').catch(() => null);
        const jspdfModule = await dynamicImport('jspdf').catch(() => null);
        
        if (html2canvasModule && jspdfModule) {
          html2canvas = html2canvasModule.default;
          jsPDF = jspdfModule.jsPDF;
          pdfGenerationAvailable = true;
        }
      } catch (importError) {
        console.warn('PDF libraries not available, using print dialog');
        pdfGenerationAvailable = false;
      }
      
      if (pdfGenerationAvailable && html2canvas && jsPDF) {
        // Generate PDF using html2canvas and jspdf
        const canvas = await html2canvas(reportRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: reportRef.current.scrollWidth,
          windowHeight: reportRef.current.scrollHeight,
        });
        
        const imgData = canvas.toDataURL('image/png', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgScaledWidth = imgWidth * ratio;
        const imgScaledHeight = imgHeight * ratio;
        
        // Calculate how many pages we need
        const pageHeight = pdfHeight;
        let heightLeft = imgScaledHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgScaledWidth, imgScaledHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgScaledHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgScaledWidth, imgScaledHeight);
          heightLeft -= pageHeight;
        }
        
        const reportName = reportLevel === ReportLevel.COMPANY && companyReport 
          ? companyReport.clientName 
          : reportLevel === ReportLevel.PORTFOLIO && portfolioReport 
          ? portfolioReport.operationName 
          : reportLevel === ReportLevel.ASSET && assetReport 
          ? assetReport.assetName 
          : 'Report';
        const fileName = `TDD_${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
      } else {
        // Fallback: Use browser print dialog (user can save as PDF)
        window.print();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to print dialog
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm print:hidden">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-slate-900">Generador de Reportes DNSH</h2>
          <div className="h-6 w-px bg-slate-300 mx-2"></div>
          
          {/* Level Selection */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 font-medium">Nivel:</span>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setReportLevel(ReportLevel.COMPANY)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-1 ${
                  reportLevel === ReportLevel.COMPANY
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 size={16} />
                <span>Compañía</span>
              </button>
              <button
                onClick={() => setReportLevel(ReportLevel.PORTFOLIO)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-1 ${
                  reportLevel === ReportLevel.PORTFOLIO
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase size={16} />
                <span>Portfolio</span>
              </button>
              <button
                onClick={() => setReportLevel(ReportLevel.ASSET)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-1 ${
                  reportLevel === ReportLevel.ASSET
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers size={16} />
                <span>Asset</span>
              </button>
            </div>
          </div>
          
          {/* Entity Selection */}
          <div className="h-6 w-px bg-slate-300 mx-2"></div>
          {reportLevel === ReportLevel.COMPANY && (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block px-3 py-2 min-w-[200px] shadow-sm"
            >
              {DEMO_CLIENTS.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          )}
          {reportLevel === ReportLevel.PORTFOLIO && (
            <select
              value={selectedOpId}
              onChange={(e) => setSelectedOpId(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block px-3 py-2 min-w-[280px] shadow-sm"
            >
              {DEMO_OPERATIONS.map(op => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          )}
          {reportLevel === ReportLevel.ASSET && (
            <>
              <select
                value={selectedOpId}
                onChange={(e) => {
                  setSelectedOpId(e.target.value);
                  setSelectedAssetId('');
                }}
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block px-3 py-2 min-w-[200px] shadow-sm"
              >
                {DEMO_OPERATIONS.map(op => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
              {selectedOperation && (
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block px-3 py-2 min-w-[200px] shadow-sm ml-2"
                >
                  <option value="">Seleccionar Asset</option>
                  {selectedOperation.assets.map(asset => (
                    <option key={asset.id} value={asset.id}>{asset.name}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Sparkles size={16} className="text-emerald-600" />
            <span>IA Gen Activo</span>
          </div>
          <div className="h-6 w-px bg-slate-300 mx-2"></div>
          <button 
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium"
          >
            <Printer size={18} className="mr-2" />
            Imprimir
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generando...
              </>
            ) : (
              <>
                <Download size={18} className="mr-2" />
                Descargar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Preview Canvas */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-50">
        {currentReport && (
          <div ref={reportRef} className="bg-white w-full max-w-[210mm] shadow-xl p-12 text-slate-900 mb-8 print:shadow-none print:max-w-full print:p-8">
            {/* Watermark/Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Technical Due Diligence</h1>
                <p className="text-emerald-600 font-semibold text-lg mt-1">Evaluación DNSH & Riesgos Climáticos</p>
                <p className="text-sm text-slate-500 mt-2">
                  {reportLevel === ReportLevel.COMPANY && companyReport && `Nivel: Compañía - ${companyReport.clientName}`}
                  {reportLevel === ReportLevel.PORTFOLIO && portfolioReport && `Nivel: Portfolio - ${portfolioReport.operationName}`}
                  {reportLevel === ReportLevel.ASSET && assetReport && `Nivel: Asset - ${assetReport.assetName}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 text-lg">EcoInvest</p>
                <p className="text-sm text-slate-500">Ref: {currentReport.reportDate.split('T')[0]}</p>
                <p className="text-sm text-slate-500">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              </div>
            </div>
            
            {/* Report Sections */}
            <div className="space-y-6">
              {currentReport.sections.map((section, idx) => {
                const isExpanded = expandedSections.has(section.id);
                return (
                  <section key={section.id} className="break-inside-avoid">
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm print:shadow-none">
                      {/* Section Header */}
                      <div
                        className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between print:cursor-default bg-white border-b border-slate-200`}
                        onClick={() => toggleSection(section.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-bold text-slate-500">{idx + 1}.</span>
                          <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
                          {section.metadata?.aiGenerated && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center space-x-1">
                              <Sparkles size={12} />
                              <span>IA Gen</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSection(section);
                            }}
                            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 px-2 py-1 hover:bg-emerald-50 rounded"
                            title="Editar con IA"
                          >
                            <Edit3 size={14} />
                            <span>Editar</span>
                          </button>
                          <span className="print:hidden">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </span>
                        </div>
                      </div>
                      
                      {/* Section Content */}
                      {isExpanded && (
                        <div className="p-6 bg-white">
                          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                            {section.content.split('\n').map((line, lineIdx) => {
                              if (line.startsWith('# ')) {
                                return <h1 key={lineIdx} className="text-2xl font-bold mb-4">{line.substring(2)}</h1>;
                              } else if (line.startsWith('## ')) {
                                return <h2 key={lineIdx} className="text-xl font-bold mt-6 mb-3">{line.substring(3)}</h2>;
                              } else if (line.startsWith('### ')) {
                                return <h3 key={lineIdx} className="text-lg font-semibold mt-4 mb-2">{line.substring(4)}</h3>;
                              } else if (line.startsWith('- ')) {
                                return <li key={lineIdx} className="ml-4 mb-1">{line.substring(2)}</li>;
                              } else if (line.startsWith('**') && line.endsWith('**')) {
                                return <p key={lineIdx} className="font-semibold mb-2">{line.replace(/\*\*/g, '')}</p>;
                              } else if (line.trim() === '') {
                                return <br key={lineIdx} />;
                              } else {
                                return <p key={lineIdx} className="mb-2">{line}</p>;
                              }
                            })}
                          </div>
                          {section.metadata?.lastModified && (
                            <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
                              Última modificación: {new Date(section.metadata.lastModified).toLocaleString('es-ES')}
                              {section.metadata.modifiedBy && ` por ${section.metadata.modifiedBy}`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
              
              {/* Additional Legacy Sections for Portfolio Level */}
              {reportLevel === ReportLevel.PORTFOLIO && selectedOperation && (
                <>
                  {/* Asset Exposure Table */}
                  <section className="break-inside-avoid">
                    <h2 className="text-sm font-bold uppercase text-slate-500 border-b border-slate-200 pb-1 mb-4">Análisis de Exposición de Activos</h2>
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="py-3 px-4 text-left font-semibold border-b border-slate-300">Activo</th>
                          <th className="py-3 px-4 text-left font-semibold border-b border-slate-300">Tipo</th>
                          <th className="py-3 px-4 text-right font-semibold border-b border-slate-300">Valor (€)</th>
                          <th className="py-3 px-4 text-center font-semibold border-b border-slate-300">Estado DNSH</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedOperation.assets.map(asset => (
                          <tr key={asset.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => {
                            setReportLevel(ReportLevel.ASSET);
                            setSelectedOpId(asset.operationId);
                            setSelectedAssetId(asset.id);
                          }}>
                            <td className="py-3 px-4 font-medium text-slate-900">{asset.name}</td>
                            <td className="py-3 px-4 text-slate-600">{asset.assetType}</td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-900">{(asset.exposedValue/1000000).toFixed(1)}M</td>
                            <td className="py-3 px-4 text-center">
                              {asset.dnshEvaluation ? (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                  asset.dnshEvaluation.overallStatus === 'Compliant' ? 'bg-emerald-100 text-emerald-700' :
                                  asset.dnshEvaluation.overallStatus === 'Non-Compliant' ? 'bg-red-100 text-red-700' :
                                  asset.dnshEvaluation.overallStatus === 'Conditional' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {asset.dnshEvaluation.overallStatus}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">No evaluado</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                  
                  {/* Map Section */}
                  <section className="break-inside-avoid">
                    <h2 className="text-sm font-bold uppercase text-slate-500 border-b border-slate-200 pb-1 mb-4">Ubicación Geográfica de Activos</h2>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="h-[250px] rounded-lg overflow-hidden border border-slate-300 relative">
                        <MapViewer 
                          assets={selectedOperation.assets}
                          activeLayers={[]}
                          theme="light"
                          showControls={true}
                        />
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
            
            {/* Footer */}
            <div className="mt-8 pt-6 border-t-2 border-slate-300 text-xs text-slate-500 text-center print:mt-6">
              <p className="font-medium mb-1">Este documento ha sido generado automáticamente por la plataforma EcoInvest DNSH.</p>
              <p className="text-slate-400">La información contenida es confidencial y está sujeta a las políticas de privacidad de EcoInvest.</p>
            </div>
          </div>
        )}
        
        {!currentReport && (
          <div className="bg-white rounded-lg p-12 text-center shadow-lg">
            <FileText size={64} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Selecciona un nivel y entidad para generar el reporte</h3>
            <p className="text-slate-500">Usa los controles superiores para seleccionar Compañía, Portfolio o Asset</p>
          </div>
        )}
      </div>
      
      {/* AI Assistant */}
      <ReportingAIAssistant
        currentSection={selectedSection}
        sections={currentReport?.sections || []}
        onSectionUpdate={handleSectionUpdate}
        context={{
          level: reportLevel,
          client: selectedClient || undefined,
          operation: selectedOperation || undefined,
          asset: selectedAsset || undefined,
          evidenceDocuments: selectedOperation?.evidenceDocuments || [],
          metrics: currentReport ? (companyReport?.metrics || portfolioReport?.metrics || assetReport?.metrics) : undefined
        }}
      />
    </div>
  );
};

export default ReportsPage;
