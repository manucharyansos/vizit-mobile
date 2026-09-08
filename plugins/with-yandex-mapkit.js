const { withAppDelegate } = require('expo/config-plugins');

module.exports = function withYandexMapKit(config) {
  return withAppDelegate(config, (mod) => {
    const apiKey = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;
    if (!apiKey) return mod;
    if (mod.modResults.language !== 'swift') throw new Error('Vizit Yandex plugin expects the Expo SDK 57 Swift AppDelegate');
    let source = mod.modResults.contents;
    if (!source.includes('import YandexMapsMobile')) source = source.replace('import React\n', 'import React\nimport YandexMapsMobile\n');
    if (!source.includes('YMKMapKit.setApiKey')) source = source.replace('    let delegate = ReactNativeDelegate()', `    YMKMapKit.setApiKey("${apiKey}")\n    _ = YMKMapKit.sharedInstance()\n\n    let delegate = ReactNativeDelegate()`);
    mod.modResults.contents = source;
    return mod;
  });
};
