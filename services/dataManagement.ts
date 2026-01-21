/**
 * Centralized Data Management Service
 * Ensures data consistency across all views and components
 * Single source of truth for operations and evaluations
 */

import { Operation, Asset, AssetDnshEvaluation, Client } from '../types';
import { DEMO_OPERATIONS, DEMO_CLIENTS } from '../constants';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';

/**
 * Data Store - In-memory store that can be replaced with API calls
 * In production, this would connect to a backend API
 */
class DataStore {
  private operations: Operation[] = [...DEMO_OPERATIONS];
  private clients: Client[] = [...DEMO_CLIENTS];
  private listeners: Set<() => void> = new Set();

  /**
   * Get all operations
   */
  getOperations(): Operation[] {
    return this.operations.map(op => ({ ...op }));
  }

  /**
   * Get operation by ID
   */
  getOperation(id: string): Operation | undefined {
    const op = this.operations.find(o => o.id === id);
    return op ? { ...op } : undefined;
  }

  /**
   * Get all clients
   */
  getClients(): Client[] {
    return this.clients.map(c => ({ ...c }));
  }

  /**
   * Get client by ID
   */
  getClient(id: string): Client | undefined {
    const client = this.clients.find(c => c.id === id);
    return client ? { ...client } : undefined;
  }

  /**
   * Get operations for a client
   */
  getClientOperations(clientId: string): Operation[] {
    return this.operations
      .filter(op => op.clientId === clientId)
      .map(op => ({ ...op }));
  }

  /**
   * Get asset by ID (searches across all operations)
   */
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

  /**
   * Update an operation
   * This ensures all views see the updated data
   */
  updateOperation(updatedOperation: Operation): void {
    const index = this.operations.findIndex(op => op.id === updatedOperation.id);
    if (index !== -1) {
      this.operations[index] = { ...updatedOperation };
      this.notifyListeners();
    }
  }

  /**
   * Update an asset's DNSH evaluation
   * Finds the asset across all operations and updates it
   */
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

  /**
   * Update multiple assets in an operation
   * Useful for batch updates
   */
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

  /**
   * Subscribe to data changes
   * Returns unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of data changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Reset to initial demo data
   * Useful for testing or resetting state
   */
  reset(): void {
    this.operations = [...DEMO_OPERATIONS];
    this.clients = [...DEMO_CLIENTS];
    this.notifyListeners();
  }
}

// Singleton instance
export const dataStore = new DataStore();

/**
 * Helper function to get operation with fresh data
 * Always fetches latest from store
 */
export const getOperation = (id: string): Operation | undefined => {
  return dataStore.getOperation(id);
};

/**
 * Helper function to get client with fresh data
 * Always fetches latest from store
 */
export const getClient = (id: string): Client | undefined => {
  return dataStore.getClient(id);
};

/**
 * Helper function to get all operations with fresh data
 */
export const getAllOperations = (): Operation[] => {
  return dataStore.getOperations();
};

/**
 * Helper function to get client operations with fresh data
 */
export const getClientOperations = (clientId: string): Operation[] => {
  return dataStore.getClientOperations(clientId);
};

/**
 * Helper function to update asset evaluation
 * Ensures all views are notified
 */
export const updateAssetEvaluation = (
  assetId: string,
  evaluation: AssetDnshEvaluation
): boolean => {
  return dataStore.updateAssetEvaluation(assetId, evaluation);
};

/**
 * Helper function to update operation
 * Ensures all views are notified
 */
export const updateOperation = (operation: Operation): void => {
  dataStore.updateOperation(operation);
};

/**
 * Helper function to update multiple assets in an operation
 * Ensures all views are notified
 */
export const updateOperationAssets = (
  operationId: string,
  assetUpdates: Array<{ assetId: string; evaluation: AssetDnshEvaluation }>
): boolean => {
  return dataStore.updateOperationAssets(operationId, assetUpdates);
};

/**
 * Calculate consistent DNSH metrics for an operation
 * Uses centralized calculation utilities
 */
export const getOperationDnshMetrics = (operation: Operation) => {
  const objectives = [
    'MITIGATION',
    'ADAPTATION',
    'WATER',
    'CIRCULAR',
    'POLLUTION',
    'BIODIVERSITY'
  ] as const;

  const metrics = {
    totalAssets: operation.assets.length,
    evaluatedAssets: operation.assets.filter(a => a.dnshEvaluation).length,
    compliantAssets: 0,
    nonCompliantAssets: 0,
    conditionalAssets: 0,
    notAssessedAssets: 0,
    objectiveBreakdown: {} as Record<string, {
      compliant: number;
      nonCompliant: number;
      conditional: number;
      notAssessed: number;
      total: number;
    }>
  };

  operation.assets.forEach(asset => {
    const evaluation = asset.dnshEvaluation;
    if (!evaluation) {
      metrics.notAssessedAssets++;
      return;
    }

    // Overall status
    switch (evaluation.overallStatus) {
      case 'Compliant':
        metrics.compliantAssets++;
        break;
      case 'Non-Compliant':
        metrics.nonCompliantAssets++;
        break;
      case 'Conditional':
        metrics.conditionalAssets++;
        break;
      default:
        metrics.notAssessedAssets++;
    }

    // Per-objective breakdown
    objectives.forEach(objKey => {
      const objective = objKey as any; // Type assertion needed
      if (!metrics.objectiveBreakdown[objective]) {
        metrics.objectiveBreakdown[objective] = {
          compliant: 0,
          nonCompliant: 0,
          conditional: 0,
          notAssessed: 0,
          total: operation.assets.length
        };
      }

      const status = getObjectiveStatusFromAsset(evaluation, objective);
      switch (status) {
        case 'Compliant':
          metrics.objectiveBreakdown[objective].compliant++;
          break;
        case 'Non-Compliant':
          metrics.objectiveBreakdown[objective].nonCompliant++;
          break;
        case 'Conditional':
          metrics.objectiveBreakdown[objective].conditional++;
          break;
        case 'Not Assessed':
          metrics.objectiveBreakdown[objective].notAssessed++;
          break;
      }
    });
  });

  return metrics;
};

/**
 * Validate data consistency
 * Checks for common data integrity issues
 */
export const validateDataConsistency = (): {
  isValid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];
  const operations = dataStore.getOperations();

  // Check for orphaned assets (assets without valid operation)
  operations.forEach(op => {
    op.assets.forEach(asset => {
      if (asset.operationId !== op.id) {
        issues.push(`Asset ${asset.id} has mismatched operationId: expected ${op.id}, got ${asset.operationId}`);
      }
    });
  });

  // Check for operations without valid client
  const clientIds = new Set(dataStore.getClients().map(c => c.id));
  operations.forEach(op => {
    if (!clientIds.has(op.clientId)) {
      issues.push(`Operation ${op.id} references non-existent client ${op.clientId}`);
    }
  });

  // Check for duplicate asset IDs
  const assetIds = new Set<string>();
  operations.forEach(op => {
    op.assets.forEach(asset => {
      if (assetIds.has(asset.id)) {
        issues.push(`Duplicate asset ID found: ${asset.id}`);
      }
      assetIds.add(asset.id);
    });
  });

  return {
    isValid: issues.length === 0,
    issues
  };
};
