const PREMIUM_DISABLED_MODE = "free-preview";

export const PREMIUM_FEATURE_KEYS = {
  EXTENDED_RECOMMENDATIONS: "extendedRecommendations",
  ADVANCED_FILTERS: "advancedFilters",
  VIEWING_HISTORY: "viewingHistory",
  ADVANCED_MULTI_USER: "advancedMultiUser",
  UNLIMITED_RETRIES: "unlimitedRetries",
};

export const PREMIUM_FEATURES = {
  [PREMIUM_FEATURE_KEYS.EXTENDED_RECOMMENDATIONS]: {
    label: "Recommandations etendues",
    premiumOnlyLater: true,
    enabledForFreeWhilePremiumDisabled: true,
  },
  [PREMIUM_FEATURE_KEYS.ADVANCED_FILTERS]: {
    label: "Filtres avances",
    premiumOnlyLater: true,
    enabledForFreeWhilePremiumDisabled: true,
  },
  [PREMIUM_FEATURE_KEYS.VIEWING_HISTORY]: {
    label: "Historique des films",
    premiumOnlyLater: true,
    enabledForFreeWhilePremiumDisabled: true,
  },
  [PREMIUM_FEATURE_KEYS.ADVANCED_MULTI_USER]: {
    label: "Mode multi-utilisateurs avance",
    premiumOnlyLater: true,
    enabledForFreeWhilePremiumDisabled: true,
  },
  [PREMIUM_FEATURE_KEYS.UNLIMITED_RETRIES]: {
    label: "Relances illimitees",
    premiumOnlyLater: true,
    enabledForFreeWhilePremiumDisabled: true,
  },
};

export function createInitialPremiumState() {
  return {
    isPremium: false,
    mode: PREMIUM_DISABLED_MODE,
    billingReady: false,
    purchaseToken: null,
  };
}

export function isPremiumFeatureEnabled(featureKey, premiumState = createInitialPremiumState()) {
  const feature = PREMIUM_FEATURES[featureKey];
  if (!feature) return true;

  if (premiumState.isPremium) return true;

  // Premium is prepared but not active yet: the current app must stay fully free.
  return feature.enabledForFreeWhilePremiumDisabled === true;
}

export function getPremiumFeatureAccess(premiumState = createInitialPremiumState()) {
  return Object.keys(PREMIUM_FEATURES).reduce((access, featureKey) => {
    access[featureKey] = isPremiumFeatureEnabled(featureKey, premiumState);
    return access;
  }, {});
}

