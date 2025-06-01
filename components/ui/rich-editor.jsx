'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Heading1, Heading2, Type, Highlighter, Quote, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Custom style extensions
const customStyles = `
/* Editor base styles */
.ProseMirror {
  outline: none;
  min-height: 100px;
  height: auto;
  word-break: break-word;
  overflow-y: auto;
  max-height: 500px;
  color: var(--primary);
  background-color: var(--background);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.dark .ProseMirror {
  background-color: var(--dark-background);
  color: hsl(210 40% 98%);
}

/* Editor placeholder */
.ProseMirror p.is-editor-empty:first-child::before {
  color: #000000;
  height: 0;
  pointer-events: none;
  content: attr(data-placeholder);
}

.dark .ProseMirror p.is-editor-empty:first-child::before {
  color: #ffffff;
}

/* Paragraph styles */
.ProseMirror p {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

/* Heading styles */
.ProseMirror h1 {
  font-size: 1.25rem;
  font-weight: bold;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}

.ProseMirror h2 {
  font-size: 1.125rem;
  font-weight: bold;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}

/* Link styles */
.ProseMirror a {
  color: #3b82f6;
  text-decoration: underline;
}

.dark .ProseMirror a {
  color: #60a5fa;
}

/* Highlight styles */
.ProseMirror mark {
  background-color: #fef9c3;
  border-radius: 0.125rem;
  padding: 0 0.125rem;
}

.dark .ProseMirror mark {
  background-color: rgba(234, 179, 8, 0.2);
}

/* Blockquote styles */
.ProseMirror blockquote {
  padding-left: 1rem;
  border-left-width: 4px;
  border-color: var(--border);
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
  font-style: italic;
}

/* Image styles */
.ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
}

/* List styles */
.ProseMirror ul {
  padding-left: 1rem;
  list-style-type: disc;
  margin-left: 1rem;
}

.ProseMirror ol {
  padding-left: 1rem;
  list-style-type: decimal;
  margin-left: 1rem;
  counter-reset: item;
}

.ProseMirror ol li {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
  display: block;
  counter-increment: item;
}

.ProseMirror ol li:before {
  content: counter(item) ". ";
  margin-right: 0.25rem;
  color: var(--muted-foreground);
}

.ProseMirror li {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.ProseMirror li p {
  margin-top: 0;
  margin-bottom: 0;
  display: inline;
}

/* Nested list styles */
.ProseMirror li ul,
.ProseMirror li ol {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

/* Active button styles */
.is-active {
  background-color: rgba(0, 0, 0, 0.2);
}
`;

// 添加一个变量来处理CSS的编译问题
const cssVariables = {
  primary: '#000000',
  mutedForeground: 'hsl(215.4 16.3% 56.9%)',
  border: 'hsl(214.3 31.8% 91.4%)',
  background: 'hsl(0 0% 100%)',
  darkBackground: 'hsl(240 10% 3.9%)',
};

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
        heading: {
          levels: [1, 2],
          HTMLAttributes: {
            class: 'editor-heading',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'editor-paragraph',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'editor-blockquote',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'editor-bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'editor-ordered-list',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'editor-list-item',
          },
        },
      }),
      Underline,
      TextStyle,
      Color,
      Image.configure({
        inline: true,
        allowBase64: true,
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
        class: 'focus:outline-none px-3 prose max-w-none bg-background',
        style: `min-height: ${minHeight};`,
      },
    },
    immediatelyRender: false
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Add styles to DOM
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const styleId = 'tiptap-custom-styles';
      if (!document.getElementById(styleId)) {
        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        let processedStyles = customStyles
          .replace(/var\(--muted-foreground\)/g, cssVariables.mutedForeground)
          .replace(/var\(--border\)/g, cssVariables.border)
          .replace(/var\(--primary\)/g, cssVariables.primary)
          .replace(/var\(--background\)/g, cssVariables.background)
          .replace(/var\(--dark-background\)/g, cssVariables.darkBackground);
        
        styleElement.textContent = processedStyles;
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

        <div className="w-px h-5 bg-border mx-1 self-center" />

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

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={cn("p-1 rounded hover:bg-muted-foreground/10", 
            editor.isActive('highlight') ? 'bg-muted-foreground/20' : '')}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
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
      </div>
    </div>
  );
};

export { RichEditor }; 