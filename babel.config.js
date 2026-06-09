module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // Force the non-Hermes ("default") transform profile. Under the
      // hermes-stable profile, @react-native/babel-preset sets
      // preserveClasses=true and SKIPS @babel/plugin-transform-class-properties.
      // WatermelonDB's legacy decorators emit an _initializerWarningHelper
      // sentinel that class-properties is supposed to replace; without it, every
      // model instantiation crashes on Hermes with "Decorating class property
      // failed". The default profile keeps class-properties enabled.
      ['babel-preset-expo', { jsxImportSource: 'nativewind', unstable_transformProfile: 'default' }],
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
