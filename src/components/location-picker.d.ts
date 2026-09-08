export type LocationPickerProps = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (point: { latitude: number; longitude: number }) => void;
  height?: number;
};

export declare function LocationPicker(props: LocationPickerProps): import('react').ReactElement;
