/**
 * PointsToast
 * Story 6.1: Floating "+N" animation when points are earned
 */

import React, { useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { StyleSheet, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    runOnJS,
    Easing,
} from 'react-native-reanimated';

export interface PointsToastRef {
    show: (points: number) => void;
}

const PointsToast = forwardRef<PointsToastRef>((_, ref) => {
    const [displayPoints, setDisplayPoints] = useState(0);
    const [visible, setVisible] = useState(false);

    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0);

    const hide = useCallback(() => {
        setVisible(false);
    }, []);

    const show = useCallback((points: number) => {
        setDisplayPoints(points);
        setVisible(true);

        // Reset
        translateY.value = 0;
        opacity.value = 0;

        // Animate in
        opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });

        // Float up and fade out
        translateY.value = withDelay(
            400,
            withTiming(-60, { duration: 1000, easing: Easing.out(Easing.ease) })
        );
        opacity.value = withDelay(
            800,
            withTiming(0, { duration: 600, easing: Easing.in(Easing.ease) }, () => {
                runOnJS(hide)();
            })
        );
    }, [translateY, opacity, hide]);

    useImperativeHandle(ref, () => ({ show }), [show]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
            <Animated.Text style={styles.text}>+{displayPoints}</Animated.Text>
        </Animated.View>
    );
});

PointsToast.displayName = 'PointsToast';

export default PointsToast;

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 60,
        alignSelf: 'center',
        backgroundColor: '#6366f1',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 9999,
    },
    text: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },
});
