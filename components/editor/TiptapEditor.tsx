// components/editor/TiptapEditor.tsx - Tiptap rich text editor component

'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState } from 'react'
import PromptModal from './PromptModal'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Unlink,
  Table as TableIcon,
  Plus,
  Minus,
  X,
  Undo,
  Redo,
  Code,
  Eye,
} from 'lucide-react'

interface TiptapEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
}

export default function TiptapEditor({
  value,
  onChange,
  placeholder = 'Enter content...',
  style,
}: TiptapEditorProps) {
  const [linkPromptOpen, setLinkPromptOpen] = useState(false)
  const [codeView, setCodeView] = useState(false)
  const [htmlCode, setHtmlCode] = useState('')
  const [listSpacing, setListSpacing] = useState('1.0')
  const [hasLists, setHasLists] = useState(false)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Exclude default list extensions so we can configure them separately
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      // Configure list extensions to preserve HTMLAttributes (for line-height)
      BulletList.configure({
        HTMLAttributes: {
          class: 'bullet-list',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'ordered-list',
        },
      }),
      ListItem,
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-wsu-crimson underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (codeView) return // Don't update from editor when in code view
      const html = editor.getHTML()
      
      // Check if document has lists (for showing spacing control)
      const documentHasLists = /<(ul|ol)([^>]*)>/gi.test(html)
      setHasLists(documentHasLists)
      
      // Normalize empty content
      const normalizedValue =
        html === '<p></p>' || html.trim() === '' ? '' : html
      onChange(normalizedValue)
      setHtmlCode(normalizedValue) // Keep code view in sync
    },
  })

  // Update content when value prop changes (but not from internal changes)
  useEffect(() => {
    if (editor && value !== undefined && !codeView) {
      const currentHtml = editor.getHTML()
      const normalizedCurrent =
        currentHtml === '<p></p>' || currentHtml.trim() === '' ? '' : currentHtml
      const normalizedValue =
        value === '<p></p>' || (value || '').trim() === '' ? '' : (value || '')

      // Only update if the value is different (to avoid infinite loops)
      if (normalizedCurrent !== normalizedValue) {
        editor.commands.setContent(normalizedValue, { emitUpdate: false })
        setHtmlCode(normalizedValue)
        // Check if content has lists
        const documentHasLists = /<(ul|ol)([^>]*)>/gi.test(normalizedValue)
        setHasLists(documentHasLists)
      }
    }
  }, [value, editor, codeView])

  // Sync htmlCode when value changes externally
  useEffect(() => {
    if (value !== undefined) {
      setHtmlCode(value || '')
    }
  }, [value])

  // Handle code view toggle
  const handleToggleCodeView = () => {
    if (codeView) {
      // Switching from code view to WYSIWYG
      // Update editor with code view content
      if (editor) {
        try {
          editor.commands.setContent(htmlCode || '', { emitUpdate: false })
          onChange(htmlCode || '')
        } catch (error) {
          console.error('Error setting content from code view:', error)
          // Revert to editor content on error
          setHtmlCode(editor.getHTML())
        }
      }
    } else {
      // Switching from WYSIWYG to code view
      // Get current HTML from editor
      if (editor) {
        const currentHtml = editor.getHTML()
        const normalized = currentHtml === '<p></p>' || currentHtml.trim() === '' ? '' : currentHtml
        setHtmlCode(normalized)
      }
    }
    setCodeView(!codeView)
  }

  // Handle code view changes
  const handleCodeChange = (newCode: string) => {
    setHtmlCode(newCode)
    // Update parent immediately for code view
    onChange(newCode)
  }

  // Handle list spacing change
  const handleListSpacingChange = (spacing: string) => {
    setListSpacing(spacing)
    if (editor) {
      const spacingValue = parseFloat(spacing) || 1.0
      
      // Update CSS variable for visual feedback in editor
      if (editor.view.dom) {
        const editorElement = editor.view.dom.closest('.tiptap-editor') || editor.view.dom
        if (editorElement instanceof HTMLElement) {
          editorElement.style.setProperty('--list-line-height', spacingValue.toString())
        }
      }
      
      // Get current HTML and update list styles directly
      // This approach ensures styles are preserved in the HTML output
      const currentHtml = editor.getHTML()
      
      // Update all <ul> and <ol> tags to include line-height
      const updatedHtml = currentHtml.replace(
        /<(ul|ol)([^>]*)>/gi,
        (match, tag, attrs) => {
          // Extract existing style if present
          let existingStyle = ''
          const styleMatch = attrs.match(/style="([^"]*)"/i)
          if (styleMatch) {
            existingStyle = styleMatch[1]
          }
          
          // Update or add line-height
          let newStyle = existingStyle
          if (existingStyle.includes('line-height:')) {
            // Replace existing line-height
            newStyle = existingStyle.replace(/line-height:\s*[^;]+;?/gi, `line-height: ${spacingValue};`)
          } else {
            // Add line-height to existing style or create new style
            newStyle = existingStyle 
              ? `${existingStyle} line-height: ${spacingValue};` 
              : `line-height: ${spacingValue};`
          }
          
          // Replace or add style attribute
          if (styleMatch) {
            return match.replace(/style="[^"]*"/i, `style="${newStyle.trim()}"`)
          } else {
            const trimmedAttrs = attrs.trim()
            const newAttrs = trimmedAttrs ? ` ${trimmedAttrs}` : ''
            return `<${tag}${newAttrs} style="${newStyle.trim()}">`
          }
        }
      )
      
      // Update editor content if HTML changed
      if (updatedHtml !== currentHtml) {
        editor.commands.setContent(updatedHtml, { emitUpdate: false })
        // Trigger onChange to sync with parent
        onChange(updatedHtml)
      }
    }
  }

  if (!editor) {
    return (
      <div
        style={style}
        className="border border-wsu-border-light rounded-md p-4 min-h-[200px] flex items-center justify-center text-wsu-text-muted"
      >
        Loading editor...
      </div>
    )
  }

  return (
    <div style={style} className="border border-wsu-border-light rounded-md bg-white">
      {/* Toolbar */}
      <div className="border-b border-wsu-border-light p-2 flex flex-wrap gap-2 bg-wsu-bg-light">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run() || codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('bold')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run() || codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('italic')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('underline')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run() || codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('strike')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-wsu-border-light mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-wsu-border-light mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('bulletList')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('orderedList')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        {((editor.isActive('bulletList') || editor.isActive('orderedList') || hasLists) && !codeView) && (
          <div className="flex items-center gap-1 px-2 border border-wsu-border-light rounded bg-white">
            <label className="text-xs text-wsu-text-muted whitespace-nowrap">Spacing:</label>
            <input
              type="number"
              value={listSpacing}
              onChange={(e) => handleListSpacingChange(e.target.value)}
              onBlur={(e) => {
                // Validate and apply on blur
                const value = parseFloat(e.target.value)
                if (isNaN(value) || value < 0.5 || value > 2.0) {
                  // Reset to default if invalid
                  setListSpacing('1.0')
                  handleListSpacingChange('1.0')
                } else {
                  handleListSpacingChange(e.target.value)
                }
              }}
              min="0.5"
              max="2.0"
              step="0.1"
              className="text-xs border-0 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-wsu-crimson w-16"
              title="List line spacing (0.5-2.0)"
              placeholder="1.0"
            />
          </div>
        )}

        <div className="w-px h-6 bg-wsu-border-light mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          disabled={codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive({ textAlign: 'left' })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          disabled={codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          disabled={codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-wsu-border-light mx-1" />

        {/* Link */}
        <button
          type="button"
          onClick={() => {
            setLinkPromptOpen(true)
          }}
          disabled={codeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('link')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light disabled:opacity-50`}
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        {editor.isActive('link') && !codeView && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light"
            title="Remove Link"
          >
            <Unlink className="w-4 h-4" />
          </button>
        )}

        <div className="w-px h-6 bg-wsu-border-light mx-1" />

        {/* Table */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          disabled={codeView}
          className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>
        {editor.isActive('table') && !codeView && (
          <>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              disabled={!editor.can().addColumnBefore()}
              className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
              title="Add Column Before"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              disabled={!editor.can().addColumnAfter()}
              className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
              title="Add Column After"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              disabled={!editor.can().deleteColumn()}
              className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
              title="Delete Column"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              disabled={!editor.can().addRowBefore()}
              className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
              title="Add Row Before"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              disabled={!editor.can().addRowAfter()}
              className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
              title="Add Row After"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              disabled={!editor.can().deleteRow()}
              className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
              title="Delete Row"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              disabled={!editor.can().deleteTable()}
              className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
              title="Delete Table"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        <div className="w-px h-6 bg-wsu-border-light mx-1" />

        {/* Code View Toggle */}
        <button
          type="button"
          onClick={handleToggleCodeView}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            codeView
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title={codeView ? 'Switch to Visual Editor' : 'Switch to HTML Code View'}
        >
          {codeView ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
        </button>

        <div className="w-px h-6 bg-wsu-border-light mx-1" />

        {/* Other */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo() || codeView}
          className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo() || codeView}
          className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content or Code View */}
      {codeView ? (
        <div className="p-4">
          <textarea
            value={htmlCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full min-h-[200px] font-mono text-sm border border-wsu-border-light rounded p-3 focus:outline-none focus:ring-2 focus:ring-wsu-crimson resize-y"
            placeholder="Enter HTML code..."
            style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}
          />
          <p className="mt-2 text-xs text-wsu-text-muted">
            Edit HTML directly. Click the eye icon to return to visual editor.
          </p>
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}

      {/* Link Prompt Modal */}
      <PromptModal
        isOpen={linkPromptOpen}
        title="Insert Link"
        message="Enter the URL for the link:"
        defaultValue={editor.getAttributes('link').href || ''}
        placeholder="https://..."
        onConfirm={(url) => {
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
          setLinkPromptOpen(false)
        }}
        onCancel={() => setLinkPromptOpen(false)}
      />
    </div>
  )
}

