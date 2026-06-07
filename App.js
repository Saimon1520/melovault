import './global.css';
import React from 'react';
import { Providers } from './src/app/Providers';
import { RootNavigator } from './src/app/navigation/RootNavigator';

export default function App() {
  return (
    <Providers>
      <RootNavigator />
    </Providers>
  );
}
