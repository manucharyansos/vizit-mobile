module.exports = ({ config }) => {
  const apiKey = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;

  return {
    ...config,
    plugins: (config.plugins ?? []).map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === 'expo-yandex-mapkit') {
        const options = { ...(plugin[1] ?? {}) };
        if (apiKey) options.apiKey = apiKey;
        return [plugin[0], options];
      }
      return plugin;
    }),
  };
};
