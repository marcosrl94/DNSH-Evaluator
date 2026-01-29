import React, { useState, useMemo, useRef } from 'react';
import { DEMO_OPERATIONS, DEMO_CLIENTS, DNSH_CHECKLIST_TEMPLATES } from '../constants';
import { getAllMeasures } from '../constants/extendedMeasures';
import { FileText, Download, Printer, CheckCircle, AlertTriangle, XCircle, MapPin, FileCheck, FileX, Lightbulb, ChevronDown, ChevronUp, Building2, Briefcase, Layers, Sparkles, Edit3, Settings } from 'lucide-react';
import { Operation, DnshObjective, AssetDnshEvaluation, EvidenceType, Client, Asset } from '../types';
import MapViewer from '../components/MapViewer';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { generateCompanyReport, generatePortfolioReport, generateAssetReport, ReportLevel, ReportSection } from '../services/reportingService';
import { generateReportSectionWithAI } from '../services/aiIntegrationService';
import ReportingAIAssistant from '../components/ReportingAIAssistant';
import ReportConfigPanel from '../components/ReportConfigPanel';
import AIProviderSelector from '../components/AIProviderSelector';
import { getDefaultConfiguration, getEnabledSections, ReportConfiguration } from '../services/reportConfig';
import { AIProvider } from '../services/aiProviderService';
import { logger } from '../utils/logger';
import { getAllOperations, dataStore, getClient, getOperation, getClientOperations } from '../services/dataManagement';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { useAuth } from '../context/AuthContext';

const ReportsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const themeClasses = getThemeClasses(theme);
  
  // Report level selection
  const [reportLevel, setReportLevel] = useState<ReportLevel>(ReportLevel.PORTFOLIO);
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    try {
      return (Array.isArray(DEMO_CLIENTS) && DEMO_CLIENTS.length > 0) ? DEMO_CLIENTS[0].id : '';
    } catch {
      return '';
    }
  });
  const [selectedOpId, setSelectedOpId] = useState<string>(() => {
    try {
      return (Array.isArray(DEMO_OPERATIONS) && DEMO_OPERATIONS.length > 0) ? DEMO_OPERATIONS[0].id : '';
    } catch {
      return '';
    }
  });
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  
  // UI state
  const [expandedObjectives, setExpandedObjectives] = useState<Set<DnshObjective>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ReportSection | undefined>();
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfiguration>(() => getDefaultConfiguration(ReportLevel.PORTFOLIO));
  const [selectedAIProvider, setSelectedAIProvider] = useState<AIProvider | null>(null);
  const [useAIGeneration, setUseAIGeneration] = useState(false);
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Get selected entities - use data store for fresh data
  const [operations, setOperations] = React.useState<Operation[]>([]);

  // Load operations on mount
  React.useEffect(() => {
    const loadOperations = async () => {
      try {
        const ops = await getAllOperations();
        setOperations(Array.isArray(ops) ? ops : []);
      } catch (error) {
        logger.error('Error loading operations', error, { component: 'Reports', action: 'loadOperations' });
        setOperations([]);
      }
    };
    loadOperations();
  }, []);
  
  // Subscribe to data store changes
  React.useEffect(() => {
    const unsubscribe = dataStore.subscribe(async () => {
      try {
        const ops = await getAllOperations();
        setOperations(Array.isArray(ops) ? ops : []);
      } catch (error) {
        logger.error('Error loading operations', error, { component: 'Reports', action: 'subscribeOperations' });
      }
    });
    return unsubscribe;
  }, []);
  
  const [selectedOperation, setSelectedOperation] = React.useState<Operation | null>(null);

  // Load selected operation
  React.useEffect(() => {
    const loadOperation = async () => {
      if (selectedOpId) {
        try {
          const op = await getOperation(selectedOpId);
          setSelectedOperation(op || null);
        } catch (error) {
          logger.error('Error loading operation', error, { component: 'Reports', action: 'loadOperation', operationId: selectedOpId });
          setSelectedOperation(null);
        }
      } else {
        setSelectedOperation(null);
      }
    };
    loadOperation();
  }, [selectedOpId]);

  const selectedClient = useMemo(() => 
    selectedClientId ? getClient(selectedClientId) : null,
    [selectedClientId]
  );
  
  const selectedAsset = useMemo(() => 
    selectedAssetId && selectedOperation 
      ? (selectedOperation.assets || []).find(a => a.id === selectedAssetId) 
      : null,
    [selectedAssetId, selectedOperation]
  );
  
  // Generate reports based on level
  const companyReport = useMemo(() => {
    if (reportLevel === ReportLevel.COMPANY && selectedClient) {
      // Filter operations for this client from loaded operations
      const safeOps = Array.isArray(operations) ? operations : [];
      const clientOperations = safeOps.filter(op => op.clientId === selectedClient.id);
      const report = generateCompanyReport(selectedClient, clientOperations);
      
      // If AI generation is enabled and provider selected, enhance sections
      if (useAIGeneration && selectedAIProvider && report) {
        // This will be handled asynchronously via handleRegenerateAllWithAI
        // For now, return the base report
      }
      
      return report;
    }
    return null;
  }, [reportLevel, selectedClient, operations, useAIGeneration, selectedAIProvider]);
  
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
  
  // Update config when report level changes
  React.useEffect(() => {
    setReportConfig(getDefaultConfiguration(reportLevel));
  }, [reportLevel]);
  
  // Filter sections based on configuration
  const filteredReportSections = useMemo(() => {
    if (!currentReport) return [];
    
    const enabledSectionTypes = new Set(
      getEnabledSections(reportConfig).map(s => s.type)
    );
    
    return currentReport.sections.filter(section => 
      enabledSectionTypes.has(section.type)
    ).sort((a, b) => {
      const aOrder = reportConfig.sections.find(s => s.type === a.type)?.order || 999;
      const bOrder = reportConfig.sections.find(s => s.type === b.type)?.order || 999;
      return aOrder - bOrder;
    });
  }, [currentReport, reportConfig]);
  
  // Handle section updates from AI assistant
  const handleSectionUpdate = (sectionId: string, content: string) => {
    // Update section content in all possible reports
    if (companyReport) {
      const section = companyReport.sections.find(s => s.id === sectionId);
      if (section) {
        section.content = content;
        section.metadata = {
          ...section.metadata,
          lastModified: new Date().toISOString(),
          aiGenerated: true
        };
      }
    }
    if (portfolioReport) {
      const section = portfolioReport.sections.find(s => s.id === sectionId);
      if (section) {
        section.content = content;
        section.metadata = {
          ...section.metadata,
          lastModified: new Date().toISOString(),
          aiGenerated: true
        };
      }
    }
    if (assetReport) {
      const section = assetReport.sections.find(s => s.id === sectionId);
      if (section) {
        section.content = content;
        section.metadata = {
          ...section.metadata,
          lastModified: new Date().toISOString(),
          aiGenerated: true
        };
      }
    }
  };
  
  const handleRegenerateSectionWithAI = async (sectionId: string) => {
    if (!selectedAIProvider || !currentReport || !currentReport.sections) return;
    
    const section = currentReport.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    setIsGeneratingWithAI(true);
    try {
      const context = {
        client: selectedClient || undefined,
        operation: selectedOperation || undefined,
        asset: selectedAsset || undefined,
        operations: reportLevel === ReportLevel.COMPANY && Array.isArray(operations) ? operations.filter(op => op && op.clientId === selectedClientId) : undefined,
        metrics: companyReport?.metrics || portfolioReport?.metrics || assetReport?.metrics,
        objectiveCompliance: companyReport?.metrics?.objectiveCompliance || portfolioReport?.metrics?.objectiveCompliance,
        riskDistribution: companyReport?.metrics?.riskDistribution
      };
      
      // Convert ReportSectionType enum to string for AI service
      const sectionTypeString = section.type.toString().toLowerCase();
      
      const enhancedContent = await generateReportSectionWithAI(
        selectedAIProvider,
        sectionTypeString,
        context,
        section.content
      );
      
      handleSectionUpdate(sectionId, enhancedContent);
    } catch (error: any) {
      logger.error('Error generating section with AI:', error);
      alert(`Error al generar con IA: ${error.message}`);
    } finally {
      setIsGeneratingWithAI(false);
    }
  };
  
  const handleRegenerateAllWithAI = async () => {
    if (!selectedAIProvider || !currentReport || !Array.isArray(filteredReportSections)) return;
    
    setIsGeneratingWithAI(true);
    try {
      const safeOperations = Array.isArray(operations) ? operations : [];
      const context = {
        client: selectedClient || undefined,
        operation: selectedOperation || undefined,
        asset: selectedAsset || undefined,
        operations: reportLevel === ReportLevel.COMPANY ? safeOperations.filter(op => op && op.clientId === selectedClientId) : undefined,
        metrics: companyReport?.metrics || portfolioReport?.metrics || assetReport?.metrics,
        objectiveCompliance: companyReport?.metrics?.objectiveCompliance || portfolioReport?.metrics?.objectiveCompliance,
        riskDistribution: companyReport?.metrics?.riskDistribution
      };
      
      // Regenerate all enabled sections
      for (const section of filteredReportSections) {
        if (!section || !section.id || !section.type) continue;
        try {
          // Convert ReportSectionType enum to string for AI service
          const sectionTypeString = section.type.toString().toLowerCase();
          
          const enhancedContent = await generateReportSectionWithAI(
            selectedAIProvider,
            sectionTypeString,
            context,
            section.content
          );
          handleSectionUpdate(section.id, enhancedContent);
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          logger.error(`Error generating section ${section.id} with AI:`, error);
        }
      }
    } catch (error: any) {
      logger.error('Error generating report with AI:', error);
      alert(`Error al generar reporte con IA: ${error.message}`);
    } finally {
      setIsGeneratingWithAI(false);
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

    const safeAssets = Array.isArray(selectedOperation.assets) ? selectedOperation.assets : [];
    const totalAssets = safeAssets.length;
    let compliantAssets = 0;
    let hasNonCompliant = false;
    let hasConditional = false;
    const evidenceDocs: any[] = [];
    const missingEvidences: string[] = [];
    const suggestedMeasures: any[] = [];

    // Collect evidence documents for this objective
    if (Array.isArray(selectedOperation.evidenceDocuments)) {
      selectedOperation.evidenceDocuments.forEach(ev => {
        if (ev && (!ev.relatedObjective || ev.relatedObjective === objective)) {
          evidenceDocs.push(ev);
        }
      });
    }

    // Analyze each asset's evaluation
    safeAssets.forEach(asset => {
      if (!asset || !asset.id) return;
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
              {Array.isArray(DEMO_CLIENTS) ? DEMO_CLIENTS.map(client => (
                client && client.id ? <option key={client.id} value={client.id}>{client.name || 'Sin nombre'}</option> : null
              )).filter(Boolean) : null}
            </select>
          )}
          {reportLevel === ReportLevel.PORTFOLIO && (
            <select
              value={selectedOpId}
              onChange={(e) => setSelectedOpId(e.target.value)}
              className={`${themeClasses.inputClass} text-sm rounded-lg block px-3 py-2 min-w-[280px] shadow-sm`}
            >
              {Array.isArray(DEMO_OPERATIONS) ? DEMO_OPERATIONS.map(op => (
                op && op.id ? <option key={op.id} value={op.id}>{op.name || 'Sin nombre'}</option> : null
              )).filter(Boolean) : null}
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
                  {Array.isArray(selectedOperation.assets) ? selectedOperation.assets.map(asset => (
                    asset && asset.id ? <option key={asset.id} value={asset.id}>{asset.name || 'Sin nombre'}</option> : null
                  )).filter(Boolean) : null}
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
          {currentReport && (
            <>
              <AIProviderSelector
                selectedProvider={selectedAIProvider}
                onProviderChange={setSelectedAIProvider}
                useCase={reportLevel === ReportLevel.COMPANY ? 'executive_summary' : 'detailed_analysis'}
                reportLevel={reportLevel}
              />
              <div className={`hidden md:block h-6 w-px mx-2 transition-colors ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-300'}`}></div>
            </>
          )}
          <button 
            onClick={() => setShowConfigPanel(true)}
            className={`flex items-center px-3 md:px-4 py-2 rounded-lg transition-colors shadow-sm font-medium text-sm ${themeClasses.button.secondary}`}
            title="Configurar reporte"
          >
            <Settings size={18} className="mr-1 md:mr-2" />
            <span className="hidden sm:inline">Configurar</span>
          </button>
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
              {Array.isArray(filteredReportSections) ? filteredReportSections.map((section, idx) => {
                if (!section || !section.id) return null;
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
                          {selectedAIProvider && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateSectionWithAI(section.id);
                              }}
                              disabled={isGeneratingWithAI}
                              className={`text-xs flex items-center space-x-1 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                theme === 'dark' 
                                  ? 'text-[#00ff88] hover:text-white hover:bg-[#00ff88]/10' 
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title="Regenerar con IA"
                            >
                              {isGeneratingWithAI ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                  <span>Generando...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={14} />
                                  <span>IA</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (editingSectionId === section.id) {
                                // Save changes
                                handleSectionUpdate(section.id, editingContent);
                                setEditingSectionId(null);
                                setEditingContent('');
                              } else {
                                // Start editing
                                setEditingSectionId(section.id);
                                setEditingContent(section.content);
                              }
                            }}
                            className={`text-xs flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                              editingSectionId === section.id
                                ? 'bg-[#00ff88] text-[#0a0a0a]'
                                : theme === 'dark' 
                                  ? 'text-[#00ff88] hover:text-white hover:bg-[#00ff88]/10' 
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={editingSectionId === section.id ? "Guardar cambios" : "Editar contenido"}
                          >
                            <Edit3 size={14} />
                            <span>{editingSectionId === section.id ? 'Guardar' : 'Editar'}</span>
                          </button>
                          <span className="print:hidden">
                            {isExpanded ? <ChevronUp size={20} className={themeClasses.text.secondary} /> : <ChevronDown size={20} className={themeClasses.text.secondary} />}
                          </span>
                        </div>
                      </div>
                      
                      {/* Section Content */}
                      {isExpanded && (
                        <div className={`p-6 transition-colors ${themeClasses.bg.card}`}>
                          {editingSectionId === section.id ? (
                            <div className="space-y-4">
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className={`w-full min-h-[400px] p-4 rounded-lg font-mono text-sm ${themeClasses.inputClass} border ${themeClasses.border.default} resize-y`}
                                placeholder="Edita el contenido del reporte aquí..."
                              />
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => {
                                    handleSectionUpdate(section.id, editingContent);
                                    setEditingSectionId(null);
                                    setEditingContent('');
                                  }}
                                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                    theme === 'dark'
                                      ? 'bg-[#00ff88] text-[#0a0a0a] hover:bg-[#00ff88]/80'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                >
                                  Guardar Cambios
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSectionId(null);
                                    setEditingContent('');
                                  }}
                                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${themeClasses.button.secondary}`}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                          <div className={`prose prose-sm max-w-none whitespace-pre-wrap transition-colors ${themeClasses.text.secondary}`}>
                            {(section.content || '').split('\n').map((line, lineIdx) => {
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
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                );
              }).filter(Boolean) : null}
              
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
                        {Array.isArray(selectedOperation.assets) ? selectedOperation.assets.map(asset => {
                          if (!asset || !asset.id) return null;
                          return (
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
                          );
                        }).filter(Boolean) : null}
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
        sections={filteredReportSections}
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
      
      {/* Configuration Panel */}
      {showConfigPanel && (
        <ReportConfigPanel
          level={reportLevel}
          currentConfig={reportConfig}
          onConfigChange={setReportConfig}
          onClose={() => setShowConfigPanel(false)}
        />
      )}
    </div>
  );
};

export default ReportsPage;
