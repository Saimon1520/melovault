import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#ff4444', fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>
          MeloVault encontró un error
        </Text>
        <ScrollView style={{ maxHeight: 300, width: '100%', backgroundColor: '#0f0f1a', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <Text style={{ color: '#ff8888', fontSize: 12, fontFamily: 'monospace' }}>
            {error.message}
          </Text>
          {error.stack ? (
            <Text style={{ color: '#888', fontSize: 10, fontFamily: 'monospace', marginTop: 8 }}>
              {error.stack}
            </Text>
          ) : null}
        </ScrollView>
        <TouchableOpacity
          onPress={() => this.setState({ error: null })}
          style={{ paddingHorizontal: 32, paddingVertical: 14, backgroundColor: '#7C3AED', borderRadius: 24 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
