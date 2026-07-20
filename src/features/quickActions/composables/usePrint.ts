import { useScreenshotsStore, IScreenshot } from "@/features/store/screenshotsStore/screenshotsStore";
import { useBasketStore } from "@/store/appStore/useBasketStore";
import { useRoomState } from "@/store/appliction/useRoomState";
import { _URL } from "@/types/constants";
import { useAppData } from "@/store/appliction/useAppData";

export const usePrint = () => {
  const printPage = async () => {
    try {
      // Получаем store скриншотов
      const screenshotsStore = useScreenshotsStore();
      const screenshots: IScreenshot[] = screenshotsStore.getScreenshots();

      const basketStore = useBasketStore();
      const roomState = useRoomState();

      // Для печати используем те же данные, что и во вкладке "Все комнаты": объединённая корзина всех комнат
      const rooms = roomState.getRooms || [];
      const mergedBasketItems = rooms.flatMap((room: { basket?: string | unknown }) => {
        try {
          const raw = room.basket;
          const roomBasket =
            typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? { scene: raw, catalog: [] } : { scene: [], catalog: [] };
          return [
            ...(roomBasket.scene || []),
            ...(roomBasket.catalog || []),
          ];
        } catch {
          return [];
        }
      });

      if (mergedBasketItems.length > 0) {
        await basketStore.syncBasketMulti(mergedBasketItems);
      }

      const basketData = basketStore.basketData;
      
      // Получаем данные приложения для доступа к названиям цветов
      const appDataStore = useAppData();
      const appData = appDataStore.getAppData;
      
      // Построение текстового описания товара из PROPS (аналог renderDescription в BasketItem.vue)
      const buildItemDescription = (product: any): string[] => {
        const rows: string[] = [];
        const props = product?.PROPS;
        if (!props) return rows;

        const resolveColor = (id: any): string => {
          if (!id) return '';
          return appData?.FASADE?.[id]?.NAME || appData?.COLOR?.[id]?.NAME || String(id);
        };

        // DOORS: цвета фасадов UM по секциям/дверям/частям
        if (props.DOORS) {
          for (const [doorNum, doorData] of Object.entries(props.DOORS as any)) {
            for (const [partNum, partData] of Object.entries(doorData as any)) {
              if (typeof partData === 'number') {
                rows.push(`Цвет фасада ${doorNum}: дверь ${doorNum} часть ${+partNum + 1}: ${resolveColor(partData)}`);
              } else {
                for (const [elemNum, matId] of Object.entries(partData as any)) {
                  rows.push(`Цвет фасада ${doorNum}: дверь ${partNum} часть ${+elemNum + 1}: ${resolveColor(matId)}`);
                }
              }
            }
          }
        }

        // FASADE: массив фасадов для обычных товаров
        if (!props.DOORS && Array.isArray(props.FASADE)) {
          props.FASADE.forEach((fasade: any, i: number) => {
            const n = i + 1;
            if (fasade.COLOR) rows.push(`Цвет ${n}: ${resolveColor(fasade.COLOR)}`);
            if (fasade.MILLING) rows.push(`Фрезеровка ${n}: ${appData?.MILLING?.[fasade.MILLING]?.NAME || fasade.MILLING}`);
            if (fasade.PALETTE) rows.push(`Палитра ${n}: ${appData?.PALETTE?.[fasade.PALETTE]?.NAME || fasade.PALETTE}`);
            if (fasade.GLASS) rows.push(`Стекло ${n}: ${appData?.GLASS?.[fasade.GLASS]?.NAME || fasade.GLASS}`);
            if (fasade.PATINA) rows.push(`Патина ${n}: ${appData?.PATINA?.[fasade.PATINA]?.NAME || fasade.PATINA}`);
          });
        }

        // BODY: размеры
        const size = props.BODY?.SIZE;
        if (size?.WIDTH) rows.push(`Ширина: ${size.WIDTH}`);
        if (size?.HEIGHT) rows.push(`Высота: ${size.HEIGHT}`);
        if (size?.DEPTH) rows.push(`Глубина: ${size.DEPTH}`);

        // Цвет корпуса: для UM — MODULECOLOR, для обычных — BODY.COLOR
        const bodyColorId = props.MODULECOLOR || props.BODY?.COLOR;
        if (bodyColorId) rows.push(`Цвет корпуса: ${resolveColor(bodyColorId)}`);

        // Задняя / боковые стенки
        if (props.BACKWALL?.COLOR) rows.push(`Задняя стенка: ${resolveColor(props.BACKWALL.COLOR)}`);
        if (props.LEFTSIDECOLOR?.COLOR) rows.push(`Левая стенка: ${resolveColor(props.LEFTSIDECOLOR.COLOR)}`);
        if (props.RIGHTSIDECOLOR?.COLOR) rows.push(`Правая стенка: ${resolveColor(props.RIGHTSIDECOLOR.COLOR)}`);
        if (props.TOPFASADECOLOR?.COLOR) rows.push(`Накладка на крышку: ${resolveColor(props.TOPFASADECOLOR.COLOR)}`);

        // Вариант компоновки (FILLING)
        if (props.FILLING) {
          const fillingName = appData?.CATALOG?.PRODUCTS?.[props.FILLING]?.NAME;
          if (fillingName) rows.push(`Вариант компоновки: ${fillingName}`);
        }

        // Горизонт
        if (props.HORIZONT !== undefined && props.HORIZONT !== null) {
          rows.push(`Горизонт: ${props.HORIZONT}`);
        }

        // Опции
        if (Array.isArray(props.OPTION) && props.OPTION.length) {
          props.OPTION.forEach((optId: any) => {
            const name = appData?.OPTION?.[optId]?.NAME;
            if (name) rows.push(`Опции: ${name}`);
          });
        }

        // Размеры секций SECTIONS1..10
        for (let i = 1; i <= 10; i++) {
          const val = props[`SECTIONS${i}`];
          if (val !== undefined && val !== null) rows.push(`Размер секции ${i}: ${val}`);
        }

        // Наполнение секций SECTIONSFILLING1..10
        for (let i = 1; i <= 10; i++) {
          const filling = props[`SECTIONSFILLING${i}`];
          if (Array.isArray(filling) && filling.length) {
            rows.push(`Наполнение секции ${i}:`);
            filling.forEach((f: any, idx: number) => {
              const pName = appData?.CATALOG?.PRODUCTS?.[f.ID]?.NAME || `Товар ${f.ID}`;
              const pos = f.VALUE ? `поз. ${f.VALUE} мм` : '';
              rows.push(`  ${idx + 1} ${pName}: — ${pos}`);
            });
          }
        }

        return rows;
      };

      console.log('Найдено скриншотов для печати:', screenshots.length);
      if (screenshots.length > 0) {
        console.log('Детали скриншотов:', screenshots.map(s => ({
          room: s.roomLabel,
          mode: s.mode,
          timestamp: new Date(s.timestamp).toLocaleString()
        })));
      }
      
      // Данные корзины
      const cartData = {
        items: basketData?.products?.map((item: any) => {
          return {
            name: item.product?.NAME || 'Неизвестный товар',
            description: buildItemDescription(item.product),
            quantity: item.product?.quantity || 1,
            unitPrice: item.product?.unitPriceFormat || '—',
            allPrice: item.product?.allPriceFormat || '—',
            allPriceOld: item.product?.allPriceOldFormat || '—',
            previewPicture: item.product?.PREVIEW_PICTURE || null,
          };
        }) || [],
        totalFormat: basketData?.basket?.sumFormat || '—',
        totalOldFormat: basketData?.basket?.sumFormatOld || '—',
      };

      // Показываем индикатор загрузки
      console.log('Подготовка к печати...');

      // Удаляем старые элементы печати, если они существуют
      const existingPrintDiv = document.getElementById('print-content');
      if (existingPrintDiv) {
        // Очищаем созданные URL для Blob объектов перед удалением
        const existingImages = existingPrintDiv.querySelectorAll('img');
        existingImages.forEach(img => {
          if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
          }
        });
        document.body.removeChild(existingPrintDiv);
      }

      // Создаём скрытый div с печатным содержимым
      const printDiv = document.createElement('div');
      printDiv.id = 'print-content';
      
      // Добавляем каждую комнату на отдельную страницу
      if (screenshots.length > 0) {
        // Группируем скриншоты по комнатам
        const roomGroups = new Map<string, IScreenshot[]>();
        screenshots.forEach((screenshot: IScreenshot) => {
          if (!roomGroups.has(screenshot.roomId)) {
            roomGroups.set(screenshot.roomId, []);
          }
          roomGroups.get(screenshot.roomId)!.push(screenshot);
        });
        
        let isFirstRoom = true;
        roomGroups.forEach((roomScreenshots: IScreenshot[], roomId: string) => {
          const roomLabel = roomScreenshots[0]?.roomLabel || `Комната ${roomId}`;
          
          let roomHTML = `
            <div class="a4-page">
              <div class="screenshot-container">
          `;
          
          // Добавляем заголовок только на первую страницу
          if (isFirstRoom) {
            roomHTML += `<h2 class="print-title">3D Скриншоты проекта</h2>`;
            isFirstRoom = false;
          }
          
          roomHTML += `
                <div class="room-section">
                  <h3 class="room-title">${roomLabel}</h3>
                  <div class="room-screenshots">
          `;
          
          roomScreenshots.forEach((screenshot: IScreenshot) => {
            const modeText = screenshot.mode === 'drawing' ? 'Режим чертежа' : 'Обычный режим';
            const blobUrl = URL.createObjectURL(screenshot.blob);
            
            roomHTML += `
              <div class="screenshot-item">
                <h4 class="screenshot-mode">${modeText}</h4>
                <img src="${blobUrl}" alt="${screenshot.fileName}" class="screenshot-image" />
                <p class="screenshot-info">Создан: ${new Date(screenshot.timestamp).toLocaleString()}</p>
              </div>
            `;
          });
          
          roomHTML += `
                  </div>
                </div>
              </div>
            </div>
          `;
          
          printDiv.innerHTML += roomHTML;
        });
      }

            // Добавляем данные корзины
            printDiv.innerHTML += `
            <div class="a4-page">
              <div class="cart-section">
                <h2 class="print-title">Данные корзины</h2>
                ${cartData.items.length > 0 ? `
                <table class="cart-table">
                  <thead>
                    <tr>
                      <th>Фото</th>
                      <th>Наименование</th>
                      <th>Количество</th>
                      <th>Цена</th>
                      <th>Сумма</th>
                      <th>Сумма без скидки</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cartData.items.map(item => `
                  <tr>
                    <td class="item-photo">
                      ${item.previewPicture ? `<img src="${_URL}${item.previewPicture}" alt="${item.name}" class="item-photo-img" />` : '—'}
                    </td>
                    <td class="item-name">
                      <strong>${item.name}</strong>
                      ${item.description.length ? item.description.map(row =>
                        row.startsWith('  ')
                          ? `<span style="display:block;padding-left:12px;font-size:11px;color:#777;line-height:1.4;">${row.trim()}</span>`
                          : `<span style="display:block;font-size:11px;color:#555;line-height:1.4;">${row}</span>`
                      ).join('') : ''}
                    </td>
                    <td class="item-quantity">${item.quantity}</td>
                    <td class="item-price">${item.unitPrice}</td>
                    <td class="item-amount">${item.allPrice}</td>
                    <td class="item-amount-no-discount">${item.allPriceOld}</td>
                  </tr>
                `).join('')}
                  </tbody>
                  <tfoot>
                    <tr class="summary-row">
                      <td colspan="4" class="summary-label">Итого без скидки:</td>
                      <td colspan="2" class="summary-value total-no-discount">${cartData.totalOldFormat}</td>
                    </tr>
                    <tr class="summary-row">
                      <td colspan="4" class="summary-label">Итого со скидкой:</td>
                      <td colspan="2" class="summary-value total-price">${cartData.totalFormat}</td>
                    </tr>
                  </tfoot>
                </table>
                ` : '<p>Корзина пуста</p>'}
              </div>
            </div>
          `;

      // Добавляем стили для печати
      // Удаляем старые стили печати, если они существуют
      const existingStyles = Array.from(document.head.querySelectorAll('style')).find(
        style => style.textContent?.includes('#print-content')
      );
      if (existingStyles) {
        document.head.removeChild(existingStyles);
      }

      const printStyles = document.createElement('style');
      printStyles.textContent = `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        
        .a4-page {
          page-break-after: always;
          padding: 0px;
          margin: 0;
          max-width: 100%;
        }
        
        .print-title {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 30px;
          color: #333;
        }
        
        .room-section {
          margin-bottom: 30px;
        }
        
        .room-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #444;
          text-align: center;
        }
        
        .room-screenshots {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        
        .screenshot-item {
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9f9f9;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .screenshot-mode {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #555;
          text-align: center;
        }
        
        .screenshot-image {
          width: 100%;
          max-height: 36vh;
          height: auto;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .screenshot-info {
          font-size: 12px;
          color: #666;
          text-align: center;
          margin-top: 10px;
        }
        
        .cart-section {
          margin-top: 30px;
        }
        
        .cart-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 14px;
        }
        
        .cart-table thead {
          background-color: #f5f5f5;
        }
        
        .cart-table th {
          padding: 12px 8px;
          text-align: left;
          border: 1px solid #ddd;
          font-weight: 600;
          font-size: 14px;
          color: #333;
          background-color: #f5f5f5;
        }
        
        .cart-table th:first-child {
          width: 110px;
          text-align: center;
        }
        
        .cart-table th:nth-child(2) {
          min-width: 200px;
        }
        
        .cart-table th:nth-child(3),
        .cart-table th:nth-child(4),
        .cart-table th:nth-child(5),
        .cart-table th:nth-child(6) {
          width: 100px;
          text-align: right;
        }
        
        .cart-table td {
          padding: 12px 8px;
          border: 1px solid #ddd;
          font-size: 14px;
          color: #555;
          vertical-align: top;
        }
        
        .cart-table tbody tr:nth-child(even) {
          background-color: #fafafa;
        }
        
        .cart-table tbody tr:hover {
          background-color: #f0f0f0;
        }
        
        .item-photo {
          text-align: center;
          color: #999;
          width: 110px;
        }
        
        .item-photo-img {
          max-width: 90px;
          max-height: 90px;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .item-name {
          font-weight: 600;
          color: #333;
        }
        
        .item-quantity {
          text-align: right;
        }
        
        .item-price {
          text-align: right;
        }
        
        .item-amount {
          text-align: right;
          font-weight: 600;
          color: #333;
        }
        
        .item-amount-no-discount {
          text-align: right;
          color: #999;
          text-decoration: line-through;
        }
        
        .cart-table tfoot {
          border-top: 2px solid #333;
          background-color: #f9f9f9;
        }
        
        .cart-table tfoot .summary-row {
          font-weight: 600;
        }
        
        .cart-table tfoot .summary-label {
          text-align: right;
          font-size: 16px;
          color: #555;
          font-weight: 600;
        }
        
        .cart-table tfoot .summary-value {
          text-align: right;
          font-size: 18px;
          font-weight: 600;
        }
        
        .cart-table tfoot .summary-value.total-price {
          color: #333;
        }
        
        .cart-table tfoot .summary-value.total-no-discount {
          color: #999;
          text-decoration: line-through;
        }
      `;

      document.head.appendChild(printStyles);
      document.body.appendChild(printDiv);

      // Ждём загрузки всех изображений перед печатью
      const images = printDiv.querySelectorAll('img');
      if (images.length > 0) {
        console.log(`Ожидаем загрузки ${images.length} изображений...`);
        
        const imagePromises = Array.from(images).map((img, index) => {
          return new Promise<void>((resolve, reject) => {
            // Если изображение уже загружено
            if (img.complete && img.naturalWidth > 0) {
              console.log(`Изображение ${index + 1} уже загружено`);
              resolve();
              return;
            }

            // Обработчики событий
            img.onload = () => {
              console.log(`Изображение ${index + 1} загружено успешно`);
              resolve();
            };
            img.onerror = () => {
              console.warn(`Ошибка загрузки изображения ${index + 1}`);
              reject(new Error(`Ошибка загрузки изображения ${index + 1}`));
            };

            // Таймаут для предотвращения бесконечного ожидания
            const timeout = setTimeout(() => {
              if (img.complete && img.naturalWidth > 0) {
                console.log(`Изображение ${index + 1} загружено по таймауту`);
                resolve();
              } else {
                reject(new Error(`Таймаут загрузки изображения ${index + 1}`));
              }
            }, 5000);

            // Очистка таймаута при успешной загрузке
            img.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
          });
        });

        try {
          await Promise.all(imagePromises);
          console.log('Все изображения успешно загружены, открываю диалог печати...');
        } catch (error) {
          console.warn('Некоторые изображения не загрузились, но продолжаем печать:', error);
        }
      }

      // Печатаем
      window.print();

      // Убираем временные элементы после печати
      window.addEventListener('afterprint', function cleanup() {
        // Очищаем созданные URL для Blob объектов
        const images = printDiv.querySelectorAll('img');
        images.forEach(img => {
          if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
          }
        });
        
        document.head.removeChild(printStyles);
        document.body.removeChild(printDiv);
        window.removeEventListener('afterprint', cleanup);
      });

    } catch (error) {
      console.error('Ошибка при печати:', error);
      window.print?.();
    }
  };

  return { printPage };
};
