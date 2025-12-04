// components/editor/SettingsEditor.tsx - Settings editor component

import type { NewsletterData } from '@/types/newsletter'
import ColorPicker from './ColorPicker'

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
          Distance between the horizontal divider line and the section title (margin-top of H2). Default: 24px
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

      <div className="space-y-3">
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
            Toggle the horizontal lines between sections on/off
          </p>
        </div>

        {settings.show_section_borders !== false && (
          <>
            <ColorPicker
              label="Divider Line Color"
              value={settings.divider_color || '#e0e0e0'}
              onChange={(color) =>
                updateState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    divider_color: color,
                  },
                }))
              }
            />

            <div>
              <h4 className="mb-2 text-sm font-semibold text-wsu-text-dark">
                Divider Vertical Spacing (px)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-wsu-text-muted mb-1">Space Above</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.divider_margin_top !== undefined ? settings.divider_margin_top : 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0
                      updateState((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          divider_margin_top: value,
                        },
                      }))
                    }}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs text-wsu-text-muted mb-1">Space Below</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.divider_margin_bottom !== undefined ? settings.divider_margin_bottom : 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0
                      updateState((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          divider_margin_bottom: value,
                        },
                      }))
                    }}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-wsu-text-muted">
                Adjusts vertical spacing above and below the divider lines. Default: 0px for both.
              </p>
            </div>
          </>
        )}
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
        <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
          Card Spacing (px)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={settings.card_spacing !== undefined ? settings.card_spacing : 20}
          onChange={(e) => {
            const value = parseInt(e.target.value) || 0
            updateState((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                card_spacing: value,
              },
            }))
          }}
          className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
        />
        <p className="mt-1 text-xs text-wsu-text-muted">
          Vertical spacing between cards (margin-bottom). Individual cards can override this. Default is 20px.
        </p>
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
          Card Border Radius (px)
        </label>
        <input
          type="number"
          min="0"
          max="50"
          value={settings.card_border_radius || 0}
          onChange={(e) =>
            updateState((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                card_border_radius: parseInt(e.target.value) || 0,
              },
            }))
          }
          className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
          placeholder="0"
        />
        <p className="mt-1 text-xs text-wsu-text-muted">
          Default border radius for all cards. Individual cards can override this. Default is 0 (sharp corners).
        </p>
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
          Accent Bar Width (px)
        </label>
        <input
          type="number"
          min="0"
          max="50"
          value={settings.accent_bar_width || 4}
          onChange={(e) =>
            updateState((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                accent_bar_width: parseInt(e.target.value) || 4,
              },
            }))
          }
          className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
          placeholder="4"
        />
        <p className="mt-1 text-xs text-wsu-text-muted">
          Width of the crimson accent bar on standard and event cards. Default is 4px. Increase to extend horizontally into the card.
        </p>
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

