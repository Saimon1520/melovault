// Must be imported FIRST in index.js — sets global handler before any other module loads.
// Catches JS crashes that happen at module-load time (before React renders),
// which ErrorBoundary cannot catch.
/* global ErrorUtils, __DEV__ */
'use strict';

if (!__DEV__) {
  const orig = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler(function (error, isFatal) {
    try {
      const msg = (error && error.message) ? error.message : String(error);
      const stack = (error && error.stack) ? String(error.stack).slice(0, 1200) : '';

      // Persist to AsyncStorage so it survives app close
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.setItem('@melovault/last_crash', JSON.stringify({
        message: msg,
        stack: stack,
        ts: new Date().toISOString(),
      })).catch(function () {});

      // Show a visible Alert so the error is readable without USB debugging
      const Alert = require('react-native').Alert;
      Alert.alert(
        'MeloVault - Error de inicio',
        msg + '\n\n' + stack,
        [{ text: 'OK', onPress: function () { orig(error, isFatal); } }],
        { cancelable: false }
      );
    } catch (e2) {
      orig(error, isFatal);
    }
  });
}
