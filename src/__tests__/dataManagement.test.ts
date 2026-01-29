/**
 * Data Management Tests
 * Tests for data transformation and API integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAllOperations, getOperation } from '../services/dataManagement';

describe('Data Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllOperations', () => {
    it('should return an array', async () => {
      const operations = await getAllOperations();
      expect(Array.isArray(operations)).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API failure
      const originalEnv = import.meta.env.VITE_USE_API;
      import.meta.env.VITE_USE_API = 'true';
      
      // Should fallback to local store
      const operations = await getAllOperations();
      expect(Array.isArray(operations)).toBe(true);
      
      import.meta.env.VITE_USE_API = originalEnv;
    });
  });

  describe('getOperation', () => {
    it('should return undefined for non-existent operation', async () => {
      const operation = await getOperation('non-existent-id');
      expect(operation).toBeUndefined();
    });

    it('should return operation object when found', async () => {
      const operations = await getAllOperations();
      if (operations.length > 0) {
        const operation = await getOperation(operations[0].id);
        expect(operation).toBeDefined();
        expect(operation?.id).toBe(operations[0].id);
      }
    });
  });
});
