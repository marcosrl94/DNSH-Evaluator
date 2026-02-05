import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Upload, FileText, Plus, X, CheckCircle, AlertCircle, Building2, MapPin, Briefcase, Download, FileSpreadsheet, Trash2, Edit, List, Search, Filter, Archive, ArchiveRestore, CheckSquare, Square } from 'lucide-react';
import { Operation, Asset, EUAssetType, Client, DnshObjective, EvidenceType, EvidenceDocument } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { getAllClients, createClient, createOperation, getAllOperations, getActiveOperations, updateOperation, deleteOperation, archiveOperation, dataStore } from '../services/dataManagement';
import { logger } from '../utils/logger';
import { generateGeographicAttributes } from '../utils/geoCalculations';
import { processDocument, createEvidenceFromProcessed, ProcessedDocumentData } from '../services/documentProcessor';

interface DealFormData {
  // Cliente/Compañía
  clientId: string;
  clientName: string;
  clientCountry?: string;
  clientSector?: string;
  createNewClient: boolean;
  
  // Deal/Operación
  dealName: string;
  sectorNACE: string;
  country: string;
  capex: number;
  dealPrice?: number;
  expectedReturn?: number;
  substantialContributionId: DnshObjective | 'N/A';
  
  // Assets
  assets: AssetFormData[];
  
  // Documentos opcionales
  evidenceDocuments: EvidenceFormData[];
}

interface AssetFormData {
  name: string;
  assetType: EUAssetType;
  lat: number;
  lng: number;
  exposedValue: number;
  yearBuilt?: number;
  capacity?: number;
  capacityUnit?: string;
  // Estos campos se calculan automáticamente
  elevationMeters?: number;
  distanceToCoastKm?: number;
}

interface EvidenceFormData {
  name: string;
  type: EvidenceType;
  description?: string;
  file?: File;
}

const DealManagement: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [viewMode, setViewMode] = useState<'create' | 'manage'>('create');
  const [mode, setMode] = useState<'individual' | 'bulk'>('individual');
  const [clients, setClients] = useState<Client[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showArchived, setShowArchived] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'archive' | 'delete' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceFileInputRef = useRef<HTMLInputElement>(null);
  const [processingDocuments, setProcessingDocuments] = useState<Set<number>>(new Set());
  const [processedData, setProcessedData] = useState<Record<number, ProcessedDocumentData>>({});
  
  const [formData, setFormData] = useState<DealFormData>({
    clientId: '',
    clientName: '',
    clientCountry: '',
    clientSector: '',
    createNewClient: false,
    dealName: '',
    sectorNACE: '',
    country: '',
    capex: 0,
    dealPrice: undefined,
    expectedReturn: undefined,
    substantialContributionId: DnshObjective.MITIGATION,
    assets: [{ name: '', assetType: EUAssetType.SOLAR_PV, lat: 0, lng: 0, exposedValue: 0 }],
    evidenceDocuments: []
  });

  // Cargar clientes y operaciones al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedClients, loadedOps] = await Promise.all([
          getAllClients(),
          showArchived ? getAllOperations() : getActiveOperations()
        ]);
        setClients(loadedClients);
        setOperations(loadedOps);
      } catch (error) {
        logger.error('Error loading data:', error);
      }
    };
    loadData();
  }, [showArchived]);

  // Subscribe to data store changes
  useEffect(() => {
    const unsubscribe = dataStore.subscribe(async () => {
      try {
        const ops = showArchived ? await getAllOperations() : await getActiveOperations();
        setOperations(ops);
      } catch (error) {
        logger.error('Error loading operations:', error);
      }
    });
    return unsubscribe;
  }, [showArchived]);

  const handleClientChange = (value: string) => {
    if (value === '__new__') {
      setFormData(prev => ({ ...prev, createNewClient: true, clientId: '', clientName: '' }));
    } else {
      const client = clients.find(c => c.id === value);
      setFormData(prev => ({
        ...prev,
        createNewClient: false,
        clientId: value,
        clientName: client?.name || '',
        clientCountry: client?.country || '',
        clientSector: client?.sector || ''
      }));
    }
  };

  const handleAddAsset = () => {
    setFormData(prev => ({
      ...prev,
      assets: [...prev.assets, { name: '', assetType: EUAssetType.SOLAR_PV, lat: 0, lng: 0, exposedValue: 0 }]
    }));
  };

  const handleRemoveAsset = (index: number) => {
    setFormData(prev => ({
      ...prev,
      assets: prev.assets.filter((_, i) => i !== index)
    }));
  };

  const handleAssetChange = async (index: number, field: keyof AssetFormData, value: any) => {
    const updatedAssets = formData.assets.map((asset, i) => 
      i === index ? { ...asset, [field]: value } : asset
    );
    
    setFormData(prev => ({
      ...prev,
      assets: updatedAssets
    }));

    // Si se actualizaron lat o lng, calcular automáticamente elevación y distancia a costa
    if ((field === 'lat' || field === 'lng') && updatedAssets[index]) {
      const asset = updatedAssets[index];
      if (asset.lat && asset.lng && asset.lat !== 0 && asset.lng !== 0) {
        try {
          const geoAttrs = await generateGeographicAttributes(asset.lat, asset.lng);
          setFormData(prev => ({
            ...prev,
            assets: prev.assets.map((a, i) => 
              i === index 
                ? { ...a, elevationMeters: geoAttrs.elevationMeters, distanceToCoastKm: geoAttrs.distanceToCoastKm }
                : a
            )
          }));
        } catch (error) {
          logger.warn('Error calculating geographic attributes:', error);
          // No mostrar error al usuario, simplemente no calcular
        }
      }
    }
  };

  const handleAddEvidence = () => {
    setFormData(prev => ({
      ...prev,
      evidenceDocuments: [...prev.evidenceDocuments, { name: '', type: EvidenceType.OTHER }]
    }));
  };

  const handleRemoveEvidence = (index: number) => {
    setFormData(prev => ({
      ...prev,
      evidenceDocuments: prev.evidenceDocuments.filter((_, i) => i !== index)
    }));
  };

  const handleEvidenceChange = (index: number, field: keyof EvidenceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      evidenceDocuments: prev.evidenceDocuments.map((ev, i) => 
        i === index ? { ...ev, [field]: value } : ev
      )
    }));
  };

  const handleEvidenceFileUpload = async (index: number, file: File) => {
    if (!file) return;

    // Update evidence with file
    handleEvidenceChange(index, 'file', file);
    handleEvidenceChange(index, 'name', file.name);

    // Process document automatically
    setProcessingDocuments(prev => new Set(prev).add(index));
    
    try {
      const processed = await processDocument(file, {
        operationName: formData.dealName,
        assets: formData.assets.map(a => ({ id: '', name: a.name })),
        sectorNACE: formData.sectorNACE
      });

      // Store processed data
      setProcessedData(prev => ({ ...prev, [index]: processed }));

      // Auto-fill evidence fields from processed data
      if (processed.documentType) {
        handleEvidenceChange(index, 'type', processed.documentType);
      }
      if (processed.description) {
        handleEvidenceChange(index, 'description', processed.description);
      }
    } catch (error) {
      logger.error('Error processing document:', error);
    } finally {
      setProcessingDocuments(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const validateForm = (): string | null => {
    if (!formData.dealName.trim()) {
      return 'El nombre del deal es requerido';
    }
    
    if (formData.createNewClient && !formData.clientName.trim()) {
      return 'El nombre del cliente es requerido cuando se crea uno nuevo';
    }
    
    if (!formData.createNewClient && !formData.clientId) {
      return 'Debe seleccionar o crear un cliente';
    }
    
    if (!formData.sectorNACE.trim()) {
      return 'El sector NACE es requerido';
    }
    
    if (!formData.country.trim()) {
      return 'El país es requerido';
    }
    
    if (formData.capex <= 0) {
      return 'El CAPEX debe ser mayor a 0';
    }
    
    if (formData.assets.length === 0) {
      return 'Debe agregar al menos un asset';
    }
    
    for (let i = 0; i < formData.assets.length; i++) {
      const asset = formData.assets[i];
      if (!asset.name.trim()) {
        return `El nombre del asset ${i + 1} es requerido`;
      }
      if (asset.lat === 0 && asset.lng === 0) {
        return `La localización del asset ${i + 1} es requerida`;
      }
      if (asset.exposedValue <= 0) {
        return `El valor expuesto del asset ${i + 1} debe ser mayor a 0`;
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    
    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Crear o obtener cliente
      let clientId = formData.clientId;
      if (formData.createNewClient) {
        const newClient = await createClient({
          name: formData.clientName,
          country: formData.clientCountry || undefined,
          sector: formData.clientSector || undefined
        });
        clientId = newClient.id;
        // Actualizar lista de clientes
        const updatedClients = await getAllClients();
        setClients(updatedClients);
      }
      
      // 2. Crear assets con cálculo automático de atributos geográficos
      const createdAssets: Asset[] = await Promise.all(
        formData.assets.map(async (assetData, index) => {
          // Calcular atributos geográficos si no están presentes
          let elevationMeters = assetData.elevationMeters;
          let distanceToCoastKm = assetData.distanceToCoastKm;
          
          if (!elevationMeters || !distanceToCoastKm) {
            try {
              const geoAttrs = await generateGeographicAttributes(assetData.lat, assetData.lng);
              elevationMeters = geoAttrs.elevationMeters;
              distanceToCoastKm = geoAttrs.distanceToCoastKm;
            } catch (error) {
              logger.warn(`Error calculating geo attributes for asset ${index}:`, error);
            }
          }
          
          return {
            id: `asset-${Date.now()}-${index}`,
            operationId: '', // Se asignará después
            name: assetData.name,
            assetType: assetData.assetType,
            lat: assetData.lat,
            lng: assetData.lng,
            exposedValue: assetData.exposedValue,
            attributes: {
              elevationMeters,
              distanceToCoastKm,
              yearBuilt: assetData.yearBuilt,
              capacity: assetData.capacity,
              capacityUnit: assetData.capacityUnit
            }
          };
        })
      );
      
      // 3. Procesar documentos de evidencia
      const evidenceDocuments: Omit<EvidenceDocument, 'id' | 'uploadDate'>[] = await Promise.all(
        formData.evidenceDocuments.map(async (evidenceForm) => {
          if (evidenceForm.file) {
            // Si ya tenemos datos procesados, usarlos; si no, procesar ahora
            const processed = processedData[formData.evidenceDocuments.indexOf(evidenceForm)] || 
              await processDocument(evidenceForm.file, {
                operationName: formData.dealName,
                assets: createdAssets.map(a => ({ id: a.id, name: a.name })),
                sectorNACE: formData.sectorNACE
              });
            
            // Crear EvidenceDocument desde datos procesados
            return createEvidenceFromProcessed(
              processed,
              '', // operationId se asignará después de crear la operación
              undefined, // assetId
              'Current User', // uploadedBy
              URL.createObjectURL(evidenceForm.file) // fileUrl temporal
            );
          } else {
            // Si no hay archivo, crear documento básico desde el formulario
            return {
              operationId: '',
              name: evidenceForm.name,
              type: evidenceForm.type,
              description: evidenceForm.description,
              uploadedBy: 'Current User',
              fileUrl: undefined,
              documentDate: undefined,
              author: undefined,
              language: undefined,
              relatedObjective: undefined,
              tags: undefined
            };
          }
        })
      );

      // 4. Crear operación usando la función centralizada
      const operationData: Partial<Operation> = {
        clientId,
        name: formData.dealName,
        sectorNACE: formData.sectorNACE,
        country: formData.country,
        capex: formData.capex,
        dealPrice: formData.dealPrice,
        expectedReturn: formData.expectedReturn,
        substantialContributionId: formData.substantialContributionId === 'N/A' ? DnshObjective.MITIGATION : formData.substantialContributionId,
        status: 'Draft',
        assets: createdAssets,
        evidenceDocuments: evidenceDocuments.map((ev, idx) => ({
          ...ev,
          id: `ev-${Date.now()}-${idx}`,
          uploadDate: new Date().toISOString()
        }))
      };
      
      await createOperation(operationData);
      
      setSubmitSuccess(`Deal "${formData.dealName}" creado exitosamente con ${formData.assets.length} asset(s)`);
      
      // Resetear formulario
      setFormData({
        clientId: '',
        clientName: '',
        clientCountry: '',
        clientSector: '',
        createNewClient: false,
        dealName: '',
        sectorNACE: '',
        country: '',
        capex: 0,
        dealPrice: undefined,
        expectedReturn: undefined,
        substantialContributionId: 'N/A' as DnshObjective | 'N/A',
        assets: [{ name: '', assetType: EUAssetType.SOLAR_PV, lat: 0, lng: 0, exposedValue: 0 }],
        evidenceDocuments: []
      });
      
      // Recargar operaciones para actualizar la vista
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      logger.error('Error creating deal:', error);
      setSubmitError(error.message || 'Error al crear el deal. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async (file: File) => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);
    
    try {
      const text = await file.text();
      // Filtrar líneas de comentarios (empiezan con #)
      const lines = text.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validar headers mínimos requeridos
      // Nota: elevation_meters y distance_to_coast_km son opcionales (se calculan automáticamente)
      const requiredHeaders = ['deal_name', 'client_name', 'asset_name', 'asset_type', 'lat', 'lng', 'exposed_value'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`);
      }
      
      // Parsear CSV
      const deals: Map<string, { deal: Partial<DealFormData>; assets: AssetFormData[] }> = new Map();
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        const dealName = row['deal_name'];
        if (!dealName) continue;
        
        if (!deals.has(dealName)) {
          deals.set(dealName, {
            deal: {
              dealName,
              clientName: row['client_name'] || '',
              clientCountry: row['client_country'] || '',
              clientSector: row['client_sector'] || '',
              createNewClient: true,
              sectorNACE: row['sector_nace'] || '',
              country: row['country'] || '',
              capex: parseFloat(row['capex']) || 0,
              dealPrice: row['deal_price'] ? parseFloat(row['deal_price']) : undefined,
              expectedReturn: row['expected_return'] ? parseFloat(row['expected_return']) : undefined,
              substantialContributionId: (row['substantial_contribution'] === 'N/A' || !row['substantial_contribution']) 
                ? ('N/A' as DnshObjective | 'N/A')
                : ((row['substantial_contribution'] as DnshObjective) || ('N/A' as DnshObjective | 'N/A')),
              assets: [],
              evidenceDocuments: []
            },
            assets: []
          });
        }
        
        const deal = deals.get(dealName)!;
        deal.assets.push({
          name: row['asset_name'],
          assetType: (row['asset_type'] as EUAssetType) || EUAssetType.SOLAR_PV,
          lat: parseFloat(row['lat']) || 0,
          lng: parseFloat(row['lng']) || 0,
          exposedValue: parseFloat(row['exposed_value']) || 0,
          // elevationMeters y distanceToCoastKm se calcularán automáticamente si no están en el CSV
          elevationMeters: row['elevation_meters'] ? parseFloat(row['elevation_meters']) : undefined,
          distanceToCoastKm: row['distance_to_coast_km'] ? parseFloat(row['distance_to_coast_km']) : undefined,
          yearBuilt: row['year_built'] ? parseInt(row['year_built']) : undefined,
          capacity: row['capacity'] ? parseFloat(row['capacity']) : undefined,
          capacityUnit: row['capacity_unit'] || undefined
        });
      }
      
      // Crear deals
      let successCount = 0;
      let errorCount = 0;
      
      for (const [dealName, dealData] of deals) {
        try {
          // Crear cliente
          const client = await createClient({
            name: dealData.deal.clientName!,
            country: dealData.deal.clientCountry || undefined,
            sector: dealData.deal.clientSector || undefined
          });
          
          // Crear assets con cálculo automático de atributos geográficos
          const createdAssets: Asset[] = await Promise.all(
            dealData.assets.map(async (assetData, index) => {
              // Calcular atributos geográficos si no están presentes
              let elevationMeters = assetData.elevationMeters;
              let distanceToCoastKm = assetData.distanceToCoastKm;
              
              if (!elevationMeters || !distanceToCoastKm) {
                try {
                  const geoAttrs = await generateGeographicAttributes(assetData.lat, assetData.lng);
                  elevationMeters = geoAttrs.elevationMeters;
                  distanceToCoastKm = geoAttrs.distanceToCoastKm;
                } catch (error) {
                  logger.warn(`Error calculating geo attributes for asset ${index}:`, error);
                }
              }
              
              return {
                id: `asset-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 11)}`,
                operationId: '',
                name: assetData.name,
                assetType: assetData.assetType,
                lat: assetData.lat,
                lng: assetData.lng,
                exposedValue: assetData.exposedValue,
                attributes: {
                  elevationMeters,
                  distanceToCoastKm,
                  yearBuilt: assetData.yearBuilt,
                  capacity: assetData.capacity,
                  capacityUnit: assetData.capacityUnit
                }
              };
            })
          );
          
          // Crear operación usando la función centralizada
          const operationData: Partial<Operation> = {
            clientId: client.id,
            name: dealName,
            sectorNACE: dealData.deal.sectorNACE || '',
            country: dealData.deal.country || '',
            capex: dealData.deal.capex || 0,
            dealPrice: dealData.deal.dealPrice,
            expectedReturn: dealData.deal.expectedReturn,
            substantialContributionId: dealData.deal.substantialContributionId || ('N/A' as DnshObjective | 'N/A'),
            status: 'Draft',
            assets: createdAssets,
            evidenceDocuments: []
          };
          
          await createOperation(operationData);
          
          successCount++;
        } catch (error: any) {
          logger.error(`Error creating deal ${dealName}:`, error);
          errorCount++;
        }
      }
      
      setSubmitSuccess(`${successCount} deal(s) creado(s) exitosamente${errorCount > 0 ? `. ${errorCount} error(es)` : ''}`);
      
      // Recargar operaciones
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      logger.error('Error processing bulk upload:', error);
      setSubmitError(error.message || 'Error al procesar el archivo CSV');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'deal_name',
      'client_name',
      'client_country',
      'client_sector',
      'sector_nace',
      'country',
      'capex',
      'deal_price',
      'expected_return',
      'substantial_contribution',
      'asset_name',
      'asset_type',
      'lat',
      'lng',
      'exposed_value',
      'year_built',
      'capacity',
      'capacity_unit'
    ];
    
    const exampleRow = [
      'Solar Portfolio Spain',
      'Iberia Energy',
      'Spain',
      'Energy',
      'D.35.11',
      'Spain',
      '45000000',
      '42000000',
      '8.5',
      'Climate Change Mitigation',
      'Seville PV Plant A',
      'Solar PV',
      '37.3891',
      '-5.9845',
      '15000000',
      '2020',
      '50',
      'MW'
    ];
    
    // Nota: elevation_meters y distance_to_coast_km se calculan automáticamente desde lat/lng
    const csv = [
      '# Plantilla CSV para carga masiva de deals',
      '# NOTA: elevation_meters y distance_to_coast_km se calculan automáticamente desde lat/lng',
      '# No es necesario incluirlos en el CSV',
      headers.join(','),
      exampleRow.join(',')
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deal_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = async (operationId: string, newStatus: 'Draft' | 'Review' | 'Compliant' | 'Non-Compliant') => {
    try {
      const operation = operations.find(op => op.id === operationId);
      if (!operation) return;

      const updatedOperation: Operation = {
        ...operation,
        status: newStatus
      };

      await updateOperation(updatedOperation);
      setSubmitSuccess(`Estado del deal "${operation.name}" actualizado a ${newStatus}`);
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error: any) {
      logger.error('Error updating operation status:', error);
      setSubmitError(error.message || 'Error al actualizar el estado del deal');
      setTimeout(() => setSubmitError(null), 5000);
    }
  };

  const handleArchiveDeal = async (operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;

    const reason = window.prompt(`¿Por qué desea archivar el deal "${operation.name}"? (opcional):`);
    if (reason === null) return; // User cancelled

    setArchivingId(operationId);
    try {
      await archiveOperation(operationId, 'current-user', reason || undefined);
      setSubmitSuccess(`Deal "${operation.name}" archivado exitosamente. Se ha movido al histórico.`);
      setTimeout(() => setSubmitSuccess(null), 3000);
      // Reload operations
      const ops = showArchived ? await getAllOperations() : await getActiveOperations();
      setOperations(ops);
      // Remove from selection
      setSelectedDeals(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
    } catch (error: any) {
      logger.error('Error archiving operation:', error);
      setSubmitError(error.message || 'Error al archivar el deal');
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setArchivingId(null);
    }
  };

  const handleDeleteDeal = async (operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;

    if (!window.confirm(`¿Está seguro de que desea eliminar permanentemente el deal "${operation.name}"?\n\nEsta acción NO se puede deshacer y eliminará todos los datos asociados.`)) {
      return;
    }

    setDeletingId(operationId);
    try {
      await deleteOperation(operationId);
      setSubmitSuccess(`Deal "${operation.name}" eliminado permanentemente`);
      setTimeout(() => setSubmitSuccess(null), 3000);
      // Reload operations
      const ops = showArchived ? await getAllOperations() : await getActiveOperations();
      setOperations(ops);
      // Remove from selection
      setSelectedDeals(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
    } catch (error: any) {
      logger.error('Error deleting operation:', error);
      setSubmitError(error.message || 'Error al eliminar el deal');
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleSelect = (operationId: string) => {
    setSelectedDeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(operationId)) {
        newSet.delete(operationId);
      } else {
        newSet.add(operationId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDeals.size === filteredOperations.length) {
      setSelectedDeals(new Set());
    } else {
      setSelectedDeals(new Set(filteredOperations.map(op => op.id)));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedDeals.size === 0) return;
    
    const reason = window.prompt(`¿Por qué desea archivar ${selectedDeals.size} deal(s)? (opcional):`);
    if (reason === null) return;

    setBulkAction('archive');
    try {
      const promises = Array.from(selectedDeals).map(id => 
        archiveOperation(id, 'current-user', reason || undefined)
      );
      await Promise.all(promises);
      setSubmitSuccess(`${selectedDeals.size} deal(s) archivado(s) exitosamente`);
      setTimeout(() => setSubmitSuccess(null), 3000);
      // Reload operations
      const ops = showArchived ? await getAllOperations() : await getActiveOperations();
      setOperations(ops);
      setSelectedDeals(new Set());
    } catch (error: any) {
      logger.error('Error archiving operations:', error);
      setSubmitError(error.message || 'Error al archivar los deals');
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setBulkAction(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDeals.size === 0) return;
    
    if (!window.confirm(`¿Está seguro de que desea eliminar permanentemente ${selectedDeals.size} deal(s)?\n\nEsta acción NO se puede deshacer y eliminará todos los datos asociados.`)) {
      return;
    }

    setBulkAction('delete');
    try {
      const promises = Array.from(selectedDeals).map(id => deleteOperation(id));
      await Promise.all(promises);
      setSubmitSuccess(`${selectedDeals.size} deal(s) eliminado(s) permanentemente`);
      setTimeout(() => setSubmitSuccess(null), 3000);
      // Reload operations
      const ops = showArchived ? await getAllOperations() : await getActiveOperations();
      setOperations(ops);
      setSelectedDeals(new Set());
    } catch (error: any) {
      logger.error('Error deleting operations:', error);
      setSubmitError(error.message || 'Error al eliminar los deals');
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setBulkAction(null);
    }
  };

  const filteredOperations = useMemo(() => {
    return operations.filter(op => {
      // Filter by archived status
      const matchesArchived = showArchived ? op.archived === true : op.archived !== true;
      // Filter by text search
      const matchesText = op.name?.toLowerCase().includes(filterText.toLowerCase()) || 
                         op.sectorNACE?.toLowerCase().includes(filterText.toLowerCase());
      // Filter by status
      const matchesStatus = statusFilter === 'All' || op.status === statusFilter;
      return matchesArchived && matchesText && matchesStatus;
    });
  }, [operations, filterText, statusFilter, showArchived]);

  return (
    <div className={`p-8 space-y-6 max-w-7xl mx-auto transition-colors ${themeClasses.bg.primary}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
          GESTIÓN_DE_DEALS
        </h1>
        <p className={`font-mono uppercase text-xs tracking-wider transition-colors ${themeClasses.text.tertiary}`}>
          CREAR_Y_GESTIONAR_OPERACIONES
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className={`flex items-center space-x-4 p-4 rounded-xl border transition-colors mb-6 ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
        <button
          type="button"
          onClick={() => setViewMode('create')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all font-mono uppercase tracking-wider text-xs ${
            viewMode === 'create'
              ? 'bg-[#00ff88] text-[#0a0a0a]'
              : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} hover:${themeClasses.bg.hover}`
          }`}
        >
          <Plus size={16} className="inline mr-2" />
          CREAR_DEAL
        </button>
        <button
          type="button"
          onClick={() => setViewMode('manage')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all font-mono uppercase tracking-wider text-xs ${
            viewMode === 'manage'
              ? 'bg-[#00ff88] text-[#0a0a0a]'
              : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} hover:${themeClasses.bg.hover}`
          }`}
        >
          <List size={16} className="inline mr-2" />
          GESTIONAR_DEALS
        </button>
      </div>

      {/* Mode Toggle (only show in create mode) */}
      {viewMode === 'create' && (
        <div className={`flex items-center space-x-4 p-4 rounded-xl border transition-colors mb-6 ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
          <button
            type="button"
            onClick={() => setMode('individual')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all font-mono uppercase tracking-wider text-xs ${
              mode === 'individual'
                ? 'bg-[#00ff88] text-[#0a0a0a]'
                : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} hover:${themeClasses.bg.hover}`
            }`}
          >
            <Plus size={16} className="inline mr-2" />
            CARGA_INDIVIDUAL
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all font-mono uppercase tracking-wider text-xs ${
              mode === 'bulk'
                ? 'bg-[#00ff88] text-[#0a0a0a]'
                : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} hover:${themeClasses.bg.hover}`
            }`}
          >
            <Upload size={16} className="inline mr-2" />
            CARGA_MASIVA_CSV
          </button>
        </div>
      )}

      {/* Success/Error Messages */}
      {submitSuccess && (
        <div className={`p-4 rounded-lg border bg-[#00ff88]/10 border-[#00ff88]/30 flex items-center space-x-2 ${themeClasses.text.primary}`}>
          <CheckCircle size={20} className="text-[#00ff88]" />
          <span className="font-mono text-sm">{submitSuccess}</span>
        </div>
      )}
      
      {submitError && (
        <div className={`p-4 rounded-lg border bg-red-500/10 border-red-500/30 flex items-center space-x-2 ${themeClasses.text.primary}`}>
          <AlertCircle size={20} className="text-red-500" />
          <span className="font-mono text-sm">{submitError}</span>
        </div>
      )}

      {/* Individual Form - Only show in create mode */}
      {viewMode === 'create' && mode === 'individual' && (
        <form onSubmit={handleSubmit} className={`space-y-6 ${themeClasses.bg.secondary} p-6 rounded-xl border ${themeClasses.border.default}`}>
          {/* Cliente */}
          <div className="space-y-4">
            <h2 className={`text-lg font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary} flex items-center`}>
              <Building2 size={20} className="mr-2 text-[#00ff88]" />
              CLIENTE/COMPAÑÍA
            </h2>
            
            {!formData.createNewClient ? (
              <div>
                <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  SELECCIONAR_CLIENTE
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                >
                  <option value="">-- SELECCIONAR --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                  <option value="__new__">+ CREAR NUEVO CLIENTE</option>
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, createNewClient: false, clientId: '', clientName: '' }))}
                  className={`text-xs font-mono uppercase tracking-wider ${themeClasses.text.tertiary} hover:${themeClasses.text.secondary}`}
                >
                  ← VOLVER A SELECCIONAR CLIENTE
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                      NOMBRE_CLIENTE *
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                      className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                      PAÍS
                    </label>
                    <input
                      type="text"
                      value={formData.clientCountry}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientCountry: e.target.value }))}
                      className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                      SECTOR
                    </label>
                    <input
                      type="text"
                      value={formData.clientSector}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientSector: e.target.value }))}
                      className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deal Info */}
          <div className="space-y-4">
            <h2 className={`text-lg font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary} flex items-center`}>
              <Briefcase size={20} className="mr-2 text-[#00ff88]" />
              INFORMACIÓN_DEL_DEAL
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  NOMBRE_DEAL/PORTFOLIO *
                </label>
                <input
                  type="text"
                  value={formData.dealName}
                  onChange={(e) => setFormData(prev => ({ ...prev, dealName: e.target.value }))}
                  className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  SECTOR_NACE *
                </label>
                <input
                  type="text"
                  value={formData.sectorNACE}
                  onChange={(e) => setFormData(prev => ({ ...prev, sectorNACE: e.target.value }))}
                  placeholder="Ej: D.35.11"
                  className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  PAÍS *
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  CAPEX (€) *
                </label>
                <input
                  type="number"
                  value={formData.capex || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, capex: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                  required
                  min="0"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  PRECIO_DEAL (€)
                </label>
                <input
                  type="number"
                  value={formData.dealPrice || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, dealPrice: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                  min="0"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  RETORNO_ESPERADO (%)
                </label>
                <input
                  type="number"
                  value={formData.expectedReturn || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedReturn: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                  step="0.1"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  CONTRIBUCIÓN_SUSTANCIAL
                </label>
                <select
                  value={formData.substantialContributionId}
                  onChange={(e) => setFormData(prev => ({ ...prev, substantialContributionId: e.target.value as DnshObjective | 'N/A' }))}
                  className={`w-full px-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                >
                  <option value="N/A">N/A - No aplica</option>
                  {Object.values(DnshObjective).map(obj => (
                    <option key={obj} value={obj}>{obj}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Assets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary} flex items-center`}>
                <MapPin size={20} className="mr-2 text-[#00ff88]" />
                ASSETS ({formData.assets.length})
              </h2>
              <button
                type="button"
                onClick={handleAddAsset}
                className={`px-3 py-1.5 bg-[#00ff88] text-[#0a0a0a] rounded-lg font-medium hover:bg-[#00ff88]/80 transition-colors font-mono uppercase tracking-wider text-xs flex items-center`}
              >
                <Plus size={14} className="mr-1" />
                AGREGAR_ASSET
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.assets.map((asset, index) => (
                <div key={index} className={`p-4 rounded-lg border ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-mono uppercase tracking-wider text-sm ${themeClasses.text.primary}`}>
                      ASSET {index + 1}
                    </span>
                    {formData.assets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset(index)}
                        className={`p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                        NOMBRE_ASSET *
                      </label>
                      <input
                        type="text"
                        value={asset.name}
                        onChange={(e) => handleAssetChange(index, 'name', e.target.value)}
                        className={`w-full px-3 py-1.5 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                        TIPOLOGÍA *
                      </label>
                      <select
                        value={asset.assetType}
                        onChange={(e) => handleAssetChange(index, 'assetType', e.target.value as EUAssetType)}
                        className={`w-full px-3 py-1.5 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                        required
                      >
                        {Object.values(EUAssetType).map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                        LATITUD *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={asset.lat || ''}
                        onChange={(e) => handleAssetChange(index, 'lat', parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-1.5 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                        LONGITUD *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={asset.lng || ''}
                        onChange={(e) => handleAssetChange(index, 'lng', parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-1.5 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                        VALOR_EXPUESTO (€) *
                      </label>
                      <input
                        type="number"
                        value={asset.exposedValue || ''}
                        onChange={(e) => handleAssetChange(index, 'exposedValue', parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-1.5 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                        required
                        min="0"
                      />
                    </div>
                    {(asset.elevationMeters !== undefined || asset.distanceToCoastKm !== undefined) && (
                      <div className="col-span-full">
                        <div className={`p-2 rounded-lg border ${themeClasses.bg.tertiary} ${themeClasses.border.default} flex items-center space-x-2`}>
                          <CheckCircle size={14} className="text-[#00ff88] flex-shrink-0" />
                          <div className="flex-1">
                            <p className={`text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                              ATRIBUTOS_GEOGRÁFICOS_CALCULADOS_AUTOMÁTICAMENTE:
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              {asset.elevationMeters !== undefined && (
                                <span className={`text-xs font-mono ${themeClasses.text.primary}`}>
                                  Elevación: <strong>{asset.elevationMeters}m</strong>
                                </span>
                              )}
                              {asset.distanceToCoastKm !== undefined && (
                                <span className={`text-xs font-mono ${themeClasses.text.primary}`}>
                                  Dist. Costa: <strong>{asset.distanceToCoastKm.toFixed(1)}km</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className={`block text-xs font-medium mb-1 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                        AÑO_CONSTRUCCIÓN
                      </label>
                      <input
                        type="number"
                        value={asset.yearBuilt || ''}
                        onChange={(e) => handleAssetChange(index, 'yearBuilt', e.target.value ? parseInt(e.target.value) : undefined)}
                        className={`w-full px-3 py-1.5 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs font-medium mb-1 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                          CAPACIDAD
                        </label>
                        <input
                          type="number"
                          value={asset.capacity || ''}
                          onChange={(e) => handleAssetChange(index, 'capacity', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className={`w-full px-3 py-1.5 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                          UNIDAD
                        </label>
                        <input
                          type="text"
                          value={asset.capacityUnit || ''}
                          onChange={(e) => handleAssetChange(index, 'capacityUnit', e.target.value || undefined)}
                          placeholder="MW, m²..."
                          className={`w-full px-3 py-1.5 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary} flex items-center`}>
                <FileText size={20} className="mr-2 text-[#00ff88]" />
                SOPORTES_DOCUMENTALES ({formData.evidenceDocuments.length})
              </h2>
              <button
                type="button"
                onClick={handleAddEvidence}
                className={`px-3 py-1.5 bg-[#00ff88] text-[#0a0a0a] rounded-lg font-medium hover:bg-[#00ff88]/80 transition-colors font-mono uppercase tracking-wider text-xs flex items-center`}
              >
                <Plus size={14} className="mr-1" />
                AGREGAR_DOCUMENTO
              </button>
            </div>
            
            <div className={`p-4 rounded-lg border ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
              <p className={`text-sm font-mono ${themeClasses.text.tertiary} mb-4`}>
                Los documentos cargados serán procesados automáticamente para extraer información relevante para la evaluación DNSH y minimizar el trabajo manual.
              </p>
              
              <div className="space-y-4">
                {formData.evidenceDocuments.map((evidence, index) => {
                  const isProcessing = processingDocuments.has(index);
                  const processed = processedData[index];
                  
                  return (
                    <div key={index} className={`p-4 rounded-lg border ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`font-mono uppercase tracking-wider text-sm ${themeClasses.text.primary}`}>
                          DOCUMENTO {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(index)}
                          className={`p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* File Upload */}
                        <div className="md:col-span-2">
                          <label className={`block text-xs font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                            ARCHIVO (PDF, DOCX, XLSX, imágenes) *
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              ref={index === 0 ? evidenceFileInputRef : undefined}
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleEvidenceFileUpload(index, file);
                                }
                              }}
                              className="hidden"
                              id={`evidence-file-${index}`}
                            />
                            <label
                              htmlFor={`evidence-file-${index}`}
                              className={`flex-1 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors flex items-center justify-center ${
                                theme === 'dark'
                                  ? 'border-[#1a1a1a] hover:border-[#00ff88]/30'
                                  : 'border-gray-300 hover:border-[#0066cc]/30'
                              }`}
                            >
                              {evidence.file ? (
                                <span className={`text-sm font-mono ${themeClasses.text.primary}`}>
                                  {evidence.file.name}
                                </span>
                              ) : (
                                <span className={`text-sm font-mono ${themeClasses.text.tertiary} flex items-center`}>
                                  <Upload size={16} className="mr-2" />
                                  SELECCIONAR_ARCHIVO
                                </span>
                              )}
                            </label>
                            {isProcessing && (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00ff88]"></div>
                            )}
                          </div>
                        </div>

                        {/* Document Type */}
                        <div>
                          <label className={`block text-xs font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                            TIPO_DOCUMENTO *
                          </label>
                          <select
                            value={evidence.type}
                            onChange={(e) => handleEvidenceChange(index, 'type', e.target.value as EvidenceType)}
                            className={`w-full px-3 py-2 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                            required
                          >
                            {Object.values(EvidenceType).map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {processed?.documentType && (
                            <p className={`text-xs mt-1 font-mono ${themeClasses.text.tertiary}`}>
                              Detectado: {processed.documentType}
                            </p>
                          )}
                        </div>

                        {/* Document Name */}
                        <div>
                          <label className={`block text-xs font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                            NOMBRE *
                          </label>
                          <input
                            type="text"
                            value={evidence.name}
                            onChange={(e) => handleEvidenceChange(index, 'name', e.target.value)}
                            className={`w-full px-3 py-2 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                            placeholder="Nombre del documento"
                            required
                          />
                          {processed?.title && (
                            <p className={`text-xs mt-1 font-mono ${themeClasses.text.tertiary}`}>
                              Sugerido: {processed.title}
                            </p>
                          )}
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                          <label className={`block text-xs font-medium mb-2 font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                            DESCRIPCIÓN
                          </label>
                          <textarea
                            value={evidence.description || ''}
                            onChange={(e) => handleEvidenceChange(index, 'description', e.target.value)}
                            className={`w-full px-3 py-2 text-sm ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono`}
                            rows={2}
                            placeholder="Descripción del documento..."
                          />
                          {processed?.description && (
                            <p className={`text-xs mt-1 font-mono ${themeClasses.text.tertiary}`}>
                              Extraído: {processed.description.substring(0, 100)}...
                            </p>
                          )}
                        </div>

                        {/* Processed Information Display */}
                        {processed && (
                          <div className="md:col-span-2">
                            <div className={`p-3 rounded-lg border ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
                              <p className={`text-xs font-mono uppercase tracking-wider mb-2 ${themeClasses.text.primary}`}>
                                INFORMACIÓN_EXTRAÍDA_AUTOMÁTICAMENTE:
                              </p>
                              {processed.relatedObjectives && processed.relatedObjectives.length > 0 && (
                                <div className="mb-2">
                                  <span className={`text-xs font-mono ${themeClasses.text.secondary}`}>Objetivos DNSH relacionados: </span>
                                  <span className={`text-xs font-mono ${themeClasses.text.primary}`}>
                                    {processed.relatedObjectives.join(', ')}
                                  </span>
                                </div>
                              )}
                              {processed.keyFindings && processed.keyFindings.length > 0 && (
                                <div className="mb-2">
                                  <span className={`text-xs font-mono ${themeClasses.text.secondary}`}>Hallazgos clave: </span>
                                  <span className={`text-xs font-mono ${themeClasses.text.primary}`}>
                                    {processed.keyFindings.slice(0, 3).join('; ')}
                                  </span>
                                </div>
                              )}
                              {processed.confidence && (
                                <div className="text-xs font-mono text-[#00ff88]">
                                  Confianza: {Math.round(processed.confidence.metadata * 100)}%
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {formData.evidenceDocuments.length === 0 && (
                  <div className={`p-8 border-2 border-dashed rounded-lg text-center ${themeClasses.border.default}`}>
                    <FileText size={48} className={`mx-auto mb-4 ${themeClasses.text.tertiary}`} />
                    <p className={`text-sm font-mono uppercase tracking-wider mb-2 ${themeClasses.text.secondary}`}>
                      NO_HAY_DOCUMENTOS_CARGADOS
                    </p>
                    <p className={`text-xs font-mono ${themeClasses.text.tertiary} mb-4`}>
                      Agrega documentos de soporte que serán procesados automáticamente para la evaluación DNSH
                    </p>
                    <button
                      type="button"
                      onClick={handleAddEvidence}
                      className={`px-4 py-2 bg-[#00ff88] text-[#0a0a0a] rounded-lg font-medium hover:bg-[#00ff88]/80 transition-colors font-mono uppercase tracking-wider text-xs`}
                    >
                      <Plus size={14} className="inline mr-2" />
                      AGREGAR_PRIMER_DOCUMENTO
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-[#1a1a1a]">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 bg-[#00ff88] text-[#0a0a0a] rounded-lg font-medium hover:bg-[#00ff88]/80 transition-all font-mono uppercase tracking-wider text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0a0a0a] mr-2"></div>
                  CREANDO...
                </>
              ) : (
                <>
                  <CheckCircle size={16} className="mr-2" />
                  CREAR_DEAL
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Bulk Upload - Only show in create mode */}
      {viewMode === 'create' && mode === 'bulk' && (
        <div className={`space-y-6 ${themeClasses.bg.secondary} p-6 rounded-xl border ${themeClasses.border.default}`}>
          <div>
            <h2 className={`text-lg font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary} flex items-center mb-4`}>
              <FileSpreadsheet size={20} className="mr-2 text-[#00ff88]" />
              CARGA_MASIVA_CSV
            </h2>
            <p className={`text-sm font-mono ${themeClasses.text.tertiary} mb-4`}>
              Sube un archivo CSV con la información de los deals. Descarga la plantilla para ver el formato requerido.
            </p>
            
            <div className="flex items-center space-x-4 mb-6">
              <button
                type="button"
                onClick={downloadTemplate}
                className={`px-4 py-2 ${themeClasses.bg.tertiary} ${themeClasses.border.default} border rounded-lg font-medium hover:${themeClasses.bg.hover} transition-colors font-mono uppercase tracking-wider text-xs flex items-center`}
              >
                <Download size={16} className="mr-2" />
                DESCARGAR_PLANTILLA
              </button>
            </div>
            
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file && file.type === 'text/csv') {
                  handleBulkUpload(file);
                }
              }}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                theme === 'dark' 
                  ? 'border-[#1a1a1a] hover:border-[#00ff88]/30' 
                  : 'border-gray-300 hover:border-[#0066cc]/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleBulkUpload(file);
                  }
                }}
                className="hidden"
              />
              <Upload size={48} className={`mx-auto mb-4 ${themeClasses.text.tertiary}`} />
              <p className={`font-mono uppercase tracking-wider mb-2 ${themeClasses.text.primary}`}>
                ARRASTRA_ARCHIVO_CSV_O_CLIC_PARA_SELECCIONAR
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-4 py-2 bg-[#00ff88] text-[#0a0a0a] rounded-lg font-medium hover:bg-[#00ff88]/80 transition-colors font-mono uppercase tracking-wider text-xs`}
              >
                SELECCIONAR_ARCHIVO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Deals View */}
      {viewMode === 'manage' && (
        <div className={`space-y-6 ${themeClasses.bg.secondary} p-6 rounded-xl border ${themeClasses.border.default}`}>
          <div>
            <h2 className={`text-lg font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary} flex items-center mb-4`}>
              <List size={20} className="mr-2 text-[#00ff88]" />
              GESTIONAR_DEALS_EXISTENTES
            </h2>
            
            {/* Filters and Actions */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6`}>
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.text.tertiary}`} size={20} />
                  <input 
                    type="text" 
                    placeholder="BUSCAR_POR_NOMBRE_SECTOR..." 
                    className={`w-full pl-10 pr-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg focus:ring-[#00ff88] focus:border-[#00ff88] text-sm ${themeClasses.input.text} ${themeClasses.input.placeholder} font-mono uppercase tracking-wider`}
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter size={20} className={themeClasses.text.tertiary} />
                  <select 
                    className={`${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg py-2 pl-2 pr-8 text-sm ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono uppercase tracking-wider`}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">TODOS_ESTADOS</option>
                    <option value="Draft">DRAFT</option>
                    <option value="Review">REVIEW</option>
                    <option value="Compliant">COMPLIANT</option>
                    <option value="Non-Compliant">NON_COMPLIANT</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowArchived(!showArchived);
                    setSelectedDeals(new Set());
                  }}
                  className={`px-3 py-2 rounded-lg border transition-colors font-mono uppercase tracking-wider text-xs flex items-center ${
                    showArchived
                      ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30'
                      : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} ${themeClasses.border.default} hover:${themeClasses.bg.hover}`
                  }`}
                >
                  {showArchived ? (
                    <>
                      <ArchiveRestore size={14} className="mr-1" />
                      MOSTRAR_ACTIVOS
                    </>
                  ) : (
                    <>
                      <Archive size={14} className="mr-1" />
                      MOSTRAR_ARCHIVADOS
                    </>
                  )}
                </button>
              </div>
              
              {/* Bulk Actions */}
              {selectedDeals.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                    {selectedDeals.size} SELECCIONADO(S)
                  </span>
                  <button
                    type="button"
                    onClick={handleBulkArchive}
                    disabled={bulkAction === 'archive'}
                    className={`px-3 py-1.5 rounded transition-colors flex items-center border font-mono uppercase tracking-wider text-xs focus:outline-none focus:ring-2 ${
                      bulkAction === 'archive'
                        ? 'opacity-50 cursor-not-allowed'
                        : 'text-[#00ff88] hover:text-[#00ff88]/80 bg-[#00ff88]/10 hover:bg-[#00ff88]/20 border-[#00ff88]/30 hover:border-[#00ff88]/50'
                    }`}
                  >
                    {bulkAction === 'archive' ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#00ff88] mr-1"></div>
                        ARCHIVANDO...
                      </>
                    ) : (
                      <>
                        <Archive size={14} className="mr-1" />
                        ARCHIVAR
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkAction === 'delete'}
                    className={`px-3 py-1.5 rounded transition-colors flex items-center border font-mono uppercase tracking-wider text-xs focus:outline-none focus:ring-2 ${
                      bulkAction === 'delete'
                        ? 'opacity-50 cursor-not-allowed'
                        : 'text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 border-red-500/30 hover:border-red-500/50'
                    }`}
                  >
                    {bulkAction === 'delete' ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500 mr-1"></div>
                        ELIMINANDO...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} className="mr-1" />
                        ELIMINAR
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className={`${themeClasses.bg.tertiary} rounded-xl border ${themeClasses.border.default} overflow-hidden`}>
              <table className={`min-w-full divide-y ${themeClasses.border.default}`}>
                <thead className={themeClasses.bg.secondary}>
                  <tr>
                    <th className="px-6 py-4 w-12">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className={`p-1 rounded transition-colors hover:${themeClasses.bg.hover}`}
                        title="Seleccionar todos"
                      >
                        {selectedDeals.size === filteredOperations.length && filteredOperations.length > 0 ? (
                          <CheckSquare size={18} className={themeClasses.text.primary} />
                        ) : (
                          <Square size={18} className={themeClasses.text.tertiary} />
                        )}
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>NOMBRE_DEAL</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>CLIENTE</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>SECTOR_NACE</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>CAPEX</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>ESTADO</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>ASSETS</th>
                    <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className={`${themeClasses.bg.tertiary} divide-y ${themeClasses.border.default}`}>
                  {filteredOperations.length > 0 ? filteredOperations.map((op) => {
                    const client = clients.find(c => c.id === op.clientId);
                    const isSelected = selectedDeals.has(op.id);
                    return (
                      <tr key={op.id} className={`hover:${themeClasses.bg.hover} transition-colors group ${isSelected ? themeClasses.bg.secondary : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(op.id)}
                            className={`p-1 rounded transition-colors hover:${themeClasses.bg.hover}`}
                          >
                            {isSelected ? (
                              <CheckSquare size={18} className="text-[#00ff88]" />
                            ) : (
                              <Square size={18} className={themeClasses.text.tertiary} />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm font-bold ${themeClasses.text.primary} font-mono uppercase tracking-wider`}>
                                {op.name.replace(/\s/g, '_')}
                              </span>
                              {op.archived && (
                                <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wider bg-gray-500/20 text-gray-400 border border-gray-500/30`}>
                                  ARCHIVADO
                                </span>
                              )}
                            </div>
                            <span className={`text-xs ${themeClasses.text.tertiary} font-mono`}>{op.id}</span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.text.secondary} font-mono`}>
                          {client?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`${themeClasses.bg.secondary} text-[#00a8ff] px-2 py-1 rounded text-xs font-medium border border-[#00a8ff]/30 font-mono uppercase`}>
                            {op.sectorNACE}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${themeClasses.text.primary} font-mono`}>
                          €{(op.capex / 1000000).toFixed(1)}M
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={op.status}
                            onChange={(e) => handleStatusChange(op.id, e.target.value as 'Draft' | 'Review' | 'Compliant' | 'Non-Compliant')}
                            className={`px-3 py-1 rounded text-xs font-bold font-mono uppercase tracking-wider border transition-colors ${
                              op.status === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30' :
                              op.status === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              op.status === 'Review' ? 'bg-[#ffb800]/20 text-[#ffb800] border-[#ffb800]/30' :
                              'bg-[#1a1a1a] text-[#666666] border-[#1a1a1a]'
                            } ${themeClasses.input.bg} ${themeClasses.input.border} focus:ring-[#00ff88] focus:border-[#00ff88] cursor-pointer`}
                          >
                            <option value="Draft">DRAFT</option>
                            <option value="Review">REVIEW</option>
                            <option value="Compliant">COMPLIANT</option>
                            <option value="Non-Compliant">NON_COMPLIANT</option>
                          </select>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.text.secondary} font-mono`}>
                          {op.assets.length} {op.assets.length === 1 ? 'ASSET' : 'ASSETS'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {!showArchived && (
                              <button
                                onClick={() => handleArchiveDeal(op.id)}
                                disabled={archivingId === op.id}
                                className={`px-3 py-1.5 rounded transition-colors flex items-center border font-mono uppercase tracking-wider text-xs focus:outline-none focus:ring-2 ${
                                  archivingId === op.id
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'text-[#00ff88] hover:text-[#00ff88]/80 bg-[#00ff88]/10 hover:bg-[#00ff88]/20 border-[#00ff88]/30 hover:border-[#00ff88]/50'
                                }`}
                                aria-label={`Archive deal ${op.name}`}
                                title="Archivar deal (mover al histórico)"
                              >
                                {archivingId === op.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#00ff88] mr-1"></div>
                                    ARCHIVANDO...
                                  </>
                                ) : (
                                  <>
                                    <Archive size={14} className="mr-1" />
                                    ARCHIVAR
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteDeal(op.id)}
                              disabled={deletingId === op.id}
                              className={`px-3 py-1.5 rounded transition-colors flex items-center border font-mono uppercase tracking-wider text-xs focus:outline-none focus:ring-2 ${
                                deletingId === op.id
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 border-red-500/30 hover:border-red-500/50'
                              }`}
                              aria-label={`Delete deal ${op.name}`}
                              title="Eliminar permanentemente"
                            >
                              {deletingId === op.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500 mr-1"></div>
                                  ELIMINANDO...
                                </>
                              ) : (
                                <>
                                  <Trash2 size={14} className="mr-1" />
                                  ELIMINAR
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className={`px-6 py-8 text-center ${themeClasses.text.tertiary} font-mono uppercase text-xs`}>
                        NO_HAY_DEALS_DISPONIBLES
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealManagement;
