import type { TabNode, TabContent } from '@/api/types';

export const mockTabs: TabNode[] = [
  {
    id: 1,
    title: 'Кухонные шкафы',
    children: [
      {
        id: 11,
        title: 'Верхние шкафы',
        children: [
          { id: 111, title: 'Шкаф 60 см', children: [] },
          { id: 112, title: 'Шкаф 80 см', children: [] },
        ],
      },
      {
        id: 12,
        title: 'Нижние шкафы',
        children: [
          { id: 121, title: 'Шкаф под мойку', children: [] },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Столешница',
    children: [
      {
        id: 21,
        title: 'Материалы',
        children: [
          { id: 211, title: 'ЛДСП', children: [] },
          { id: 212, title: 'Камень', children: [] },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Бытовая техника',
    children: [
      {
        id: 31,
        title: 'Встраиваемая',
        children: [
          { id: 311, title: 'Духовой шкаф', children: [] },
        ],
      },
    ],
  },
];

export const mockTabContent: TabContent = {
  id: 1,
  title: 'Учебный материал',
  content: {
    text: 'Моковый контент. Обновите интеграцию с API, чтобы получать реальные данные.',
    images: [],
    videos: [],
    links: [],
  },
}; 