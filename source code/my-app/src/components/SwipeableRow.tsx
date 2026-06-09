import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const DELETE_W  = 72;
const THRESHOLD = 48;

interface Props {
  onDeleteRequest: () => void;
  children: React.ReactNode;
}

export default function SwipeableRow({ onDeleteRequest, children }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef    = useRef(false);

  const snapClose = () => {
    openRef.current = false;
    Animated.spring(translateX, {
      toValue: 0, useNativeDriver: true, bounciness: 4,
    }).start();
  };

  const snapOpen = () => {
    openRef.current = true;
    Animated.spring(translateX, {
      toValue: -DELETE_W, useNativeDriver: true, bounciness: 4,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        const dx = Math.abs(gs.dx);
        const dy = Math.abs(gs.dy);
        return dx > 6 && dx > dy * 1.5;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        const base = openRef.current ? -DELETE_W : 0;
        const next = Math.min(0, Math.max(-DELETE_W - 16, base + gs.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gs) => {
        const base = openRef.current ? -DELETE_W : 0;
        const cur  = base + gs.dx;
        if (cur < -THRESHOLD) snapOpen();
        else snapClose();
      },
      onPanResponderTerminate: () => snapClose(),
    })
  ).current;

  const handleDelete = () => {
    snapClose();
    setTimeout(onDeleteRequest, 180);
  };

  return (
    <View style={sw.container}>
      {/* Delete zone — revealed as row slides left */}
      <View style={sw.deleteZone}>
        <TouchableOpacity style={sw.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Text style={sw.deleteIcon}>🗑️</Text>
          <Text style={sw.deleteLabel}>Xóa</Text>
        </TouchableOpacity>
      </View>

      {/* Sliding row content */}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const sw = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: "#1A2422",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteZone: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E74C3C",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderRadius: 16,
  },
  deleteBtn: {
    width: DELETE_W,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  deleteIcon:  { fontSize: 20 },
  deleteLabel: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
});
