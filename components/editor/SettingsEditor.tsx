// components/editor/SettingsEditor.tsx - Settings editor component

import type { NewsletterData } from '@/types/newsletter'

interface SettingsEditorProps {
  state: NewsletterData
  updateState: (
    updater: (prev: NewsletterData) => NewsletterData,
    pushHistory?: boolean
  ) => void
}

export default function SettingsEditor({
  state,
  updateState,
}: SettingsEditorProps) {
  const settings = state.settings || {}

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
          Section Spacing (px)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={settings.section_spacing || 24}
          onChange={(e) =>
            updateState((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                section_spacing: parseInt(e.target.value) || 24,
              },
            }))
          }
          className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
        />
        <p className="mt-1 text-xs text-wsu-text-muted">
          Distance between section border line and title (in pixels). Default: 24px
        </p>
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
          Container Width (px)
        </label>
        <input
          type="number"
          min="560"
          max="700"
          step="10"
          value={settings.container_width || 640}
          onChange={(e) =>
            updateState((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                container_width: Math.max(
                  560,
                  Math.min(700, parseInt(e.target.value) || 640)
                ),
              },
            }))
          }
          className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
        />
        <p className="mt-1 text-xs text-wsu-text-muted">
          Default 640px; 600–700 works in most clients if images match.
        </p>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.show_section_borders !== false}
            onChange={(e) =>
              updateState((prev) => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  show_section_borders: e.target.checked,
                },
              }))
            }
            className="rounded border-wsu-border-light text-wsu-crimson focus:ring-wsu-crimson"
          />
          <span className="text-sm font-medium text-wsu-text-dark">
            Show section borders (horizontal lines)
          </span>
        </label>
        <p className="mt-1 text-xs text-wsu-text-muted">
          Toggle the red horizontal lines between sections on/off
        </p>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-wsu-text-dark">
          Global Text Padding (px)
        </h4>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="block text-xs text-wsu-text-muted mb-1">Top</label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.padding_text?.top || 20}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    padding_text: {
                      ...prev.settings.padding_text,
                      top: parseInt(e.target.value) || 20,
                    },
                  },
                }))
              }
              className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
            />
          </div>
          <div>
            <label className="block text-xs text-wsu-text-muted mb-1">Right</label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.padding_text?.right || 20}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    padding_text: {
                      ...prev.settings.padding_text,
                      right: parseInt(e.target.value) || 20,
                    },
                  },
                }))
              }
              className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
            />
          </div>
          <div>
            <label className="block text-xs text-wsu-text-muted mb-1">Bottom</label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.padding_text?.bottom || 20}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    padding_text: {
                      ...prev.settings.padding_text,
                      bottom: parseInt(e.target.value) || 20,
                    },
                  },
                }))
              }
              className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
            />
          </div>
          <div>
            <label className="block text-xs text-wsu-text-muted mb-1">Left</label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.padding_text?.left || 20}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    padding_text: {
                      ...prev.settings.padding_text,
                      left: parseInt(e.target.value) || 20,
                    },
                  },
                }))
              }
              className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-wsu-text-dark">
          Global Image Padding (px)
        </h4>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="block text-xs text-wsu-text-muted mb-1">Top</label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.padding_image?.top || 0}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    padding_image: {
                      ...prev.settings.padding_image,
                      top: parseInt(e.target.value) || 0,
                    },
                  },
                }))
              }
              className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
            />
          </div>
          <div>
            <label className="block text-xs text-wsu-text-muted mb-1">Right</label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.padding_image?.right || 15}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    padding_image: {
                      ...prev.settings.padding_image,
                      right: parseInt(e.target.value) || 15,
                    },
                  },
                }))
              }
              className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
            />
          </div>
          <div>
            <label className="block text-xs text-wsu-text-muted mb-1">Bottom</label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.padding_image?.bottom || 0}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    padding_image: {
                      ...prev.settings.padding_image,
                      bottom: parseInt(e.target.value) || 0,
                    },
                  },
                }))
              }
              className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
            />
          </div>
          <div>
            <label className="block text-xs text-wsu-text-muted mb-1">Left</label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.padding_image?.left || 0}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    padding_image: {
                      ...prev.settings.padding_image,
                      left: parseInt(e.target.value) || 0,
                    },
                  },
                }))
              }
              className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

