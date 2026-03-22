import { useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useUiStore } from '../stores/uiStore';

const DELTA_THRESHOLD = 14;
const TOP_RESET_OFFSET = 24;

export function useTabBarOnScroll() {
  const setTabBarVisible = useUiStore(state => state.setTabBarVisible);
  const lastOffsetY = useRef(0);

  useEffect(() => () => setTabBarVisible(true), [setTabBarVisible]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentOffsetY = event.nativeEvent.contentOffset.y;

      if (currentOffsetY <= TOP_RESET_OFFSET) {
        setTabBarVisible(true);
        lastOffsetY.current = currentOffsetY;
        return;
      }

      const delta = currentOffsetY - lastOffsetY.current;

      if (delta > DELTA_THRESHOLD) {
        setTabBarVisible(false);
      } else if (delta < -DELTA_THRESHOLD) {
        setTabBarVisible(true);
      }

      lastOffsetY.current = currentOffsetY;
    },
    [setTabBarVisible]
  );

  return {
    onScroll,
    scrollEventThrottle: 16 as const,
  };
}
