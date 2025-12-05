// components/editor/CardEditor.tsx - Card editor component

'use client'

import { useState } from 'react'
import type { Card, Link, Padding } from '@/types/newsletter'
import { Plus, Trash2 } from 'lucide-react'
import { CTA_BUTTON_DEFAULTS } from '@/lib/config'
import dynamic from 'next/dynamic'
import ColorPicker from './ColorPicker'

// Dynamically import TiptapEditor to avoid SSR issues
const TiptapEditor = dynamic(() => import('./TiptapEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-wsu-border-light rounded-md p-4 bg-white min-h-[200px] flex items-center justify-center text-wsu-text-muted">
      Loading editor...
    </div>
  ),
})

interface CardEditorProps {
  card: Card
  onSave: (card: Card) => void
  onCancel: () => void
  onDelete?: () => void
}

export default function CardEditor({
  card,
  onSave,
  onCancel,
  onDelete,
}: CardEditorProps) {
  const [editedCard, setEditedCard] = useState<Card>(card)

  const updateCard = (updates: Partial<Card>) => {
    setEditedCard((prev) => ({ ...prev, ...updates } as Card))
  }

  // Helper to update padding - filters out undefined values
  const updatePadding = (key: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    const numValue = value === '' ? undefined : parseInt(value) || 0
    const currentPadding = editedCard.padding || {}
    const newPadding: Partial<Padding> = { ...currentPadding }

    if (numValue === undefined) {
      // Remove the key entirely if value is empty
      delete newPadding[key]
    } else {
      // Set the value
      newPadding[key] = numValue
    }

    // Only set padding if there are any keys left, otherwise set to undefined
    updateCard({
      padding: Object.keys(newPadding).length > 0 ? (newPadding as Padding | undefined) : undefined,
    })
  }

  const updateLink = (index: number, link: Link) => {
    const newLinks = [...(editedCard.links || [])]
    newLinks[index] = link
    updateCard({ links: newLinks })
  }

  const addLink = () => {
    const newLinks = [...(editedCard.links || []), { label: '', url: '' }]
    updateCard({ links: newLinks })
  }

  const removeLink = (index: number) => {
    const newLinks = editedCard.links?.filter((_, i) => i !== index) || []
    updateCard({ links: newLinks })
  }

  const handleSave = () => {
    onSave(editedCard)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-wsu-border-light p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-wsu-text-dark">
            Edit Card ({editedCard.type})
          </h2>
          <div className="flex gap-2">
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm font-medium text-wsu-text-muted border border-wsu-border-light rounded-md hover:bg-wsu-bg-light transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm font-medium text-white bg-wsu-crimson border border-wsu-crimson-dark rounded-md hover:bg-wsu-crimson-dark transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Title - Only show for card types that have a title property */}
          {'title' in editedCard && (
            <div>
              <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                Title *
              </label>
              <input
                type="text"
                value={editedCard.title || ''}
                onChange={(e) => updateCard({ title: e.target.value })}
                className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                placeholder="Card title"
              />
            </div>
          )}

          {/* Body HTML - Rich Text Editor */}
          <div>
            <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
              Body Content *
            </label>
            <TiptapEditor
              value={editedCard.body_html || ''}
              onChange={(value) => {
                updateCard({ body_html: value })
              }}
              placeholder="Enter card content..."
              style={{
                minHeight: '200px',
              }}
            />
            <p className="mt-1 text-xs text-wsu-text-muted">
              Use the toolbar to format your content with bold, italic, lists, links, tables, and more.
            </p>
          </div>

          {/* Location, Date, Time (for standard, event, resource cards) */}
          {(editedCard.type === 'standard' ||
            editedCard.type === 'event' ||
            editedCard.type === 'resource') && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editedCard.location || ''}
                    onChange={(e) => updateCard({ location: e.target.value })}
                    className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                    placeholder="Location"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                    Date
                  </label>
                  <input
                    type="text"
                    value={editedCard.date || ''}
                    onChange={(e) => updateCard({ date: e.target.value })}
                    className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                    placeholder="Date"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                    Time
                  </label>
                  <input
                    type="text"
                    value={editedCard.time || ''}
                    onChange={(e) => updateCard({ time: e.target.value })}
                    className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                    placeholder="Time"
                  />
                </div>
              </div>
            </>
          )}

          {/* Resource Card Specific Fields */}
          {editedCard.type === 'resource' && (
            <div className="border-t border-wsu-border-light pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show_icon"
                  checked={editedCard.show_icon || false}
                  onChange={(e) =>
                    updateCard({ show_icon: e.target.checked })
                  }
                  className="w-4 h-4 text-wsu-crimson border-wsu-border-light rounded focus:ring-wsu-crimson"
                />
                <label
                  htmlFor="show_icon"
                  className="text-sm font-medium text-wsu-text-dark"
                >
                  Show Icon
                </label>
              </div>
              {editedCard.show_icon && (
                <>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                      Icon URL
                    </label>
                    <input
                      type="url"
                      value={editedCard.icon_url || ''}
                      onChange={(e) =>
                        updateCard({ icon_url: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                      Icon Alt Text
                    </label>
                    <input
                      type="text"
                      value={editedCard.icon_alt || ''}
                      onChange={(e) =>
                        updateCard({ icon_alt: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                      placeholder="Icon description"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                      Icon Size (px)
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="200"
                      value={editedCard.icon_size || 80}
                      onChange={(e) =>
                        updateCard({
                          icon_size: parseInt(e.target.value) || 80,
                        })
                      }
                      className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Letter Card Specific Fields */}
          {editedCard.type === 'letter' && (
            <div className="border-t border-wsu-border-light pt-4 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                  Greeting
                </label>
                <input
                  type="text"
                  value={editedCard.greeting || ''}
                  onChange={(e) => updateCard({ greeting: e.target.value })}
                  className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  placeholder="e.g., Dear Graduate Students,"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                  Closing
                </label>
                <input
                  type="text"
                  value={editedCard.closing || ''}
                  onChange={(e) => updateCard({ closing: e.target.value })}
                  className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  placeholder="e.g., Sincerely,"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                  Signature Name
                </label>
                <input
                  type="text"
                  value={editedCard.signature_name || ''}
                  onChange={(e) =>
                    updateCard({ signature_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  placeholder="e.g., Graduate School Leadership"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                  Signature Lines (one per line)
                </label>
                <textarea
                  value={
                    editedCard.signature_lines
                      ? editedCard.signature_lines.join('\n')
                      : ''
                  }
                  onChange={(e) => {
                    const lines = e.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0)
                    updateCard({ signature_lines: lines })
                  }}
                  rows={4}
                  className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  placeholder="Title&#10;Department&#10;Organization"
                />
                <p className="mt-1 text-xs text-wsu-text-muted">
                  Enter each signature line on a separate line.
                </p>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                  Signature Image URL
                </label>
                <input
                  type="url"
                  value={editedCard.signature_image_url || ''}
                  onChange={(e) =>
                    updateCard({ signature_image_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  placeholder="https://..."
                />
              </div>
              {editedCard.signature_image_url && (
                <>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                      Signature Image Alt Text
                    </label>
                    <input
                      type="text"
                      value={editedCard.signature_image_alt || ''}
                      onChange={(e) =>
                        updateCard({ signature_image_alt: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                      placeholder="Signature"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                      Signature Image Width (px)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="500"
                      value={editedCard.signature_image_width || 220}
                      onChange={(e) =>
                        updateCard({
                          signature_image_width: parseInt(e.target.value) || 220,
                        })
                      }
                      className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* CTA Card Specific Fields */}
          {editedCard.type === 'cta' && (
            <div className="border-t border-wsu-border-light pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                    Text Alignment
                  </label>
                  <select
                    value={editedCard.text_alignment || 'left'}
                    onChange={(e) =>
                      updateCard({
                        text_alignment: e.target.value as 'left' | 'center' | 'right',
                      })
                    }
                    className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                    Button Alignment
                  </label>
                  <select
                    value={editedCard.button_alignment || 'center'}
                    onChange={(e) =>
                      updateCard({
                        button_alignment: e.target.value as
                          | 'left'
                          | 'center'
                          | 'right',
                      })
                    }
                    className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                    Button BG Color
                  </label>
                  <input
                    type="color"
                    value={
                      editedCard.button_bg_color || CTA_BUTTON_DEFAULTS.bg_color
                    }
                    onChange={(e) =>
                      updateCard({ button_bg_color: e.target.value })
                    }
                    className="w-full h-10 border border-wsu-border-light rounded-md cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                    Button Text Color
                  </label>
                  <input
                    type="color"
                    value={
                      editedCard.button_text_color ||
                      CTA_BUTTON_DEFAULTS.text_color
                    }
                    onChange={(e) =>
                      updateCard({ button_text_color: e.target.value })
                    }
                    className="w-full h-10 border border-wsu-border-light rounded-md cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="button_full_width"
                  checked={editedCard.button_full_width || false}
                  onChange={(e) =>
                    updateCard({ button_full_width: e.target.checked })
                  }
                  className="w-4 h-4 text-wsu-crimson border-wsu-border-light rounded focus:ring-wsu-crimson"
                />
                <label
                  htmlFor="button_full_width"
                  className="text-sm font-medium text-wsu-text-dark"
                >
                  Button Full Width
                </label>
              </div>
            </div>
          )}

          {/* Card Styling Options */}
          <div className="border-t border-wsu-border-light pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-wsu-text-dark mb-2">
              Card Styling
            </h3>
            
            <div>
              <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                Border Radius (px) - Override
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={editedCard.border_radius !== undefined ? editedCard.border_radius : ''}
                onChange={(e) => {
                  const value = e.target.value
                  updateCard({
                    border_radius: value === '' ? undefined : parseInt(value) || 0,
                  })
                }}
                className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                placeholder="Use global setting"
              />
              <p className="mt-1 text-xs text-wsu-text-muted">
                Override the global border radius for this card. Leave empty to use the global setting from Settings.
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-wsu-text-dark">
                Card Padding (px) - Override
              </label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-wsu-text-muted mb-1">Top</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editedCard.padding?.top !== undefined ? editedCard.padding.top : ''}
                    onChange={(e) => updatePadding('top', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                    placeholder="Global"
                  />
                </div>
                <div>
                  <label className="block text-xs text-wsu-text-muted mb-1">Right</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editedCard.padding?.right !== undefined ? editedCard.padding.right : ''}
                    onChange={(e) => updatePadding('right', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                    placeholder="Global"
                  />
                </div>
                <div>
                  <label className="block text-xs text-wsu-text-muted mb-1">Bottom</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editedCard.padding?.bottom !== undefined ? editedCard.padding.bottom : ''}
                    onChange={(e) => updatePadding('bottom', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                    placeholder="Global"
                  />
                </div>
                <div>
                  <label className="block text-xs text-wsu-text-muted mb-1">Left</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editedCard.padding?.left !== undefined ? editedCard.padding.left : ''}
                    onChange={(e) => updatePadding('left', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                    placeholder="Global"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-wsu-text-muted">
                Override the global padding for this card. Leave empty to use global settings. Useful for adding extra space below images or links.
              </p>
            </div>
          </div>

          {/* Table Styling Options */}
          <div className="border-t border-wsu-border-light pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-wsu-text-dark mb-2">
              Table Styling
            </h3>
            
            <div>
              <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                Border style
              </label>
              <select
                value={editedCard.table_border_style || 'light'}
                onChange={(e) =>
                  updateCard({
                    table_border_style: e.target.value as
                      | 'none'
                      | 'light'
                      | 'medium'
                      | 'bold',
                  })
                }
                className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
              >
                <option value="none">None</option>
                <option value="light">Light (1px)</option>
                <option value="medium">Medium (2px)</option>
                <option value="bold">Bold (3px)</option>
              </select>
            </div>

            <ColorPicker
              label="Border color"
              value={editedCard.table_border_color || '#d9d9d9'}
              onChange={(color) => updateCard({ table_border_color: color })}
            />

            <div>
              <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                Table font size (px)
              </label>
              <input
                type="number"
                min="10"
                max="24"
                value={editedCard.table_font_size || 16}
                onChange={(e) =>
                  updateCard({
                    table_font_size: parseInt(e.target.value) || 16,
                  })
                }
                className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
              />
            </div>

            <ColorPicker
              label="Header background color"
              value={editedCard.table_header_bg_color || '#f4f4f4'}
              onChange={(color) =>
                updateCard({ table_header_bg_color: color })
              }
            />

            <div>
              <label className="block mb-1 text-sm font-medium text-wsu-text-dark">
                Header underline (px)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={editedCard.table_header_underline || 0}
                onChange={(e) =>
                  updateCard({
                    table_header_underline: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
              />
            </div>

            <ColorPicker
              label="Header underline color"
              value={editedCard.table_header_underline_color || '#d9d9d9'}
              onChange={(color) =>
                updateCard({ table_header_underline_color: color })
              }
            />
          </div>

          {/* Links */}
          <div className="border-t border-wsu-border-light pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-wsu-text-dark">
                Links
              </label>
              <button
                onClick={addLink}
                className="px-2 py-1 text-xs font-medium text-wsu-crimson border border-wsu-crimson rounded-md hover:bg-wsu-crimson/10 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Link
              </button>
            </div>
            {editedCard.links && editedCard.links.length > 0 ? (
              <div className="space-y-2">
                {editedCard.links.map((link, index) => (
                  <div
                    key={index}
                    className="flex gap-2 p-2 border border-wsu-border-light rounded-md"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={link.label || ''}
                        onChange={(e) =>
                          updateLink(index, { ...link, label: e.target.value })
                        }
                        placeholder="Link label"
                        className="px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                      />
                      <input
                        type="url"
                        value={link.url || ''}
                        onChange={(e) =>
                          updateLink(index, { ...link, url: e.target.value })
                        }
                        placeholder="https://..."
                        className="px-2 py-1 text-sm border border-wsu-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-wsu-crimson"
                      />
                    </div>
                    <button
                      onClick={() => removeLink(index)}
                      className="p-1 text-red-600 hover:text-red-700"
                      title="Remove link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-wsu-text-muted">
                No links. Click &quot;Add Link&quot; to add one.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

