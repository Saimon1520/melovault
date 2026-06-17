import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useActiveTrack } from 'react-native-track-player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from './MiniPlayer';

/**
 * Mini-player docked at the bottom of full-screen modals (playlists, favorites,
 * archived, hidden songs…). RN `<Modal>`s open a separate native window that
 * covers the app's main mini-player, so each browsing modal renders its own
 * copy here to keep playback visible and controllable while browsing.
 *
 * Tapping the title (`onExpand`) closes the host modal, revealing the main UI
 * where the full player can be opened. Play/pause/next/swipe work in place. The
 * GestureHandlerRootView is required for the swipe gesture to work inside a Modal.
 */
export function DockedMiniPlayer({ onRequestClose }: { onRequestClose: () => void }) {
  const activeTrack = useActiveTrack();
  const insets = useSafeAreaInsets();
  if (!activeTrack) return null;
  return (
    <GestureHandlerRootView
      style={{ position: 'absolute', left: insets.left, right: insets.right, bottom: 6 + insets.bottom }}
    >
      <MiniPlayer onExpand={onRequestClose} />
    </GestureHandlerRootView>
  );
}
