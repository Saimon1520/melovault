import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const screen = {
  width,
  height,
  isSmall: width < 375,
  isNormal: width >= 375 && width < 414,
  isLarge: width >= 414 && width < 480,
  isXLarge: width >= 480,
};

export const artworkSize = {
  small: width * 0.65,
  normal: width * 0.72,
  large: width * 0.78,
  xlarge: Math.min(width * 0.55, 380),
};
