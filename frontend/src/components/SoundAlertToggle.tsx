import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { getSoundEnabled, setSoundEnabled } from '../hooks/useOrderSoundAlert';
import { playNewOrderSound } from '../lib/audioAlert';

export function SoundAlertToggle() {
  const [enabled, setEnabled] = useState<boolean>(getSoundEnabled);

  function toggle() {
    const next = !enabled;
    setSoundEnabled(next);
    setEnabled(next);
    // Play a preview ding when turning on so the admin knows it works
    if (next) playNewOrderSound();
  }

  return (
    <button
      onClick={toggle}
      title={enabled ? 'Sound alerts on — click to mute' : 'Sound alerts off — click to enable'}
      className={`relative flex items-center justify-center p-2.5 rounded-xl transition-colors ${
        enabled
          ? 'text-orange-500 bg-orange-50 hover:bg-orange-100'
          : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
      }`}
    >
      {enabled ? <Bell size={18} /> : <BellOff size={18} />}
      {enabled && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-orange-400 rounded-full" />
      )}
    </button>
  );
}
