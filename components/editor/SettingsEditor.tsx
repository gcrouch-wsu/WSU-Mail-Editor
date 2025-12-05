// components/editor/SettingsEditor.tsx - Settings editor component

import type { NewsletterData, Shadow } from '@/types/newsletter'
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

  // Helper to get shadow object with defaults
  const getShadow = (shadow: Shadow | boolean | undefined, defaultShadow: Shadow): Shadow => {
    if (typeof shadow === 'boolean') {
      return { ...defaultShadow, enabled: shadow }
    }
    return shadow || defaultShadow
  }

  const accentBarShadow = getShadow(settings.accent_bar_shadow, {
    enabled: false,
    color: '#A60F2D',
    blur: 8,
    spread: 0,
    offset_x: 0,
    offset_y: 2,
    opacity: 0.3,
  })

  const cardShadow = getShadow(settings.card_shadow, {
    enabled: false,
    color: '#000000',
    blur: 8,
    spread: 0,
    offset_x: 0,
    offset_y: 2,
    opacity: 0.1,
  })

  const updateAccentBarShadow = (updates: Partial<Shadow>) => {
    updateState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        accent_bar_shadow: { ...accentBarShadow, ...updates },
      },
    }))
  }

  const updateCardShadow = (updates: Partial<Shadow>) => {
    updateState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        card_shadow: { ...cardShadow, ...updates },
      },
    }))
  }

  return (
    <div className="space-y-6">
      {/* Layout Section */}
      <section className="border border-wsu-border-light rounded-lg p-4 bg-white">
        <h3 className="text-base font-bold text-wsu-text-dark mb-4 pb-2 border-b border-wsu-border-light">
          Layout
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                className="w-full px-3 py-2 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
              />
              <p className="mt-1 text-xs text-wsu-text-muted">
                Default: 640px
              </p>
            </div>
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
                className="w-full px-3 py-2 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
              />
              <p className="mt-1 text-xs text-wsu-text-muted">
                Default: 24px
              </p>
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
              className="w-full px-3 py-2 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
            />
            <p className="mt-1 text-xs text-wsu-text-muted">
              Vertical spacing between cards. Default: 20px
            </p>
          </div>
        </div>
      </section>

      {/* Section Borders */}
      <section className="border border-wsu-border-light rounded-lg p-4 bg-white">
        <h3 className="text-base font-bold text-wsu-text-dark mb-4 pb-2 border-b border-wsu-border-light">
          Section Borders
        </h3>
        <div className="space-y-4">
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
                Show horizontal divider lines
              </span>
            </label>
          </div>

          {settings.show_section_borders !== false && (
            <>
              <ColorPicker
                label="Divider Color"
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
                  Default: 0px for both
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Padding Section */}
      <section className="border border-wsu-border-light rounded-lg p-4 bg-white">
        <h3 className="text-base font-bold text-wsu-text-dark mb-4 pb-2 border-b border-wsu-border-light">
          Global Padding
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-wsu-text-dark">
              Text Padding (px)
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
              Image Padding (px)
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
      </section>

      {/* Card Styling Section */}
      <section className="border border-wsu-border-light rounded-lg p-4 bg-white">
        <h3 className="text-base font-bold text-wsu-text-dark mb-4 pb-2 border-b border-wsu-border-light">
          Card Styling
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
              Border Radius (px)
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
              className="w-full px-3 py-2 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-wsu-text-muted">
              Default: 0 (sharp corners). Individual cards can override.
            </p>
          </div>
        </div>
      </section>

      {/* Accent Bar Section */}
      <section className="border border-wsu-border-light rounded-lg p-4 bg-white">
        <h3 className="text-base font-bold text-wsu-text-dark mb-4 pb-2 border-b border-wsu-border-light">
          Accent Bar
        </h3>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.accent_bar_enabled !== false}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      accent_bar_enabled: e.target.checked,
                    },
                  }))
                }
                className="rounded border-wsu-border-light text-wsu-crimson focus:ring-wsu-crimson"
              />
              <span className="text-sm font-medium text-wsu-text-dark">
                Show accent bar on standard/event cards
              </span>
            </label>
            <p className="mt-1 text-xs text-wsu-text-muted ml-6">
              Crimson vertical bar on the left edge of cards
            </p>
          </div>

          {settings.accent_bar_enabled !== false && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                  Width (px)
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
                  className="w-full px-3 py-2 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  placeholder="4"
                />
                <p className="mt-1 text-xs text-wsu-text-muted">
                  Default: 4px
                </p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accent_bar_color || '#A60F2D'}
                    onChange={(e) =>
                      updateState((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          accent_bar_color: e.target.value,
                        },
                      }))
                    }
                    className="h-10 w-16 border border-wsu-border-light rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                  <input
                    type="text"
                    value={settings.accent_bar_color || '#A60F2D'}
                    onChange={(e) =>
                      updateState((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          accent_bar_color: e.target.value,
                        },
                      }))
                    }
                    className="flex-1 px-2 py-2 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson font-mono"
                    placeholder="#A60F2D"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Shadow Effects Section */}
      <section className="border border-wsu-border-light rounded-lg p-4 bg-white">
        <h3 className="text-base font-bold text-wsu-text-dark mb-4 pb-2 border-b border-wsu-border-light">
          Shadow Effects
        </h3>

        {/* Accent Bar Shadow */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-wsu-text-dark">Accent Bar Shadow</h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={accentBarShadow.enabled}
                onChange={(e) => updateAccentBarShadow({ enabled: e.target.checked })}
                className="rounded border-wsu-border-light text-wsu-crimson focus:ring-wsu-crimson"
              />
              <span className="text-sm text-wsu-text-dark">Enabled</span>
            </label>
          </div>

          {accentBarShadow.enabled && (
            <div className="space-y-3 pl-4 border-l-2 border-wsu-crimson/20">
              <div>
                <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                  Shadow Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentBarShadow.color}
                    onChange={(e) => updateAccentBarShadow({ color: e.target.value })}
                    className="h-8 w-16 border border-wsu-border-light rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={accentBarShadow.color}
                    onChange={(e) => updateAccentBarShadow({ color: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs border border-wsu-border-light rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                    Blur (px)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={accentBarShadow.blur}
                    onChange={(e) => updateAccentBarShadow({ blur: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                    Spread (px)
                  </label>
                  <input
                    type="number"
                    min="-20"
                    max="50"
                    value={accentBarShadow.spread}
                    onChange={(e) => updateAccentBarShadow({ spread: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                    Opacity
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={accentBarShadow.opacity}
                    onChange={(e) => updateAccentBarShadow({ opacity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                    Offset X (px)
                  </label>
                  <input
                    type="number"
                    min="-50"
                    max="50"
                    value={accentBarShadow.offset_x}
                    onChange={(e) => updateAccentBarShadow({ offset_x: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                    Offset Y (px)
                  </label>
                  <input
                    type="number"
                    min="-50"
                    max="50"
                    value={accentBarShadow.offset_y}
                    onChange={(e) => updateAccentBarShadow({ offset_y: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card Shadow */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-wsu-text-dark">Card Shadow</h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cardShadow.enabled}
                onChange={(e) => updateCardShadow({ enabled: e.target.checked })}
                className="rounded border-wsu-border-light text-wsu-crimson focus:ring-wsu-crimson"
              />
              <span className="text-sm text-wsu-text-dark">Enabled</span>
            </label>
          </div>

          {cardShadow.enabled && (
            <div className="space-y-3 pl-4 border-l-2 border-wsu-crimson/20">
              <div>
                <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                  Shadow Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cardShadow.color}
                    onChange={(e) => updateCardShadow({ color: e.target.value })}
                    className="h-8 w-16 border border-wsu-border-light rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={cardShadow.color}
                    onChange={(e) => updateCardShadow({ color: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs border border-wsu-border-light rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                    Blur (px)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={cardShadow.blur}
                    onChange={(e) => updateCardShadow({ blur: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                    Spread (px)
                  </label>
                  <input
                    type="number"
                    min="-20"
                    max="50"
                    value={cardShadow.spread}
                    onChange={(e) => updateCardShadow({ spread: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                    Opacity
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={cardShadow.opacity}
                    onChange={(e) => updateCardShadow({ opacity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                    Offset X (px)
                  </label>
                  <input
                    type="number"
                    min="-50"
                    max="50"
                    value={cardShadow.offset_x}
                    onChange={(e) => updateCardShadow({ offset_x: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-wsu-text-dark">
                    Offset Y (px)
                  </label>
                  <input
                    type="number"
                    min="-50"
                    max="50"
                    value={cardShadow.offset_y}
                    onChange={(e) => updateCardShadow({ offset_y: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
