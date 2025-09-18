// components/OfflineBanner.js
import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const OfflineBanner = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner">
      <span>❌ Sin conexión a internet</span>
      <span style={{ marginLeft: '1em', fontSize: '0.9em', opacity: 0.9 }}>
        Algunas funciones pueden no estar disponibles
      </span>
    </div>
  );
};

export default OfflineBanner;