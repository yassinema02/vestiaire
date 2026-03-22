/**
 * Tabs Layout
 * Bottom tab navigation for main app screens with animations
 */

import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appTheme } from '../../theme/tokens';
import { useUiStore } from '../../stores/uiStore';

const TAB_ICON_MAP = {
  index: ['home', 'home-outline'],
  wardrobe: ['shirt', 'shirt-outline'],
  add: ['add', 'add'],
  social: ['people', 'people-outline'],
  profile: ['person', 'person-outline'],
} satisfies Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]>;

type PrimaryTabRoute = keyof typeof TAB_ICON_MAP;

export default function TabsLayout() {
  const isTabBarVisible = useUiStore(state => state.isTabBarVisible);
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(tabBarTranslateY, {
      toValue: isTabBarVisible ? 0 : 120,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  }, [isTabBarVisible, tabBarTranslateY]);

  const renderTabBar = (
    props: Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0]
  ) => {
    const focusedRoute = props.state.routes[props.state.index];
    const focusedOptions = props.descriptors[focusedRoute.key]?.options;
    const flattenedStyle = StyleSheet.flatten(focusedOptions?.tabBarStyle as ViewStyle | undefined);
    const visibleRoutes = props.state.routes.filter(route => {
      const options = props.descriptors[route.key]?.options;
      const routeStyle = StyleSheet.flatten(options?.tabBarStyle as ViewStyle | undefined);
      return route.name in TAB_ICON_MAP && routeStyle?.display !== 'none';
    });

    if (flattenedStyle?.display === 'none') {
      return null;
    }

    return (
      <Animated.View
        pointerEvents={isTabBarVisible ? 'auto' : 'none'}
        style={[
          styles.tabBarWrap,
          {
            opacity: tabBarTranslateY.interpolate({
              inputRange: [0, 120],
              outputRange: [1, 0.92],
            }),
            transform: [{ translateY: tabBarTranslateY }],
          },
        ]}
      >
        <View style={styles.tabBarShell}>
          <View style={styles.tabBarGlow} />
          <View style={styles.tabBarRail}>
            {visibleRoutes.map(route => {
              const isFocused =
                props.state.index === props.state.routes.findIndex(item => item.key === route.key);
              const options = props.descriptors[route.key]?.options;
              const iconSet = TAB_ICON_MAP[route.name as PrimaryTabRoute];
              const isAddRoute = route.name === 'add';
              const eventHandlers = {
                onPress: () => {
                  const event = props.navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    props.navigation.navigate(route.name, route.params);
                  }
                },
                onLongPress: () =>
                  props.navigation.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  }),
              };

              if (isAddRoute) {
                return (
                  <Pressable
                    key={route.key}
                    accessibilityRole="button"
                    accessibilityState={isFocused ? { selected: true } : {}}
                    accessibilityLabel={options?.tabBarAccessibilityLabel}
                    testID={options?.tabBarButtonTestID}
                    style={styles.addSlot}
                    {...eventHandlers}
                  >
                    <View style={styles.addStack}>
                      <View style={[styles.addButton, isFocused && styles.addButtonFocused]}>
                        <Ionicons name={iconSet[0]} size={24} color={appTheme.palette.surface} />
                      </View>
                    </View>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options?.tabBarAccessibilityLabel}
                  testID={options?.tabBarButtonTestID}
                  style={styles.navSlot}
                  {...eventHandlers}
                >
                  <View style={styles.navItem}>
                    <View style={[styles.iconShell, isFocused && styles.iconShellActive]}>
                      <Ionicons
                        name={isFocused ? iconSet[0] : iconSet[1]}
                        size={20}
                        color={isFocused ? appTheme.palette.surface : appTheme.palette.textSoft}
                      />
                    </View>
                    <Animated.Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>
                      {String(options?.title ?? route.name)}
                    </Animated.Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarHideOnKeyboard: true,
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: 'Wardrobe',
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
        }}
      />
      <Tabs.Screen
        name="outfits"
        options={{
          href: null,
          title: 'Outfits',
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      {/* Hidden screen - not shown in tab bar */}
      <Tabs.Screen
        name="confirm-item"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="item-detail"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="outfits/swipe"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="outfits/builder"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="outfits/detail"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="log-wear"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="wear-calendar"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="badges"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="listing-history"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="donation-history"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="privacy"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="scan-confirm"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="scan-results"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="scan-history"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="create-ootd"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="create-squad"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="join-squad"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="squad-detail"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="steal-look"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="bulk-upload"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="review-items"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="calendar-settings"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="plan-week"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="travel"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  tabBarShell: {
    width: '92%',
    maxWidth: 520,
    marginBottom: Platform.OS === 'ios' ? 24 : 16,
    borderRadius: appTheme.radii.xl,
    backgroundColor: 'rgba(255, 252, 248, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
    overflow: 'visible',
    ...appTheme.shadows.float,
  },
  tabBarGlow: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: -8,
    height: 28,
    borderRadius: appTheme.radii.pill,
    backgroundColor: 'rgba(196, 154, 88, 0.08)',
  },
  tabBarRail: {
    minHeight: Platform.OS === 'ios' ? 76 : 72,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scene: {
    backgroundColor: appTheme.palette.canvas,
  },
  navSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItem: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShell: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconShellActive: {
    backgroundColor: appTheme.palette.surfaceInverse,
    borderColor: 'rgba(44, 34, 29, 0.08)',
    ...appTheme.shadows.card,
  },
  navLabel: {
    marginTop: 6,
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: appTheme.palette.textSoft,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  navLabelActive: {
    color: appTheme.palette.text,
  },
  addSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStack: {
    alignItems: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: appTheme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.palette.accent,
    borderWidth: 1,
    borderColor: 'rgba(255, 249, 243, 0.35)',
    shadowColor: appTheme.palette.accentDeep,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  addButtonFocused: {
    backgroundColor: appTheme.palette.accentDeep,
  },
});
