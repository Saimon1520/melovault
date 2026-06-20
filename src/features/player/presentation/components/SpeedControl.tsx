import React, { useState } from 'react';
import TrackPlayer from 'react-native-track-player';
import { CompactSelector, type SelectorOption } from '@/shared/components/CompactSelector';

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;
const OPTIONS: SelectorOption<number>[] = SPEEDS.map(s => ({
  value: s,
  label: `${s}x`,
}));

export function SpeedControl() {
  const [speed, setSpeed] = useState(1.0);

  const applySpeed = async (s: number) => {
    setSpeed(s);
    await TrackPlayer.setRate(s);
  };

  return (
    <CompactSelector
      value={speed}
      options={OPTIONS}
      onChange={applySpeed}
      title="Velocidad de reproducción"
      icon="speedometer-outline"
      triggerLabel={`${speed}x`}
      minTriggerWidth={72}
    />
  );
}
