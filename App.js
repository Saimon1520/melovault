import React from 'react';
import { LogBox } from 'react-native';
import './global.css';
import { Providers } from './src/app/Providers';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { ErrorBoundary } from './src/app/ErrorBoundary';

// Hide the dev-only LogBox warning toasts (e.g. dependency deprecation notices)
// so they don't cover the UI. Fatal errors still surface; release builds never
// show LogBox at all.
LogBox.ignoreAllLogs(true);

export default function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <RootNavigator />
      </Providers>
    </ErrorBoundary>
  );
}
