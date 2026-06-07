module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@/app': './src/app',
            '@/features': './src/features',
            '@/shared': './src/shared',
            '@/infrastructure': './src/infrastructure',
            '@/design-system': './src/design-system',
            '@/assets': './assets',
          },
        },
      ],
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
