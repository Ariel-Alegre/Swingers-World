import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { useAuth } from './AuthContext';

const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'swingers_world_premium';
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '';

let configured = false;
let configuredUserId: string | null = null;

type SubscriptionContextValue = {
  loading: boolean;
  hasAccess: boolean;
  previewMode: boolean;
  packages: PurchasesPackage[];
  offeringsLoading: boolean;
  error: string;
  refresh: () => Promise<boolean>;
  loadOfferings: () => Promise<void>;
  purchase: (selectedPackage: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  manage: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function hasPremiumEntitlement(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

function platformApiKey() {
  if (Platform.OS === 'ios') return IOS_API_KEY;
  if (Platform.OS === 'android') return ANDROID_API_KEY;
  return '';
}

export function SubscriptionProvider({ children }: React.PropsWithChildren) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(Boolean(user));
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [error, setError] = useState('');

  const applyCustomerInfo = useCallback((customerInfo: CustomerInfo) => {
    const active = hasPremiumEntitlement(customerInfo);
    setHasAccess(active);
    setError('');
    return active;
  }, []);

  const refresh = useCallback(async () => {
    if (user?.plan === 'lifetime' && user.subscriptionStatus === 'lifetime') return true;
    if (!configured) return previewMode;
    try {
      return applyCustomerInfo(await Purchases.getCustomerInfo());
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Subscription status could not be verified.');
      return false;
    }
  }, [applyCustomerInfo, previewMode, user?.plan, user?.subscriptionStatus]);

  const loadOfferings = useCallback(async () => {
    if (!configured) return;
    setOfferingsLoading(true);
    setError('');
    try {
      const offerings = await Purchases.getOfferings();
      setPackages(offerings.current?.availablePackages ?? []);
      if (!offerings.current?.availablePackages.length) {
        setError('No subscription plans are currently available.');
      }
    } catch (value) {
      setPackages([]);
      setError(value instanceof Error ? value.message : 'Subscription plans could not be loaded.');
    } finally {
      setOfferingsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      setCheckedUserId(null);
      setHasAccess(false);
      setPreviewMode(false);
      setPackages([]);
      return undefined;
    }
    if (user.role === 'admin') {
      setLoading(false);
      setCheckedUserId(user.id);
      setHasAccess(true);
      setPreviewMode(false);
      setError('');
      return undefined;
    }
    if (user.plan === 'lifetime' && user.subscriptionStatus === 'lifetime') {
      setLoading(false);
      setCheckedUserId(user.id);
      setHasAccess(true);
      setPreviewMode(false);
      setError('');
      return undefined;
    }

    const apiKey = platformApiKey();
    if (!apiKey) {
      const developmentPreview = __DEV__;
      setPreviewMode(developmentPreview);
      setHasAccess(developmentPreview);
      setError(developmentPreview ? '' : 'RevenueCat is not configured for this platform.');
      setLoading(false);
      setCheckedUserId(user.id);
      return undefined;
    }

    const customerInfoListener = (customerInfo: CustomerInfo) => {
      if (active) applyCustomerInfo(customerInfo);
    };

    void (async () => {
      setLoading(true);
      setPackages([]);
      setHasAccess(false);
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        if (!configured) {
          Purchases.configure({ apiKey, appUserID: user.id });
          configured = true;
          configuredUserId = user.id;
        } else if (configuredUserId !== user.id) {
          const result = await Purchases.logIn(user.id);
          configuredUserId = user.id;
          if (active) applyCustomerInfo(result.customerInfo);
        }
        Purchases.addCustomerInfoUpdateListener(customerInfoListener);
        const customerInfo = await Purchases.getCustomerInfo();
        if (active) applyCustomerInfo(customerInfo);
        try {
          const offerings = await Purchases.getOfferings();
          if (active) {
            setPackages(offerings.current?.availablePackages ?? []);
            if (!offerings.current?.availablePackages.length) {
              setError('No subscription plans are currently available.');
            }
          }
        } catch (value) {
          if (active && !hasPremiumEntitlement(customerInfo)) {
            setPackages([]);
            setError(value instanceof Error ? value.message : 'Subscription plans could not be loaded.');
          }
        }
      } catch (value) {
        if (active) {
          setHasAccess(false);
          setError(value instanceof Error ? value.message : 'Subscription status could not be verified.');
        }
      } finally {
        if (active) {
          setCheckedUserId(user.id);
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      if (configured) Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [applyCustomerInfo, user?.id, user?.role, user?.plan, user?.subscriptionStatus]);

  const purchase = useCallback(async (selectedPackage: PurchasesPackage) => {
    if (!configured) return previewMode;
    setError('');
    try {
      const result = await Purchases.purchasePackage(selectedPackage);
      return applyCustomerInfo(result.customerInfo);
    } catch (value) {
      const purchaseError = value as Partial<PurchasesError>;
      if (purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || purchaseError.userCancelled) {
        return false;
      }
      setError(value instanceof Error ? value.message : 'The purchase could not be completed.');
      return false;
    }
  }, [applyCustomerInfo, previewMode]);

  const restore = useCallback(async () => {
    if (!configured) return previewMode;
    try {
      return applyCustomerInfo(await Purchases.restorePurchases());
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Purchases could not be restored.');
      return false;
    }
  }, [applyCustomerInfo, previewMode]);

  const manage = useCallback(async () => {
    if (!configured) return;
    await RevenueCatUI.presentCustomerCenter();
    await refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    loading: loading || Boolean(user && checkedUserId !== user.id),
    hasAccess: Boolean(user && checkedUserId === user.id && hasAccess),
    previewMode,
    packages,
    offeringsLoading,
    error,
    refresh,
    loadOfferings,
    purchase,
    restore,
    manage,
  }), [loading, checkedUserId, user?.id, hasAccess, previewMode, packages, offeringsLoading, error, refresh, loadOfferings, purchase, restore, manage]);
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return context;
}
