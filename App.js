import React from 'react';

function d(label, fn) {
  try {
    const m = fn();
    console.error('MELO_DIAG OK: App/' + label);
    return m;
  } catch (e) {
    console.error('MELO_DIAG FAIL: App/' + label + ' :: ' + (e && e.message ? e.message : String(e)) + ' :: ' + (e && e.stack ? e.stack : ''));
    throw e;
  }
}

d('global.css', () => require('./global.css'));
const { Providers } = d('Providers', () => require('./src/app/Providers'));
const { RootNavigator } = d('RootNavigator', () => require('./src/app/navigation/RootNavigator'));
const { ErrorBoundary } = d('ErrorBoundary', () => require('./src/app/ErrorBoundary'));

export default function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <RootNavigator />
      </Providers>
    </ErrorBoundary>
  );
}
