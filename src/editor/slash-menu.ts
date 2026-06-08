import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';

export const SLASH_ITEMS = [
  {
    title: '一级标题',
    description: '大章节标题',
    icon: 'H1',
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: '二级标题',
    description: '章节标题',
    icon: 'H2',
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: '三级标题',
    description: '小节标题',
    icon: 'H3',
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: '无序列表',
    description: '圆点列表',
    icon: '•',
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: '有序列表',
    description: '编号列表',
    icon: '1.',
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: '任务列表',
    description: '带复选框的列表',
    icon: '☑',
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: '引用块',
    description: '引用文本',
    icon: '〝',
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: '代码块',
    description: '代码片段',
    icon: '<>',
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: '分割线',
    description: '水平分隔',
    icon: '—',
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: '图片',
    description: '插入图片链接',
    icon: '🖼',
    command: ({ editor, range }: any) => {
      showImageDialog(editor, range);
    },
  },
];

let _showImageDialog: ((editor: any, range: any) => void) | null = null;

export function setImageDialogHandler(handler: (editor: any, range: any) => void) {
  _showImageDialog = handler;
}

function showImageDialog(editor: any, range: any) {
  _showImageDialog?.(editor, range);
}

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: new PluginKey('slashCommands'),
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
        items: ({ query }: any) => {
          return SLASH_ITEMS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()),
          ).slice(0, 10);
        },
        render: () => {
          let popupEl: HTMLElement | null = null;
          let items: any[] = [];
          let selectedIndex = 0;

          function createPopup(props: any) {
            popupEl = document.createElement('div');
            popupEl.className = 'slash-menu';

            const list = document.createElement('div');
            list.className = 'slash-list';

            items = props.items;
            selectedIndex = 0;

            function renderItems() {
              list.innerHTML = '';
              items.forEach((item, i) => {
                const row = document.createElement('div');
                row.className = `slash-item${i === selectedIndex ? ' slash-active' : ''}`;
                row.dataset.index = String(i);

                const icon = document.createElement('span');
                icon.className = 'slash-icon';
                icon.textContent = item.icon;

                const label = document.createElement('div');
                label.className = 'slash-label';
                const titleSpan = document.createElement('span');
                titleSpan.className = 'slash-title';
                titleSpan.textContent = item.title;
                const descSpan = document.createElement('span');
                descSpan.className = 'slash-desc';
                descSpan.textContent = item.description;
                label.appendChild(titleSpan);
                label.appendChild(descSpan);

                row.appendChild(icon);
                row.appendChild(label);

                row.addEventListener('mousedown', (e) => {
                  e.preventDefault();
                  props.command({ ...props, props: item });
                });

                row.addEventListener('mouseenter', () => {
                  selectedIndex = i;
                  renderItems();
                });

                list.appendChild(row);
              });
            }

            renderItems();
            popupEl.appendChild(list);
            document.body.appendChild(popupEl);
            positionPopup(props);
          }

          function positionPopup(props: any) {
            if (!popupEl) return;
            const rect = props.clientRect?.();
            if (!rect) return;
            popupEl.style.position = 'fixed';
            popupEl.style.left = `${rect.left}px`;
            popupEl.style.top = `${rect.bottom + 4}px`;
            popupEl.style.zIndex = '1000';
          }

          return {
            onStart: (props: any) => {
              createPopup(props);
            },
            onUpdate: (props: any) => {
              items = props.items;
              selectedIndex = 0;
              const list = popupEl?.querySelector('.slash-list');
              if (list) {
                list.innerHTML = '';
                items.forEach((item, i) => {
                  const row = document.createElement('div');
                  row.className = `slash-item${i === selectedIndex ? ' slash-active' : ''}`;
                  row.dataset.index = String(i);

                  const icon = document.createElement('span');
                  icon.className = 'slash-icon';
                  icon.textContent = item.icon;

                  const label = document.createElement('div');
                  label.className = 'slash-label';
                  const titleSpan = document.createElement('span');
                  titleSpan.className = 'slash-title';
                  titleSpan.textContent = item.title;
                  const descSpan = document.createElement('span');
                  descSpan.className = 'slash-desc';
                  descSpan.textContent = item.description;
                  label.appendChild(titleSpan);
                  label.appendChild(descSpan);

                  row.appendChild(icon);
                  row.appendChild(label);

                  row.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    props.command({ ...props, props: item });
                  });

                  row.addEventListener('mouseenter', () => {
                    selectedIndex = i;
                    const allRows = list.querySelectorAll('.slash-item');
                    allRows.forEach((r, idx) =>
                      r.classList.toggle('slash-active', idx === selectedIndex),
                    );
                  });

                  list.appendChild(row);
                });
              }
              positionPopup(props);
            },
            onKeyDown: (props: any) => {
              const { event } = props;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                const rows = popupEl?.querySelectorAll('.slash-item');
                if (rows) {
                  rows.forEach((r, i) =>
                    r.classList.toggle('slash-active', i === selectedIndex),
                  );
                  rows[selectedIndex]?.scrollIntoView({ block: 'nearest' });
                }
                return true;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                const rows = popupEl?.querySelectorAll('.slash-item');
                if (rows) {
                  rows.forEach((r, i) =>
                    r.classList.toggle('slash-active', i === selectedIndex),
                  );
                  rows[selectedIndex]?.scrollIntoView({ block: 'nearest' });
                }
                return true;
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                const item = items[selectedIndex];
                if (item) {
                  props.command({ ...props, props: item });
                }
                return true;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                if (popupEl) {
                  popupEl.remove();
                  popupEl = null;
                }
                return true;
              }
              return false;
            },
            onExit: () => {
              if (popupEl) {
                popupEl.remove();
                popupEl = null;
              }
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
