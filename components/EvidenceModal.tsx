import React, { useState, useRef } from 'react';
import { X, Upload, Download, Trash2, FileText, Image, File, Eye } from 'lucide-react';
import { EvidenceDocument, EvidenceType } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  evidenceDocuments: EvidenceDocument[];
  onAddEvidence: (evidence: Omit<EvidenceDocument, 'id' | 'uploadDate'>) => void;
  onDeleteEvidence: (evidenceId: string) => void;
  assetId?: string;
  operationId: string;
}

const EvidenceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  evidenceDocuments,
  onAddEvidence,
  onDeleteEvidence,
  assetId,
  operationId
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [documentType, setDocumentType] = useState<EvidenceType>(EvidenceType.TECHNICAL_DUE_DILIGENCE);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<EvidenceDocument | null>(null);

  // Filter evidence by asset if provided
  const filteredEvidence = assetId
    ? evidenceDocuments.filter(ev => ev.assetId === assetId)
    : evidenceDocuments.filter(ev => !ev.assetId); // Operation-level evidence

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDocumentName(file.name);
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentName.trim()) return;

    setIsUploading(true);
    
    try {
      // In a real app, upload to storage service (S3, etc.)
      // For now, create a data URL or blob URL
      const fileUrl = URL.createObjectURL(selectedFile);
      
      const newEvidence: Omit<EvidenceDocument, 'id' | 'uploadDate'> = {
        operationId,
        assetId,
        name: documentName,
        type: documentType,
        description: documentDescription || undefined,
        uploadedBy: 'Current User',
        fileUrl,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
      };

      onAddEvidence(newEvidence);
      
      // Reset form
      setSelectedFile(null);
      setDocumentName('');
      setDocumentDescription('');
      setDocumentType(EvidenceType.TECHNICAL_DUE_DILIGENCE);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (evidence: EvidenceDocument) => {
    if (evidence.fileUrl) {
      const link = document.createElement('a');
      link.href = evidence.fileUrl;
      link.download = evidence.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreview = (evidence: EvidenceDocument) => {
    setPreviewDocument(evidence);
    if (evidence.fileUrl && evidence.mimeType?.startsWith('image/')) {
      setPreviewUrl(evidence.fileUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDelete = (evidenceId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta evidencia?')) {
      onDeleteEvidence(evidenceId);
      if (previewDocument?.id === evidenceId) {
        setPreviewDocument(null);
        setPreviewUrl(null);
      }
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File size={20} />;
    if (mimeType.startsWith('image/')) return <Image size={20} />;
    return <FileText size={20} />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-4xl max-h-[90vh] rounded-xl border overflow-hidden flex flex-col transition-colors ${themeClasses.card.bg} ${themeClasses.card.border} shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b flex-shrink-0 transition-colors ${themeClasses.border.default}`}>
          <h3 className={`text-lg font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
            GESTION_EVIDENCIAS
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${themeClasses.bg.hover} ${themeClasses.text.tertiary} hover:${themeClasses.text.primary}`}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Evidence List */}
          <div className="w-1/2 border-r flex flex-col transition-colors ${themeClasses.border.default}">
            {/* Upload Section */}
            <div className={`p-4 border-b transition-colors ${themeClasses.border.default}`}>
              <h4 className={`text-xs font-bold font-mono uppercase tracking-wider mb-3 transition-colors ${themeClasses.text.primary}`}>
                SUBIR_EVIDENCIA
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>
                    ARCHIVO
                  </label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full p-3 border-2 border-dashed rounded-lg transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center space-x-2 ${
                      theme === 'dark'
                        ? 'border-[#00ff88]/30 hover:border-[#00ff88]/50 bg-[#00ff88]/5'
                        : 'border-[#0066cc]/30 hover:border-[#0066cc]/50 bg-[#0066cc]/5'
                    }`}
                  >
                    <Upload size={16} className={theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'} />
                    <span className={`text-xs font-mono uppercase ${theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'}`}>
                      {selectedFile ? (selectedFile.name.length > 30 ? selectedFile.name.substring(0, 30) + '...' : selectedFile.name) : 'SELECCIONAR_ARCHIVO'}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                  />
                </div>

                {selectedFile && (
                  <>
                    <div>
                      <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>
                        NOMBRE
                      </label>
                      <input
                        type="text"
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-lg border transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default} ${themeClasses.text.primary} focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50`}
                        placeholder="NOMBRE_DEL_DOCUMENTO"
                      />
                    </div>

                    <div>
                      <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>
                        TIPO
                      </label>
                      <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value as EvidenceType)}
                        className={`w-full px-3 py-2 text-xs rounded-lg border transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default} ${themeClasses.text.primary} focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50`}
                      >
                        <option value={EvidenceType.TECHNICAL_DUE_DILIGENCE}>TECHNICAL_DUE_DILIGENCE</option>
                        <option value={EvidenceType.ENVIRONMENTAL_IMPACT_ASSESSMENT}>ENVIRONMENTAL_IMPACT_ASSESSMENT</option>
                        <option value={EvidenceType.DNSH_ASSESSMENT_THIRD_PARTY}>DNSH_ASSESSMENT_THIRD_PARTY</option>
                        <option value={EvidenceType.CLIMATE_RISK_ASSESSMENT}>CLIMATE_RISK_ASSESSMENT</option>
                        <option value={EvidenceType.ADAPTATION_PLAN}>ADAPTATION_PLAN</option>
                        <option value={EvidenceType.ENVIRONMENTAL_PERMIT}>ENVIRONMENTAL_PERMIT</option>
                        <option value={EvidenceType.WATER_PERMIT}>WATER_PERMIT</option>
                        <option value={EvidenceType.BIODIVERSITY_STUDY}>BIODIVERSITY_STUDY</option>
                        <option value={EvidenceType.WASTE_MANAGEMENT_PLAN}>WASTE_MANAGEMENT_PLAN</option>
                        <option value={EvidenceType.EMISSION_REPORT}>EMISSION_REPORT</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>
                        DESCRIPCION (OPCIONAL)
                      </label>
                      <textarea
                        value={documentDescription}
                        onChange={(e) => setDocumentDescription(e.target.value)}
                        rows={2}
                        className={`w-full px-3 py-2 text-xs rounded-lg border transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default} ${themeClasses.text.primary} focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 resize-none`}
                        placeholder="DESCRIPCION..."
                      />
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={isUploading || !documentName.trim()}
                      className={`w-full px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] border focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                        theme === 'dark'
                          ? 'bg-[#00ff88] text-[#0a0a0a] border-[#00ff88] hover:bg-[#00ff88]/80'
                          : 'bg-[#0066cc] text-white border-[#0066cc] hover:bg-[#0066cc]/80'
                      }`}
                    >
                      {isUploading ? 'SUBIENDO...' : 'SUBIR_EVIDENCIA'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Evidence List */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 custom-scrollbar">
              <h4 className={`text-xs font-bold font-mono uppercase tracking-wider mb-3 transition-colors ${themeClasses.text.primary}`}>
                EVIDENCIAS ({filteredEvidence.length})
              </h4>
              
              {filteredEvidence.length === 0 ? (
                <div className={`text-center py-8 ${themeClasses.text.tertiary}`}>
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-mono uppercase">NO_HAY_EVIDENCIAS</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEvidence.map((evidence) => (
                    <div
                      key={evidence.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                        previewDocument?.id === evidence.id
                          ? theme === 'dark'
                            ? 'bg-[#00ff88]/10 border-[#00ff88]/30'
                            : 'bg-[#0066cc]/10 border-[#0066cc]/30'
                          : `${themeClasses.bg.tertiary} ${themeClasses.border.default}`
                      }`}
                      onClick={() => handlePreview(evidence)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1 min-w-0">
                          {getFileIcon(evidence.mimeType)}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold font-mono uppercase truncate transition-colors ${themeClasses.text.primary}`}>
                              {evidence.name}
                            </p>
                            <p className={`text-[10px] font-mono uppercase mt-1 transition-colors ${themeClasses.text.tertiary}`}>
                              {evidence.type} • {formatFileSize(evidence.fileSize)}
                            </p>
                            {evidence.description && (
                              <p className={`text-[10px] font-mono mt-1 line-clamp-2 transition-colors ${themeClasses.text.tertiary}`}>
                                {evidence.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(evidence);
                            }}
                            className={`p-1.5 rounded transition-colors ${themeClasses.bg.hover} ${themeClasses.text.tertiary} hover:${themeClasses.text.primary}`}
                            aria-label="Descargar"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(evidence.id);
                            }}
                            className={`p-1.5 rounded transition-colors ${themeClasses.bg.hover} text-red-400 hover:text-red-500`}
                            aria-label="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 flex flex-col">
            {previewDocument ? (
              <>
                <div className={`p-4 border-b flex items-center justify-between transition-colors ${themeClasses.border.default}`}>
                  <h4 className={`text-xs font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
                    VISTA_PREVIA
                  </h4>
                  <button
                    onClick={() => {
                      setPreviewDocument(null);
                      setPreviewUrl(null);
                    }}
                    className={`p-1.5 rounded transition-colors ${themeClasses.bg.hover} ${themeClasses.text.tertiary}`}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 p-4 custom-scrollbar">
                  <div className={`mb-4 p-3 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                    <p className={`text-xs font-bold font-mono uppercase mb-2 transition-colors ${themeClasses.text.primary}`}>
                      {previewDocument.name}
                    </p>
                    <div className={`text-[10px] font-mono space-y-1 transition-colors ${themeClasses.text.tertiary}`}>
                      <p>TIPO: {previewDocument.type}</p>
                      <p>TAMAÑO: {formatFileSize(previewDocument.fileSize)}</p>
                      {previewDocument.mimeType && <p>FORMATO: {previewDocument.mimeType}</p>}
                      {previewDocument.uploadDate && (
                        <p>FECHA: {new Date(previewDocument.uploadDate).toLocaleDateString()}</p>
                      )}
                      {previewDocument.description && (
                        <p className="mt-2">DESCRIPCION: {previewDocument.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {previewUrl && previewDocument.mimeType?.startsWith('image/') ? (
                    <div className="rounded-lg overflow-hidden border transition-colors ${themeClasses.border.default}">
                      <img src={previewUrl} alt={previewDocument.name} className="w-full h-auto" />
                    </div>
                  ) : (
                    <div className={`flex items-center justify-center h-64 rounded-lg border transition-colors ${themeClasses.border.default} ${themeClasses.bg.tertiary}`}>
                      <div className="text-center">
                        <FileText size={48} className={`mx-auto mb-2 ${themeClasses.text.tertiary}`} />
                        <p className={`text-xs font-mono uppercase transition-colors ${themeClasses.text.tertiary}`}>
                          VISTA_PREVIA_NO_DISPONIBLE
                        </p>
                        <button
                          onClick={() => handleDownload(previewDocument)}
                          className={`mt-3 px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase transition-all cursor-pointer active:scale-[0.95] border focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 ${
                            theme === 'dark'
                              ? 'bg-[#00ff88] text-[#0a0a0a] border-[#00ff88] hover:bg-[#00ff88]/80'
                              : 'bg-[#0066cc] text-white border-[#0066cc] hover:bg-[#0066cc]/80'
                          }`}
                        >
                          <Download size={14} className="inline mr-2" />
                          DESCARGAR
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Eye size={48} className={`mx-auto mb-2 ${themeClasses.text.tertiary} opacity-50`} />
                  <p className={`text-xs font-mono uppercase transition-colors ${themeClasses.text.tertiary}`}>
                    SELECCIONA_UNA_EVIDENCIA_PARA_VISUALIZAR
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceModal;
