/**
 * Centralized Data Management Service
 * Now uses Backend API with fallback to local storage
 * Ensures data consistency across all views and components
 */

import { Operation, Asset, AssetDnshEvaluation, Client, DnshObjective } from '../types';
import { DEMO_OPERATIONS, DEMO_CLIENTS } from '../constants';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { apiClient } from '../src/services/api';
import { logger } from '../utils/logger';
import { 
  transformApiOperation, 
  transformApiClient, 
  transformApiAsset,
  safeApiCall,
  validateApiResponse 
} from '../utils/apiTransformers';

// Feature flag: Use API or local storage
const USE_API = import.meta.env.VITE_USE_API === 'true' || import.meta.env.VITE_API_URL;

/**
 * Data Store - Fallback in-memory store when API is not available
 */
class DataStore {
  private operations: Operation[] = [...DEMO_OPERATIONS];
  private clients: Client[] = [...DEMO_CLIENTS];
  private listeners: Set<() => void> = new Set();

  getOperations(): Operation[] {
    return this.operations.map(op => ({ ...op }));
  }

  getOperation(id: string): Operation | undefined {
    const op = this.operations.find(o => o.id === id);
    return op ? { ...op } : undefined;
  }

  getClients(): Client[] {
    return this.clients.map(c => ({ ...c }));
  }

  getClient(id: string): Client | undefined {
    const client = this.clients.find(c => c.id === id);
    return client ? { ...client } : undefined;
  }

  updateClient(updatedClient: Client): void {
    const index = this.clients.findIndex(c => c.id === updatedClient.id);
    if (index !== -1) {
      this.clients[index] = { ...updatedClient };
      this.notifyListeners();
    } else {
      // If client doesn't exist, add it (for createClient fallback)
      this.clients.push({ ...updatedClient });
      this.notifyListeners();
    }
  }

  deleteClient(clientId: string): void {
    const index = this.clients.findIndex(c => c.id === clientId);
    if (index !== -1) {
      this.clients.splice(index, 1);
      this.notifyListeners();
    }
  }

  getClientOperations(clientId: string): Operation[] {
    return this.operations
      .filter(op => op.clientId === clientId)
      .map(op => ({ ...op }));
  }

  getAsset(assetId: string): { asset: Asset; operation: Operation } | null {
    for (const operation of this.operations) {
      const asset = operation.assets.find(a => a.id === assetId);
      if (asset) {
        return {
          asset: { ...asset },
          operation: { ...operation }
        };
      }
    }
    return null;
  }

  updateOperation(updatedOperation: Operation): void {
    const index = this.operations.findIndex(op => op.id === updatedOperation.id);
    if (index !== -1) {
      // Deep copy to ensure all fields are updated
      this.operations[index] = { ...updatedOperation };
      this.notifyListeners();
    } else {
      // If operation doesn't exist, add it (for createOperation fallback)
      this.operations.push({ ...updatedOperation });
      this.notifyListeners();
    }
  }

  deleteOperation(operationId: string): void {
    const index = this.operations.findIndex(op => op.id === operationId);
    if (index !== -1) {
      this.operations.splice(index, 1);
      this.notifyListeners();
    }
  }

  updateAssetEvaluation(assetId: string, evaluation: AssetDnshEvaluation): boolean {
    for (const operation of this.operations) {
      const assetIndex = operation.assets.findIndex(a => a.id === assetId);
      if (assetIndex !== -1) {
        operation.assets[assetIndex] = {
          ...operation.assets[assetIndex],
          dnshEvaluation: { ...evaluation }
        };
        this.notifyListeners();
        return true;
      }
    }
    return false;
  }

  updateOperationAssets(operationId: string, assetUpdates: Array<{ assetId: string; evaluation: AssetDnshEvaluation }>): boolean {
    const operation = this.operations.find(op => op.id === operationId);
    if (!operation) return false;

    let updated = false;
    assetUpdates.forEach(({ assetId, evaluation }) => {
      const assetIndex = operation.assets.findIndex(a => a.id === assetId);
      if (assetIndex !== -1) {
        operation.assets[assetIndex] = {
          ...operation.assets[assetIndex],
          dnshEvaluation: { ...evaluation }
        };
        updated = true;
      }
    });

    if (updated) {
      this.notifyListeners();
    }
    return updated;
  }

  /** Reemplaza toda la lista de operaciones (p. ej. tras cargar desde API). */
  setOperations(operations: Operation[]): void {
    this.operations = Array.isArray(operations) ? operations.map(op => ({ ...op })) : [];
    this.notifyListeners();
  }

  /** Reemplaza toda la lista de clientes (p. ej. tras cargar desde API). */
  setClients(clients: Client[]): void {
    this.clients = Array.isArray(clients) ? clients.map(c => ({ ...c })) : [];
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

const dataStore = new DataStore();

// Con API activa, la fuente de verdad es el backend: no pre-cargar datos demo
if (USE_API) {
  dataStore.setOperations([]);
  dataStore.setClients([]);
}

/**
 * Get all operations
 * Uses API if available, falls back to local store
 */
export async function getAllOperations(): Promise<Operation[]> {
  if (USE_API) {
    return safeApiCall(
      async () => {
        const response = await apiClient.getOperations({ limit: 1000 });
        
        if (!validateApiResponse(response, ['operations'])) {
          return dataStore.getOperations();
        }
        
        if (!Array.isArray(response.operations)) {
          logger.warn('Invalid API response: operations is not an array');
          return dataStore.getOperations();
        }
        
        const operations = response.operations.map(transformApiOperation);
        dataStore.setOperations(operations);
        return operations;
      },
      dataStore.getOperations(),
      'API unavailable, using local store'
    );
  }
  return dataStore.getOperations();
}

/**
 * Get operation by ID
 */
export async function getOperation(id: string): Promise<Operation | undefined> {
  if (USE_API) {
    return safeApiCall(
      async () => {
        const op = await apiClient.getOperation(id);
        
        if (!op || !op.id) {
          logger.warn('Invalid operation response, using local store');
          return dataStore.getOperation(id);
        }
        
        return transformApiOperation(op);
      },
      dataStore.getOperation(id),
      'API unavailable, using local store'
    );
  }
  return dataStore.getOperation(id);
}

/**
 * Get all clients
 */
export async function getAllClients(): Promise<Client[]> {
  if (USE_API) {
    return safeApiCall(
      async () => {
        const response = await apiClient.getClients();
        if (!validateApiResponse(response, ['clients'])) {
          return dataStore.getClients();
        }
        const clients = response.clients.map(transformApiClient);
        dataStore.setClients(clients);
        return clients;
      },
      dataStore.getClients(),
      'API unavailable, using local store'
    );
  }
  return dataStore.getClients();
}

/**
 * Create a new client
 */
export async function createClient(clientData: { name: string; country?: string; sector?: string; description?: string }): Promise<Client> {
  if (USE_API) {
    try {
      const response = await apiClient.createClient(clientData);
      const newClient = transformApiClient(response.client);
      // Also add to local store for immediate UI updates
      dataStore.updateClient(newClient);
      return newClient;
    } catch (error) {
      logger.warn('API unavailable:', error);
      throw error;
    }
  }
  // Fallback: create in local store only (for development)
  const newClient: Client = {
    id: `client-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    name: clientData.name,
    country: clientData.country,
    sector: clientData.sector,
    description: clientData.description,
    operations: []
  };
  dataStore.updateClient(newClient);
  return newClient;
}

/**
 * Update a client
 */
export async function updateClient(clientId: string, updates: Partial<Client>): Promise<void> {
  if (USE_API) {
    try {
      await apiClient.updateClient(clientId, updates);
      // Also update local store for immediate UI updates
      const client = dataStore.getClient(clientId);
      if (client) {
        const updatedClient: Client = { ...client, ...updates };
        dataStore.updateClient(updatedClient);
      }
    } catch (error) {
      logger.warn('API unavailable:', error);
      throw error;
    }
  } else {
    // Fallback: update local store only
    const client = dataStore.getClient(clientId);
    if (client) {
      const updatedClient: Client = { ...client, ...updates };
      dataStore.updateClient(updatedClient);
    } else {
      throw new Error('Client not found');
    }
  }
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string): Promise<void> {
  if (USE_API) {
    try {
      await apiClient.deleteClient(clientId);
      // Remove from local store
      dataStore.deleteClient(clientId);
    } catch (error) {
      logger.warn('API unavailable:', error);
      throw error;
    }
  } else {
    // Fallback: remove from local store (for development)
    dataStore.deleteClient(clientId);
  }
}

/**
 * Get client by ID
 */
export function getClient(id: string): Client | undefined {
  return dataStore.getClient(id);
}

/**
 * Get operations for a client
 */
export async function getClientOperations(clientId: string): Promise<Operation[]> {
  if (USE_API) {
    return safeApiCall(
      async () => {
        const response = await apiClient.getOperations({ clientId, limit: 1000 });
        if (!validateApiResponse(response, ['operations'])) {
          return dataStore.getClientOperations(clientId);
        }
        return response.operations.map(transformApiOperation);
      },
      dataStore.getClientOperations(clientId),
      'API unavailable, using local store'
    );
  }
  return dataStore.getClientOperations(clientId);
}

/**
 * Get asset by ID
 */
export async function getAsset(assetId: string): Promise<{ asset: Asset; operation: Operation } | null> {
  if (USE_API) {
    return safeApiCall(
      async () => {
        const assetData = await apiClient.getAsset(assetId);
        const asset = transformApiAsset(assetData);
        
        // Get operation
        const operation = await getOperation(asset.operationId);
        if (!operation) return null;
        
        return { asset, operation };
      },
      dataStore.getAsset(assetId),
      'API unavailable, using local store'
    );
  }
  return dataStore.getAsset(assetId);
}

/**
 * Create a new operation
 * Creates via API if available, falls back to local store
 */
export async function createOperation(operationData: Partial<Operation>): Promise<Operation> {
  if (USE_API) {
    try {
      const response = await apiClient.createOperation(operationData);
      // Fetch the created operation to get full data
      const createdOp = await getOperation(response.id);
      if (createdOp) {
        return createdOp;
      }
      // Fallback: construct from response
      const newOperation: Operation = {
        id: response.id,
        clientId: operationData.clientId || '',
        name: operationData.name || 'Unnamed Operation',
        sectorNACE: operationData.sectorNACE || '',
        country: operationData.country || '',
        capex: operationData.capex || 0,
        dealPrice: operationData.dealPrice,
        expectedReturn: operationData.expectedReturn,
        riskWeightedCapital: operationData.riskWeightedCapital,
        totalAAL: operationData.totalAAL,
        maxRiskBand: operationData.maxRiskBand,
        sustainabilityDiscount: operationData.sustainabilityDiscount,
        riskAdjustment: operationData.riskAdjustment,
        status: operationData.status || 'Draft',
        substantialContributionId: operationData.substantialContributionId || DnshObjective.MITIGATION,
        assets: operationData.assets || [],
        evidenceDocuments: operationData.evidenceDocuments || []
      };
      // Update assets with operationId
      newOperation.assets = newOperation.assets.map(asset => ({
        ...asset,
        operationId: newOperation.id
      }));
      dataStore.updateOperation(newOperation);
      return newOperation;
    } catch (error) {
      logger.warn('API unavailable, using local store:', error);
    }
  }
  // Fallback: create in local store
  const newOperation: Operation = {
    id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    clientId: operationData.clientId || '',
    name: operationData.name || 'Unnamed Operation',
    sectorNACE: operationData.sectorNACE || '',
    country: operationData.country || '',
    capex: operationData.capex || 0,
    dealPrice: operationData.dealPrice,
    expectedReturn: operationData.expectedReturn,
    riskWeightedCapital: operationData.riskWeightedCapital,
    totalAAL: operationData.totalAAL,
    maxRiskBand: operationData.maxRiskBand,
    sustainabilityDiscount: operationData.sustainabilityDiscount,
    riskAdjustment: operationData.riskAdjustment,
    status: operationData.status || 'Draft',
    substantialContributionId: operationData.substantialContributionId || DnshObjective.MITIGATION,
    assets: operationData.assets || [],
    evidenceDocuments: operationData.evidenceDocuments || []
  };
  // Update assets with operationId
  newOperation.assets = newOperation.assets.map(asset => ({
    ...asset,
    operationId: newOperation.id
  }));
  dataStore.updateOperation(newOperation);
  return newOperation;
}

/**
 * Update an operation
 * Saves to API if available, updates local store
 */
export async function updateOperation(updatedOperation: Operation): Promise<void> {
  if (USE_API) {
    try {
      await apiClient.updateOperation(updatedOperation.id, {
        name: updatedOperation.name,
        sectorNACE: updatedOperation.sectorNACE,
        country: updatedOperation.country,
        capex: updatedOperation.capex,
        dealPrice: updatedOperation.dealPrice,
        expectedReturn: updatedOperation.expectedReturn,
        riskWeightedCapital: updatedOperation.riskWeightedCapital,
        totalAAL: updatedOperation.totalAAL,
        maxRiskBand: updatedOperation.maxRiskBand,
        sustainabilityDiscount: updatedOperation.sustainabilityDiscount,
        riskAdjustment: updatedOperation.riskAdjustment,
        status: updatedOperation.status,
        substantialContributionId: updatedOperation.substantialContributionId,
        // Archive fields
        archived: updatedOperation.archived,
        archivedAt: updatedOperation.archivedAt,
        archivedBy: updatedOperation.archivedBy,
        archiveReason: updatedOperation.archiveReason
      });
      // Also update local store for immediate UI updates
      dataStore.updateOperation(updatedOperation);
      return;
    } catch (error) {
      logger.warn('API unavailable, using local store:', error);
    }
  }
  dataStore.updateOperation(updatedOperation);
}

/**
 * Update an asset's DNSH evaluation
 * Saves to API if available
 */
export async function updateAssetEvaluation(assetId: string, evaluation: AssetDnshEvaluation): Promise<boolean> {
  if (USE_API) {
    try {
      await apiClient.saveEvaluation({
        assetId,
        ...evaluation
      });
      // Also update local store
      dataStore.updateAssetEvaluation(assetId, evaluation);
      return true;
    } catch (error) {
      logger.warn('API unavailable, using local store:', error);
    }
  }
  return dataStore.updateAssetEvaluation(assetId, evaluation);
}

/**
 * Update multiple assets in an operation
 */
export async function updateOperationAssets(
  operationId: string,
  assetUpdates: Array<{ assetId: string; evaluation: AssetDnshEvaluation }>
): Promise<boolean> {
  if (USE_API) {
    try {
      // Update each asset evaluation via API
      for (const { assetId, evaluation } of assetUpdates) {
        await apiClient.saveEvaluation({
          assetId,
          ...evaluation
        });
      }
      // Also update local store
      return dataStore.updateOperationAssets(operationId, assetUpdates);
    } catch (error) {
      logger.warn('API unavailable, using local store:', error);
    }
  }
  return dataStore.updateOperationAssets(operationId, assetUpdates);
}

/**
 * Subscribe to data changes
 */
export function subscribe(listener: () => void): () => void {
  return dataStore.subscribe(listener);
}

/**
 * Get operation statistics
 */
export function getOperationStats(operation: Operation): {
  totalAssets: number;
  evaluatedAssets: number;
  compliantAssets: number;
  nonCompliantAssets: number;
  conditionalAssets: number;
} {
  const totalAssets = operation.assets.length;
  let evaluatedAssets = 0;
  let compliantAssets = 0;
  let nonCompliantAssets = 0;
  let conditionalAssets = 0;

  operation.assets.forEach(asset => {
    if (asset.dnshEvaluation) {
      evaluatedAssets++;
      const overallStatus = asset.dnshEvaluation.overallStatus;
      if (overallStatus === 'Compliant') compliantAssets++;
      else if (overallStatus === 'Non-Compliant') nonCompliantAssets++;
      else if (overallStatus === 'Conditional') conditionalAssets++;
    }
  });

  return {
    totalAssets,
    evaluatedAssets,
    compliantAssets,
    nonCompliantAssets,
    conditionalAssets
  };
}

/**
 * Archive an operation (move to historical)
 */
export async function archiveOperation(
  operationId: string,
  archivedBy: string,
  reason?: string
): Promise<void> {
  const operation = await getOperation(operationId);
  if (!operation) {
    throw new Error('Operation not found');
  }

  const archivedOperation: Operation = {
    ...operation,
    archived: true,
    archivedAt: new Date().toISOString(),
    archivedBy,
    archiveReason: reason
  };

  await updateOperation(archivedOperation);
}

/**
 * Unarchive an operation (restore from historical)
 */
export async function unarchiveOperation(operationId: string): Promise<void> {
  const operation = await getOperation(operationId);
  if (!operation) {
    throw new Error('Operation not found');
  }

  const unarchivedOperation: Operation = {
    ...operation,
    archived: false,
    archivedAt: undefined,
    archivedBy: undefined,
    archiveReason: undefined
  };

  await updateOperation(unarchivedOperation);
}

/**
 * Get archived operations (historical)
 */
export async function getArchivedOperations(): Promise<Operation[]> {
  const allOps = await getAllOperations();
  return allOps.filter(op => op.archived === true);
}

/**
 * Get active operations (not archived)
 */
export async function getActiveOperations(): Promise<Operation[]> {
  const allOps = await getAllOperations();
  // Filter out archived operations (archived === true or undefined/false means active)
  return allOps.filter(op => op.archived !== true);
}

/**
 * Delete an operation
 */
export async function deleteOperation(operationId: string): Promise<void> {
  if (USE_API) {
    try {
      await apiClient.deleteOperation(operationId);
      // Remove from local store
      dataStore.deleteOperation(operationId);
      return;
    } catch (error) {
      logger.warn('API unavailable, using local store:', error);
    }
  }
  // Fallback: remove from local store
  dataStore.deleteOperation(operationId);
}

// Export dataStore for backward compatibility
export { dataStore };
