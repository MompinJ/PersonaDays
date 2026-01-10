module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // plugins: [], <--- Asegúrate de que NO esté 'react-native-reanimated/plugin'
  };
};
