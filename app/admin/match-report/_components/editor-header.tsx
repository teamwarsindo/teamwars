'use client';

interface EditorHeaderProps {
  currentTab: 'lineup' | 'game' | 'preview';
  onTabChange: (tab: 'lineup' | 'game' | 'preview') => void;
  gameCount: number;
  isSaving: boolean;
  onSave: () => void;
  statusMsg?: { type: 'success' | 'error'; text: string } | null;
}

export function EditorHeader({
  currentTab,
  onTabChange,
  gameCount,
  isSaving,
  onSave,
  statusMsg,
}: EditorHeaderProps) {
  return (
    <div className="space-y-3">
      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onTabChange('lineup')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentTab === 'lineup'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
          >
            1. Roster Lineup
          </button>

          <button
            type="button"
            onClick={() => onTabChange('game')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentTab === 'game'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
          >
            2. Game Runner ({gameCount})
          </button>

          <button
            type="button"
            onClick={() => onTabChange('preview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentTab === 'preview'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
          >
            3. Live Preview
          </button>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? 'Menyimpan...' : '💾 Simpan ke Database'}
        </button>
      </div>
    </div>
  );
    }
