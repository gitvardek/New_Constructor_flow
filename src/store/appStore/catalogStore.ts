// @ts-nocheck
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CatalogService } from '@/services/catalogService'

export const useCatalogStore = defineStore('catalog', () => {
  // State
  const currentMainID = ref<number | string | null | boolean | undefined>(false) // ID level 1
  const сategoriesList = ref<CatalogSectionItem[]>([]) // Категории уровня 1

  const currentSubID = ref<number | string | null | boolean | undefined>(false) // ID подкатегории
  const subCategoriesList = ref<any[]>([]) // Подкатегории 

  const products = ref<any[]>([]) // Список продуктов 
  const productDetails = ref<any>(null) // Характеристики продукта
  const productPrice = ref<any>('') // Стоимость продукта

  const currentPage = ref<string | number | boolean>('1'); // Текущая страница
	const currentLevel =  ref<any>(null); // текущий левел 

	const pagination = ref<{}>({}) // Пагинация
	const breadcrumb =  ref<any[]>([]); // хлебные крошки
  
  const searchQuery = ref<string>(""); // если это строка запроса
  
  const isLoading = ref(false)
  const error = ref<any>(null)

  // Actions
  // Вызов 
  const fetchInitialCatalog = async (idSection, page, query, config, style) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await CatalogService.getCatalogList(idSection, page, query,config, style)
      
      if (!response?.sections) {
        throw new Error('Invalid server response: missing sections')
      }

      // const data = await processSections(response.sections);
      // сategoriesList.value = data;
      // console.log(response.sections);
      // console.log(data);
      сategoriesList.value = response.sections;
    } catch (err) {
      error.value = err
      console.error('Error loading initial catalog:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const processSections = async (sections) => {
    // Проверяем, что sections — массив и не пустой
    if (!Array.isArray(sections) || sections.length === 0) {
      return [];
    }

    // Собираем все промисы и ждём их выполнения
    const sectionsNew = await Promise.all(
      sections.map(async (section) => {

        try {
          const data = await fetchSubCatalogData(section.ID);
          return data; // Предполагается, что fetchSubCatalogData возвращает объект с items и pager
        } catch (error) {
          console.error(`Error fetching data for section ${section.ID}:`, error);
          // Возвращаем заглушку или null, если запрос упал
          return null;
        }
      })
    );

    // Фильтруем: исключаем объекты, где items пустой массив И pager равен false
    // Также исключаем null/undefined, если были ошибки
    const filteredSections = sectionsNew.filter(item => {
      if (!item) return false; // исключаем null/undefined
      const isEmptyItems = Array.isArray(item.items) && item.items.length === 0;
      const isPagerFalse = item.pager === false;
      // Удаляем, если и пустые items, и pager === false
      return !(isEmptyItems && isPagerFalse);
    });

    return filteredSections;
  }

  const fetchSubCatalogData = async ({ idSection, page, query = false, config, style }: CatalogListParams) => {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await CatalogService.getCatalogList({ idSection, page, query, config, style });
      
      if (!response) {
        throw new Error('Invalid server response');
      }

      // Обработка секций
      if (response.sections?.length > 0) {
        handleSectionsResponse(response.sections, idSection);
      }

      products.value = response.items || [];
      currentPage.value = page ?? '1'
      if (response.pager) {
        handlePaginationResponse(response.pager);
      } else {
        pagination.value = {};
      }

    } catch (err) {
      error.value = err;
      console.error('Error loading catalog data:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchProductDetails = async (formData: any) => {
    try {
      isLoading.value = true
      error.value = null
      productDetails.value = null
      
      const details = await CatalogService.getProductDetails(formData)
      
      if (!details) {
        throw new Error('Product details not found')
      }

      productDetails.value = details
      return details
    } catch (err) {
      error.value = err
      console.error('Error loading product details:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  };
  
  const fetchProductPrice = async (formData: any) => {
    try {
      isLoading.value = true
      error.value = null

      const price = await CatalogService.getProductPrice(formData)
      
      if (!price) {
        throw new Error('Product details not found')
      }

      productPrice.value = price;
      return price
    } catch (err) {
      error.value = err
      console.error('Error loading product details:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  };
  


  // Helpers
  const handleSectionsResponse = (sections: CatalogSectionItem[] | "undefined", idSection: any ) => {
    if (sections === "undefined" || !sections.length) return [];
    const depthLevel = sections[0].DEPTH_LEVEL;
    currentLevel.value = depthLevel;

    if (depthLevel === '1') {
      сategoriesList.value = sections;
      currentMainID.value = idSection;
    } else {
      subCategoriesList.value = sections;
      currentSubID.value = idSection;
    }
  };

  const handlePaginationResponse = (pager: NavigationData) => {
    pagination.value = pager;
    currentPage.value = pager.NavPageNomer || "1";
  };

  const setDreadcrumb = (id: any, level: string, name: string) => {
		const levelNum = parseInt(level);
		breadcrumb.value = breadcrumb.value.slice(0, levelNum - 1);
		breadcrumb.value.push({
			name,
			level,
			id,
		});
		if (level === '1') currentMainID.value = id;
		if (level !== '1') currentSubID.value = id;
	};

  const resetCatalogData = () => {
    currentMainID.value = false;
    currentSubID.value = false;
    subCategoriesList.value = [];
    products.value = [];
		breadcrumb.value = [];
    pagination.value = {};
    searchQuery.value = "";
    currentPage.value ="1";
    productDetails.value = null;
    productPrice.value ="";

  };

  const updateProductPrice = (data:any) => {
    try {
        // Скрываем спиннер и показываем блоки с ценами
        const loader = document.querySelector('.spinner__loader_price');
        const priceBlock = document.querySelector('.product__price');
        const discountBlock = document.querySelector('.product__price.not__discount');
        
        if (loader) loader.style.display = 'none';
        if (priceBlock) priceBlock.style.display = 'block';
        if (discountBlock) discountBlock.style.display = 'block';

        // Устанавливаем оригинальную цену
        const priceElement = document.querySelector('.product__price-text');
        if (priceElement) priceElement.innerHTML = data;

        // Получаем коэффициент из скрытого поля (по умолчанию 1)
        const coefficientInput = document.querySelector('[name="NOT_DISCOUNT"]');
        const discountCoefficient = coefficientInput ? parseFloat(coefficientInput.value) : 1;

        // Извлекаем число из строки формата "53 634 руб"
        const originalPrice = parseFloat(data.replace(/\s+/g, '').replace('руб', ''));

        // Новая формула расчета: цена / (2 - кэф)
        // Добавляем проверку, чтобы знаменатель не был равен 0
        const denominator = 2 - discountCoefficient;
        const newPrice = denominator !== 0 ? originalPrice / denominator : originalPrice;

        // Форматируем результат (разделяем тысячные разряды пробелами)
        const formattedPrice = newPrice.toLocaleString('ru-RU') + ' руб';

        // Обновляем элемент с ценой
        const discountPriceElement = document.querySelector('.product__price-notdiscount');
        if (discountPriceElement) {
            discountPriceElement.innerHTML = formattedPrice;
        }
    } catch (error) {
        console.error('Ошибка при обновлении цены:', error);
    }
  };



  return {
    // State
    currentMainID,
    сategoriesList,
    currentSubID,
    subCategoriesList,
    products,
    productDetails,
    productPrice,
    currentPage,
    currentLevel,
    pagination,
    breadcrumb,
    searchQuery,
    isLoading,
    error,

    // Actions
    fetchInitialCatalog,
    fetchSubCatalogData,
    setDreadcrumb,
    resetCatalogData,
    fetchProductDetails,
    updateProductPrice,
    fetchProductPrice,
  }
})