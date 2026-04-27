import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { appTheme } from '../../theme/tokens';

export interface TextProps extends RNTextProps {
  variant?: 'sans' | 'sansMedium' | 'sansBold' | 'serif' | 'serifRegular';
  color?: string;
}

export function Text({ style, variant = 'sans', color = appTheme.palette.text, ...props }: TextProps) {
  return (
    <RNText
      style={[
        { fontFamily: appTheme.typography[variant], color },
        style,
      ]}
      {...props}
    />
  );
}
