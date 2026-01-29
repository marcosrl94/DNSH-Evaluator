/**
 * Subscription Status Component
 * Displays current subscription plan, usage, and limits
 */

import React, { useEffect, useState } from 'react';
import { apiClient } from '../src/services/api';
import { AlertCircle, CheckCircle, TrendingUp, Users, FileText, HardDrive, Zap } from 'lucide-react';

interface SubscriptionData {
  organizationId: string;
  plan: string;
  status: string;
  subscriptionEndsAt: string | null;
  trialEndsAt: string | null;
  limits?: {
    maxOperations: number;
    maxUsers: number;
    maxStorageGb: number;
    maxApiCallsPerMonth: number;
  };
  usage?: {
    operations: number;
    users: number;
    storageBytes: number;
    apiCalls: number;
  };
}

export const SubscriptionStatus: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCurrentSubscription();
      setSubscription(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <span className="text-red-800 dark:text-red-200">
            {error || 'No subscription found'}
          </span>
        </div>
      </div>
    );
  }

  const { plan, status, limits, usage } = subscription;

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === 0) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const planLabels: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };

  const planColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    starter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    professional: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    enterprise: 'bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Subscription Status
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Current plan and usage limits
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${planColors[plan] || planColors.free}`}
        >
          {planLabels[plan] || plan}
        </span>
      </div>

      {status === 'trial' && subscription.trialEndsAt && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <span className="text-yellow-800 dark:text-yellow-200 text-sm">
              Trial ends on {new Date(subscription.trialEndsAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {limits && usage && (
        <div className="space-y-4">
          {/* Operations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Operations
                </span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {usage.operations} / {limits.maxOperations === 0 ? '∞' : limits.maxOperations}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getUsageColor(
                  getUsagePercentage(usage.operations, limits.maxOperations || 1)
                )}`}
                style={{
                  width: `${getUsagePercentage(usage.operations, limits.maxOperations || 1)}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Users */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Users</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {usage.users} / {limits.maxUsers === 0 ? '∞' : limits.maxUsers}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getUsageColor(
                  getUsagePercentage(usage.users, limits.maxUsers || 1)
                )}`}
                style={{
                  width: `${getUsagePercentage(usage.users, limits.maxUsers || 1)}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Storage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <HardDrive className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Storage
                </span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.ceil(usage.storageBytes / (1024 * 1024 * 1024))} GB /{' '}
                {limits.maxStorageGb === 0 ? '∞' : `${limits.maxStorageGb} GB`}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getUsageColor(
                  getUsagePercentage(
                    Math.ceil(usage.storageBytes / (1024 * 1024 * 1024)),
                    limits.maxStorageGb || 1
                  )
                )}`}
                style={{
                  width: `${getUsagePercentage(
                    Math.ceil(usage.storageBytes / (1024 * 1024 * 1024)),
                    limits.maxStorageGb || 1
                  )}%`,
                }}
              ></div>
            </div>
          </div>

          {/* API Calls */}
          {limits.maxApiCallsPerMonth > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Zap className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    API Calls (this month)
                  </span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {usage.apiCalls} / {limits.maxApiCallsPerMonth}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getUsageColor(
                    getUsagePercentage(usage.apiCalls, limits.maxApiCallsPerMonth)
                  )}`}
                  style={{
                    width: `${getUsagePercentage(usage.apiCalls, limits.maxApiCallsPerMonth)}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {getUsagePercentage(usage?.operations || 0, limits?.maxOperations || 1) >= 80 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <span className="text-yellow-800 dark:text-yellow-200 text-sm">
              You're approaching your plan limits. Consider upgrading for more capacity.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
