/**
 * Active Context Provider
 * Manages the currently active client and operation for context-aware features
 * Used by AI Assistant and other components that need contextual information
 */

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Client, Operation } from '../types';
import { logger } from '../utils/logger';

interface ActiveContextType {
  activeClient: Client | null;
  activeOperation: Operation | null;
  setActiveClient: (client: Client | null) => void;
  setActiveOperation: (operation: Operation | null) => void;
  clearContext: () => void;
}

const ActiveContext = createContext<ActiveContextType | undefined>(undefined);

export const ActiveContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [activeOperation, setActiveOperation] = useState<Operation | null>(null);

  // Persist context in sessionStorage for page refresh (with error handling)
  useEffect(() => {
    let storedClient: string | null = null;
    let storedOperation: string | null = null;
    
    try {
      storedClient = sessionStorage.getItem('active_client');
      storedOperation = sessionStorage.getItem('active_operation');
    } catch (error: any) {
      // Private mode or disabled storage
      if (error.name === 'SecurityError') {
        logger.warn('sessionStorage not available (private mode?), skipping restore');
      }
      return;
    }
    
    if (storedClient) {
      try {
        const parsed = JSON.parse(storedClient);
        // Validate structure
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
          setActiveClient(parsed);
        } else {
          throw new Error('Invalid client structure');
        }
      } catch (error) {
        logger.warn('Failed to parse stored client, clearing:', error);
        sessionStorage.removeItem('active_client'); // Clean corrupt data
      }
    }
    
    if (storedOperation) {
      try {
        const parsed = JSON.parse(storedOperation);
        // Validate structure
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
          setActiveOperation(parsed);
        } else {
          throw new Error('Invalid operation structure');
        }
      } catch (error) {
        logger.warn('Failed to parse stored operation, clearing:', error);
        sessionStorage.removeItem('active_operation'); // Clean corrupt data
      }
    }
  }, []);

  // Save to sessionStorage when context changes (with error handling)
  useEffect(() => {
    try {
      if (activeClient) {
        // Validate size (sessionStorage limit ~5-10MB)
        const serialized = JSON.stringify(activeClient);
        if (serialized.length > 5000000) { // 5MB limit
          logger.warn('Client data too large for sessionStorage, skipping save');
          return;
        }
        sessionStorage.setItem('active_client', serialized);
      } else {
        sessionStorage.removeItem('active_client');
      }
    } catch (error: any) {
      // Handle quota exceeded or private mode
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        logger.warn('sessionStorage quota exceeded, clearing old data');
        sessionStorage.removeItem('active_client');
      } else if (error.name === 'SecurityError') {
        // Private mode or disabled storage
        logger.warn('sessionStorage not available (private mode?)');
      } else {
        logger.warn('Error saving active client to sessionStorage:', error);
      }
    }
  }, [activeClient]);

  useEffect(() => {
    try {
      if (activeOperation) {
        // Validate size
        const serialized = JSON.stringify(activeOperation);
        if (serialized.length > 5000000) { // 5MB limit
          logger.warn('Operation data too large for sessionStorage, skipping save');
          return;
        }
        sessionStorage.setItem('active_operation', serialized);
      } else {
        sessionStorage.removeItem('active_operation');
      }
    } catch (error: any) {
      // Handle quota exceeded or private mode
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        logger.warn('sessionStorage quota exceeded, clearing old data');
        sessionStorage.removeItem('active_operation');
      } else if (error.name === 'SecurityError') {
        logger.warn('sessionStorage not available (private mode?)');
      } else {
        logger.warn('Error saving active operation to sessionStorage:', error);
      }
    }
  }, [activeOperation]);

  const clearContext = () => {
    setActiveClient(null);
    setActiveOperation(null);
    sessionStorage.removeItem('active_client');
    sessionStorage.removeItem('active_operation');
  };

  return (
    <ActiveContext.Provider
      value={{
        activeClient,
        activeOperation,
        setActiveClient,
        setActiveOperation,
        clearContext
      }}
    >
      {children}
    </ActiveContext.Provider>
  );
};

export const useActiveContext = () => {
  const context = useContext(ActiveContext);
  if (!context) {
    throw new Error('useActiveContext must be used within ActiveContextProvider');
  }
  return context;
};
