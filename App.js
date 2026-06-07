import './global.css';
import React from 'react';
import { Providers } from './src/app/Providers';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { ErrorBoundary } from './src/app/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <RootNavigator />
      </Providers>
    </ErrorBoundary>
  );
}
