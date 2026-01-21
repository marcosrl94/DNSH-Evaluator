import React, { useState, useMemo, useRef } from 'react';
import { DEMO_OPERATIONS, DEMO_CLIENTS, DNSH_CHECKLIST_TEMPLATES } from '../constants';
import { getAllMeasures } from '../constants/extendedMeasures';
import { FileText, Download, Printer, CheckCircle, AlertTriangle, XCircle, MapPin, FileCheck, FileX, Lightbulb, ChevronDown, ChevronUp, Building2, Briefcase, Layers, Sparkles, Edit3 } from 'lucide-react';
import { Operation, DnshObjective, AssetDnshEvaluation, EvidenceType, Client, Asset } from '../types';
import MapViewer from '../components/MapViewer';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { generateCompanyReport, generatePortfolioReport, generateAssetReport, ReportLevel, ReportSection } from '../services/reportingService';
import ReportingAIAssistant from '../components/ReportingAIAssistant';
import { logger } from '../utils/logger';
import { getAllOperations, dataStore, getClient, getOperation, getClientOperations } from '../services/dataManagement';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

const ReportsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  
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
  const [operations, setOperations] = React.useState(() => getAllOperations());
  
  // Subscribe to data store changes
  React.useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      setOperations(getAllOperations());
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
        return <CheckCircle size={20} className={theme === 'dark' ? 'text-[#00ff88]' : 'text-emerald-600'} />;
      case 'Non-Compliant':
        return <XCircle size={20} className={theme === 'dark' ? 'text-red-400' : 'text-red-600'} />;
      case 'Conditional':
        return <AlertTriangle size={20} className={theme === 'dark' ? 'text-[#ffb800]' : 'text-amber-600'} />;
      default:
        return <FileText size={20} className={themeClasses.text.tertiary} />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Compliant':
        return themeClasses.badge.success;
      case 'Non-Compliant':
        return themeClasses.badge.danger;
      case 'Conditional':
        return themeClasses.badge.warning;
      default:
        return themeClasses.badge.neutral;
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
        logger.warn('PDF libraries not available, using print dialog');
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
      logger.error('Error generating PDF:', error);
      // Fallback to print dialog
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors ${themeClasses.bg.secondary}`}>
      {/* Toolbar */}
      <div className={`${themeClasses.bg.card} ${themeClasses.border.default} border-b px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm print:hidden transition-colors flex-shrink-0`}>
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
          <h2 className={`text-xl md:text-2xl font-bold transition-colors ${themeClasses.text.primary}`}>Generador de Reportes DNSH</h2>
          <div className={`hidden md:block h-6 w-px mx-2 transition-colors ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-300'}`}></div>
          
          {/* Level Selection */}
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium transition-colors ${themeClasses.text.secondary}`}>Nivel:</span>
            <div className={`flex rounded-lg p-1 transition-colors ${theme === 'dark' ? 'bg-[#111111]' : 'bg-gray-100'}`}>
              <button
                onClick={() => setReportLevel(ReportLevel.COMPANY)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-1 ${
                  reportLevel === ReportLevel.COMPANY
                    ? theme === 'dark' 
                      ? 'bg-[#0a0a0a] text-[#00ff88] shadow-sm' 
                      : 'bg-white text-emerald-600 shadow-sm'
                    : themeClasses.text.secondary + ' ' + (theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900')
                }`}
              >
                <Building2 size={16} />
                <span>Compañía</span>
              </button>
              <button
                onClick={() => setReportLevel(ReportLevel.PORTFOLIO)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-1 ${
                  reportLevel === ReportLevel.PORTFOLIO
                    ? theme === 'dark' 
                      ? 'bg-[#0a0a0a] text-[#00ff88] shadow-sm' 
                      : 'bg-white text-emerald-600 shadow-sm'
                    : themeClasses.text.secondary + ' ' + (theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900')
                }`}
              >
                <Briefcase size={16} />
                <span>Portfolio</span>
              </button>
              <button
                onClick={() => setReportLevel(ReportLevel.ASSET)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-1 ${
                  reportLevel === ReportLevel.ASSET
                    ? theme === 'dark' 
                      ? 'bg-[#0a0a0a] text-[#00ff88] shadow-sm' 
                      : 'bg-white text-emerald-600 shadow-sm'
                    : themeClasses.text.secondary + ' ' + (theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900')
                }`}
              >
                <Layers size={16} />
                <span>Asset</span>
              </button>
            </div>
          </div>
          
          {/* Entity Selection */}
          <div className={`hidden md:block h-6 w-px mx-2 transition-colors ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-300'}`}></div>
          {reportLevel === ReportLevel.COMPANY && (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className={`${themeClasses.inputClass} text-sm rounded-lg block px-3 py-2 min-w-[200px] shadow-sm`}
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
              className={`${themeClasses.inputClass} text-sm rounded-lg block px-3 py-2 min-w-[280px] shadow-sm`}
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
                className={`${themeClasses.inputClass} text-sm rounded-lg block px-3 py-2 min-w-[200px] shadow-sm`}
              >
                {DEMO_OPERATIONS.map(op => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
              {selectedOperation && (
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className={`${themeClasses.inputClass} text-sm rounded-lg block px-3 py-2 min-w-[200px] shadow-sm ml-2`}
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
        <div className="flex items-center space-x-2 md:space-x-3 flex-wrap">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all cursor-pointer active:scale-[0.90] border ${themeClasses.button.secondary}`}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
          <div className="flex items-center space-x-2 text-sm">
            <Sparkles size={16} className={theme === 'dark' ? 'text-[#00ff88]' : 'text-emerald-600'} />
            <span className={themeClasses.text.secondary}>IA Gen Activo</span>
          </div>
          <div className={`hidden md:block h-6 w-px mx-2 transition-colors ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-300'}`}></div>
          <button 
            onClick={handlePrint}
            className={`flex items-center px-3 md:px-4 py-2 rounded-lg transition-colors shadow-sm font-medium text-sm ${themeClasses.button.secondary}`}
          >
            <Printer size={18} className="mr-1 md:mr-2" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className={`flex items-center px-3 md:px-4 py-2 rounded-lg transition-colors shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.button.primary}`}
          >
            {isGeneratingPDF ? (
              <>
                <div className={`animate-spin rounded-full h-4 w-4 border-b-2 mr-2 ${theme === 'dark' ? 'border-[#0a0a0a]' : 'border-white'}`}></div>
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
      <div className={`flex-1 overflow-y-auto p-4 md:p-8 flex justify-center transition-colors ${themeClasses.bg.secondary} min-h-0`}>
        {currentReport && (
          <div ref={reportRef} className={`${themeClasses.bg.card} w-full max-w-[210mm] shadow-xl p-6 md:p-12 mb-8 print:shadow-none print:max-w-full print:p-8 transition-colors ${themeClasses.text.primary}`}>
            {/* Watermark/Header */}
            <div className={`flex justify-between items-start border-b-2 pb-6 mb-8 transition-colors ${theme === 'dark' ? 'border-[#2a2a2a]' : 'border-gray-900'}`}>
              <div>
                <h1 className={`text-3xl font-bold uppercase tracking-tight transition-colors ${themeClasses.text.primary}`}>Technical Due Diligence</h1>
                <p className={`font-semibold text-lg mt-1 transition-colors ${theme === 'dark' ? 'text-[#00ff88]' : 'text-emerald-600'}`}>Evaluación DNSH & Riesgos Climáticos</p>
                <p className={`text-sm mt-2 transition-colors ${themeClasses.text.tertiary}`}>
                  {reportLevel === ReportLevel.COMPANY && companyReport && `Nivel: Compañía - ${companyReport.clientName}`}
                  {reportLevel === ReportLevel.PORTFOLIO && portfolioReport && `Nivel: Portfolio - ${portfolioReport.operationName}`}
                  {reportLevel === ReportLevel.ASSET && assetReport && `Nivel: Asset - ${assetReport.assetName}`}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg transition-colors ${themeClasses.text.primary}`}>EcoInvest</p>
                <p className={`text-sm transition-colors ${themeClasses.text.tertiary}`}>Ref: {currentReport.reportDate.split('T')[0]}</p>
                <p className={`text-sm transition-colors ${themeClasses.text.tertiary}`}>{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              </div>
            </div>
            
            {/* Report Sections */}
            <div className="space-y-6">
              {currentReport.sections.map((section, idx) => {
                const isExpanded = expandedSections.has(section.id);
                return (
                  <section key={section.id} className="break-inside-avoid">
                    <div className={`${themeClasses.border.default} border rounded-lg overflow-hidden shadow-sm print:shadow-none transition-colors`}>
                      {/* Section Header */}
                      <div
                        className={`p-4 cursor-pointer transition-colors flex items-center justify-between print:cursor-default ${themeClasses.bg.card} ${themeClasses.border.default} border-b ${theme === 'dark' ? 'hover:bg-[#111111]' : 'hover:bg-gray-50'}`}
                        onClick={() => toggleSection(section.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-bold transition-colors ${themeClasses.text.tertiary}`}>{idx + 1}.</span>
                          <h2 className={`text-lg font-bold transition-colors ${themeClasses.text.primary}`}>{section.title}</h2>
                          {section.metadata?.aiGenerated && (
                            <span className={`text-xs px-2 py-0.5 rounded flex items-center space-x-1 transition-colors ${themeClasses.badge.success}`}>
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
                            className={`text-xs flex items-center space-x-1 px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'text-[#00ff88] hover:text-white hover:bg-[#00ff88]/10' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
                            title="Editar con IA"
                          >
                            <Edit3 size={14} />
                            <span>Editar</span>
                          </button>
                          <span className="print:hidden">
                            {isExpanded ? <ChevronUp size={20} className={themeClasses.text.secondary} /> : <ChevronDown size={20} className={themeClasses.text.secondary} />}
                          </span>
                        </div>
                      </div>
                      
                      {/* Section Content */}
                      {isExpanded && (
                        <div className={`p-6 transition-colors ${themeClasses.bg.card}`}>
                          <div className={`prose prose-sm max-w-none whitespace-pre-wrap transition-colors ${themeClasses.text.secondary}`}>
                            {section.content.split('\n').map((line, lineIdx) => {
                              if (line.startsWith('# ')) {
                                return <h1 key={lineIdx} className={`text-2xl font-bold mb-4 transition-colors ${themeClasses.text.primary}`}>{line.substring(2)}</h1>;
                              } else if (line.startsWith('## ')) {
                                return <h2 key={lineIdx} className={`text-xl font-bold mt-6 mb-3 transition-colors ${themeClasses.text.primary}`}>{line.substring(3)}</h2>;
                              } else if (line.startsWith('### ')) {
                                return <h3 key={lineIdx} className={`text-lg font-semibold mt-4 mb-2 transition-colors ${themeClasses.text.primary}`}>{line.substring(4)}</h3>;
                              } else if (line.startsWith('- ')) {
                                return <li key={lineIdx} className={`ml-4 mb-1 transition-colors ${themeClasses.text.secondary}`}>{line.substring(2)}</li>;
                              } else if (line.startsWith('**') && line.endsWith('**')) {
                                return <p key={lineIdx} className={`font-semibold mb-2 transition-colors ${themeClasses.text.primary}`}>{line.replace(/\*\*/g, '')}</p>;
                              } else if (line.trim() === '') {
                                return <br key={lineIdx} />;
                              } else {
                                return <p key={lineIdx} className={`mb-2 transition-colors ${themeClasses.text.secondary}`}>{line}</p>;
                              }
                            })}
                          </div>
                          {section.metadata?.lastModified && (
                            <div className={`mt-4 pt-4 border-t text-xs transition-colors ${themeClasses.border.default} ${themeClasses.text.tertiary}`}>
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
                    <h2 className={`text-sm font-bold uppercase pb-1 mb-4 border-b transition-colors ${themeClasses.text.tertiary} ${themeClasses.border.default}`}>Análisis de Exposición de Activos</h2>
                    <table className="w-full text-sm border-collapse">
                      <thead className={`transition-colors ${theme === 'dark' ? 'bg-[#111111]' : 'bg-gray-100'} ${themeClasses.text.secondary}`}>
                        <tr>
                          <th className={`py-3 px-4 text-left font-semibold border-b transition-colors ${themeClasses.border.default}`}>Activo</th>
                          <th className={`py-3 px-4 text-left font-semibold border-b transition-colors ${themeClasses.border.default}`}>Tipo</th>
                          <th className={`py-3 px-4 text-right font-semibold border-b transition-colors ${themeClasses.border.default}`}>Valor (€)</th>
                          <th className={`py-3 px-4 text-center font-semibold border-b transition-colors ${themeClasses.border.default}`}>Estado DNSH</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y transition-colors ${theme === 'dark' ? 'divide-[#1a1a1a]' : 'divide-gray-200'}`}>
                        {selectedOperation.assets.map(asset => (
                          <tr key={asset.id} className={`cursor-pointer transition-colors ${theme === 'dark' ? 'hover:bg-[#111111]' : 'hover:bg-gray-50'}`} onClick={() => {
                            setReportLevel(ReportLevel.ASSET);
                            setSelectedOpId(asset.operationId);
                            setSelectedAssetId(asset.id);
                          }}>
                            <td className={`py-3 px-4 font-medium transition-colors ${themeClasses.text.primary}`}>{asset.name}</td>
                            <td className={`py-3 px-4 transition-colors ${themeClasses.text.secondary}`}>{asset.assetType}</td>
                            <td className={`py-3 px-4 text-right font-semibold transition-colors ${themeClasses.text.primary}`}>{(asset.exposedValue/1000000).toFixed(1)}M</td>
                            <td className="py-3 px-4 text-center">
                              {asset.dnshEvaluation ? (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors ${getStatusBadgeClass(asset.dnshEvaluation.overallStatus)}`}>
                                  {asset.dnshEvaluation.overallStatus}
                                </span>
                              ) : (
                                <span className={`text-xs transition-colors ${themeClasses.text.tertiary}`}>No evaluado</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                  
                  {/* Map Section */}
                  <section className="break-inside-avoid">
                    <h2 className={`text-sm font-bold uppercase pb-1 mb-4 border-b transition-colors ${themeClasses.text.tertiary} ${themeClasses.border.default}`}>Ubicación Geográfica de Activos</h2>
                    <div className={`p-3 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'} ${themeClasses.border.default}`}>
                      <div className={`h-[250px] rounded-lg overflow-hidden border relative transition-colors ${themeClasses.border.default}`}>
                        <MapViewer 
                          assets={selectedOperation.assets}
                          activeLayers={[]}
                          theme={theme}
                          showControls={true}
                        />
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
            
            {/* Footer */}
            <div className={`mt-8 pt-6 border-t-2 text-xs text-center print:mt-6 transition-colors ${theme === 'dark' ? 'border-[#2a2a2a]' : 'border-gray-300'} ${themeClasses.text.tertiary}`}>
              <p className={`font-medium mb-1 transition-colors ${themeClasses.text.secondary}`}>Este documento ha sido generado automáticamente por la plataforma EcoInvest DNSH.</p>
              <p className={`transition-colors ${themeClasses.text.muted}`}>La información contenida es confidencial y está sujeta a las políticas de privacidad de EcoInvest.</p>
            </div>
          </div>
        )}
        
        {!currentReport && (
          <div className={`rounded-lg p-12 text-center shadow-lg transition-colors ${themeClasses.bg.card} ${themeClasses.border.default} border`}>
            <FileText size={64} className={`mx-auto mb-4 transition-colors ${themeClasses.text.tertiary}`} />
            <h3 className={`text-xl font-semibold mb-2 transition-colors ${themeClasses.text.primary}`}>Selecciona un nivel y entidad para generar el reporte</h3>
            <p className={`transition-colors ${themeClasses.text.secondary}`}>Usa los controles superiores para seleccionar Compañía, Portfolio o Asset</p>
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
