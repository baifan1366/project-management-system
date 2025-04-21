'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import BulletList from '@tiptap/extension-bullet-list';
import Image from '@tiptap/extension-image';
import Blockquote from '@tiptap/extension-blockquote';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Heading1, Heading2, Type, Highlighter, Quote, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// 自定义样式扩展，通过editor.setOptions来动态添加
const customStyles = `
.ProseMirror {
  @apply outline-none min-h-[100px] h-full break-words overflow-y-auto max-h-[500px];
}

.ProseMirror p.is-editor-empty:first-child::before {
  @apply text-muted-foreground h-0 pointer-events-none;
  content: attr(data-placeholder);
}

.ProseMirror ul,
.ProseMirror ol {
  @apply pl-4;
}

.ProseMirror ul li {
  @apply list-disc ml-4;
}

.ProseMirror ol li {
  @apply list-decimal ml-4;
}

.ProseMirror h1 {
  @apply text-xl font-bold mt-3 mb-1;
}

.ProseMirror h2 {
  @apply text-lg font-bold mt-3 mb-1;
}

.ProseMirror a {
  @apply text-blue-500 underline dark:text-blue-400;
}

.ProseMirror mark {
  @apply bg-yellow-100 dark:bg-yellow-500/20 rounded-sm py-0 px-0.5;
}

.ProseMirror blockquote {
  @apply pl-4 border-l-4 border-muted my-3 italic;
}

.ProseMirror img {
  @apply max-w-full h-auto rounded-md;
}

.ProseMirror p {
  @apply my-2;
}

.bullet-list li {
  @apply list-disc ml-4;
}

.ordered-list li {
  @apply list-decimal ml-4;
}
`;

const RichEditor = ({ 
  value, 
  onChange, 
  placeholder, 
  className,
  minHeight = '100px',
  ...props 
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
      }),
      Underline,
      TextStyle,
      Color,
      Blockquote,
      ListItem,
      OrderedList.configure({
        HTMLAttributes: {
          class: 'ordered-list',
        },
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'bullet-list',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Heading.configure({
        levels: [1, 2],
      }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none px-3 py-2',
        style: `min-height: ${minHeight};`,
      },
    }
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // 添加样式到DOM
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const styleId = 'tiptap-custom-styles';
      if (!document.getElementById(styleId)) {
        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = customStyles;
        document.head.appendChild(styleElement);
      }
    }
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("rich-editor-container border rounded-md overflow-hidden hover:border-border focus-within:border-border group", className)}>
      <EditorContent editor={editor} {...props} />
      
      <div className="flex flex-wrap gap-1 p-1 border-t bg-muted/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('bold') ? 'bg-muted-foreground/20' : '')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('italic') ? 'bg-muted-foreground/20' : '')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('underline') ? 'bg-muted-foreground/20' : '')}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        
        <div className="w-px h-5 bg-border mx-1 self-center" />
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('heading', { level: 1 }) ? 'bg-muted-foreground/20' : '')}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('heading', { level: 2 }) ? 'bg-muted-foreground/20' : '')}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('paragraph') ? 'bg-muted-foreground/20' : '')}
          title="Paragraph"
        >
          <Type className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('blockquote') ? 'bg-muted-foreground/20' : '')}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </button>
        
        <div className="w-px h-5 bg-border mx-1 self-center" />
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('bulletList') ? 'bg-muted-foreground/20' : '')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('orderedList') ? 'bg-muted-foreground/20' : '')}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        
        <div className="w-px h-5 bg-border mx-1 self-center" />
        
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('URL');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('link') ? 'bg-muted-foreground/20' : '')}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('highlight') ? 'bg-muted-foreground/20' : '')}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Image URL');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('image') ? 'bg-muted-foreground/20' : '')}
          title="Image"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export { RichEditor }; 