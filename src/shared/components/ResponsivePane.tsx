import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Centers its content with a max width and respects the left/right safe-area
 * insets. Keeps forms, option menus and sheets readable on wide / folded /
 * landscape screens instead of stretching edge-to-edge or hiding under the
 * camera cutout or side navigation bar.
 */
export function ResponsivePane({
  children,
  maxWidth = 560,
  style,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          width: '100%',
          maxWidth: maxWidth + insets.left + insets.right,
          alignSelf: 'center',
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
