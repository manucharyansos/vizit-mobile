import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ColorValue, StyleProp, ViewStyle } from 'react-native';

type PlatformName = Extract<Exclude<SymbolViewProps['name'], string>, object>;

type Props = {
  ios: Extract<SymbolViewProps['name'], string>;
  android: PlatformName['android'];
  color: ColorValue;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function VizitIcon({ ios, android, color, size = 22, style }: Props) {
  return <SymbolView name={{ ios, android, web: android }} tintColor={color} size={size} style={style} />;
}
