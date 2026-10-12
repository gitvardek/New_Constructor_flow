// Описание наполнения гардеробной системы для корзины и печати.
//
// Вход — PROPS.WARDROBEGRID позиции корзины, который собирает
// basketMapper.createWardrobeGridData (SIZE, PROFILES, SECTIONS[].FILLING).
// Сам состав туда уже уходит для расчёта цены, здесь он только разворачивается
// в читаемые строки.
//
// Названия берутся из тех же каталогов, что и в редакторе гардеробной:
// товары — CATALOG.PRODUCTS, материал полки — FASADE, цвет профиля — COLOR
// (не FASADE, см. wardrobe/types.ts), тип профиля и крепление —
// WARDROBE_SYSTEM[productId].
//
// Один источник формулировок на два рендера: BasketItem.vue (блок свойств
// позиции) и usePrint.ts (строки описания товара в КП).

import { useModelState } from "@/store/appliction/useModelState";
import { useConfigStore } from "@/store/appStore/useConfigStore";

export interface IWardrobeDescriptionGroup {
  title: string;
  items: string[];
}

export interface IWardrobeDescription {
  size: string;
  groups: IWardrobeDescriptionGroup[];
}

const mm = (value: any): string => `${Math.round(Number(value) || 0)} мм`;

// Оси подписаны, потому что порядок у элементов разный: у полки Ш×Г×Т,
// у тумбочки и у самой системы Ш×В×Г.
const dimensions = (values: any[], axes: string): string =>
  `${values.map((value) => Math.round(Number(value) || 0)).join(' × ')} мм (${axes})`;

const joined = (parts: any[], separator = ', '): string =>
  parts.filter(Boolean).join(separator);

export function buildWardrobeDescription(grid: any, wardrobeProductId: any): IWardrobeDescription | null {

  if (!grid?.SECTIONS?.length) return null;

  const modelState = useModelState();
  const { getArticleByProductId } = useConfigStore();

  const catalog: any = modelState._PRODUCTS ?? {};
  const fasade: any = modelState._FASADE ?? {};
  const color: any = modelState._COLOR ?? {};
  const wardrobeSystem: any = modelState._WARDROBE_SYSTEM?.[wardrobeProductId] ?? {};

  // getArticleByProductId уже возвращает готовую подпись "- артикул X" либо
  // пустую строку, если артикула у товара нет
  const article = (id: any): string => {
    const label = id ? getArticleByProductId(id) : '';

    return label ? ` ${label}` : '';
  };

  const productName = (id: any, fallback: string): string => catalog?.[id]?.NAME || fallback;

  const profileItems = (grid.PROFILES ?? []).map((profile: any, index: number) => {

    const name = wardrobeSystem?.profile?.[profile.ID]?.name || productName(profile.ID, 'Профиль');
    const fastening = wardrobeSystem?.fastenings?.[profile.FASTENING_ID]?.name;
    const colorName = color?.[profile.MATERIAL_ID]?.NAME;

    // SIZE профиля — его высота (число), DEPTH — сечение по глубине
    const metrics = joined([`высота ${mm(profile.SIZE)}`, profile.DEPTH ? `сечение ${mm(profile.DEPTH)}` : '']);

    return `${index + 1} ${joined([name, fastening, colorName])} — ${metrics}${article(profile.ID)}`;
  });

  const fillingItem = (item: any, index: number): string => {

    const position = `поз. ${mm(item.VALUE)}`;

    // У тумбочки своя позиция корзины (basketMapper.createCabinetItems), здесь
    // она метка без товара и цены
    if (item.PRODUCT_TYPE === 'cabinet') {
      const size = dimensions([item.SIZE?.width, item.SIZE?.height, item.SIZE?.depth], 'Ш×В×Г');
      const reference = item.BASKETID ? ' — отдельная позиция корзины' : '';

      return `${index + 1} Тумбочка — ${size}, ${position}${reference}`;
    }

    // У штанги в размерах только длина: сечение из сетки служебное
    if (item.PRODUCT_TYPE === 'rail') {
      const name = productName(item.ID, 'Штанга');

      return `${index + 1} ${name} — длина ${mm(item.SIZE?.width)}, ${position}${article(item.ID)}`;
    }

    const name = productName(item.ID, 'Полка');
    const shelfType = item.SHELF_TYPE === 'angled' ? 'наклонная' : 'прямая';
    const material = item.MATERIAL === 'glass'
      ? 'стекло'
      : joined(['ЛДСП', fasade?.[item.MATERIAL_ID]?.NAME], ' ');
    const size = dimensions([item.SIZE?.width, item.SIZE?.depth, item.SIZE?.height], 'Ш×Г×Т');

    return `${index + 1} ${joined([name, shelfType, material])} — ${size}, ${position}${article(item.ID)}`;
  };

  const groups: IWardrobeDescriptionGroup[] = [];

  if (profileItems.length) {
    groups.push({ title: `Профили (${profileItems.length})`, items: profileItems });
  }

  grid.SECTIONS.forEach((section: any, index: number) => {
    const filling = (section.FILLING ?? []).map(fillingItem);

    groups.push({
      title: `Секция ${index + 1} (${mm(section.WIDTH)})`,
      items: filling.length ? filling : ['без наполнения'],
    });
  });

  return {
    size: dimensions([grid.SIZE?.width, grid.SIZE?.height, grid.SIZE?.depth], 'Ш×В×Г'),
    groups,
  };
}

// Плоские строки для печати: вложенные строки с отступом в два пробела —
// usePrint.ts по нему отбивает их в таблице КП.
export function buildWardrobeDescriptionRows(grid: any, wardrobeProductId: any): string[] {

  const description = buildWardrobeDescription(grid, wardrobeProductId);
  if (!description) return [];

  const rows: string[] = [`Гардеробная система: ${description.size}`];

  description.groups.forEach((group) => {
    rows.push(`${group.title}:`);
    group.items.forEach((item) => rows.push(`  ${item}`));
  });

  return rows;
}
