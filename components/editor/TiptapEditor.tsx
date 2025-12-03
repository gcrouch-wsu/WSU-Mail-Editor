// components/editor/TiptapEditor.tsx - Tiptap rich text editor component

'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
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
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
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
      const html = editor.getHTML()
      // Normalize empty content
      const normalizedValue =
        html === '<p></p>' || html.trim() === '' ? '' : html
      onChange(normalizedValue)
    },
  })

  // Update content when value prop changes (but not from internal changes)
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentHtml = editor.getHTML()
      const normalizedCurrent =
        currentHtml === '<p></p>' || currentHtml.trim() === '' ? '' : currentHtml

      // Only update if the value is different (to avoid infinite loops)
      if (normalizedCurrent !== value) {
        editor.commands.setContent(value || '', { emitUpdate: false })
      }
    }
  }, [value, editor])

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
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('bold')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('italic')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('underline')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('strike')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-wsu-border-light mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-wsu-border-light mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('bulletList')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('orderedList')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-wsu-border-light mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive({ textAlign: 'left' })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
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
          className={`px-2 py-1 text-sm rounded flex items-center justify-center ${
            editor.isActive('link')
              ? 'bg-wsu-crimson text-white'
              : 'bg-white text-wsu-text-dark hover:bg-wsu-bg-light'
          } border border-wsu-border-light`}
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        {editor.isActive('link') && (
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
          className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>
        {editor.isActive('table') && (
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

        {/* Other */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-2 py-1 text-sm rounded flex items-center justify-center bg-white text-wsu-text-dark hover:bg-wsu-bg-light border border-wsu-border-light disabled:opacity-50"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

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

