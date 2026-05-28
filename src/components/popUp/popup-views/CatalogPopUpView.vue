<template>
  <div class="catalog-popup">
    <!-- <div>currentMainID:{{ currentMainID }}, currentSubID:{{ currentSubID }}, Уровень:{{ currentLevel }}, Текущая страница: {{ currentPage }}, Поиск:{{ searchQuery }}, Прайс: {{ productPrice }} </div> -->

    <div class="catalog-popup__top">
      <header class="catalog-popup__header">
        <h2 class="catalog-popup__title">Общий каталог</h2>
      </header>
      <!-- Каталог -->
      <div class="catalog-popup__search" v-if="!catalogStore.productDetails">
        <input class="catalog-popup__search-input" type="text" placeholder="Поиск..." v-model="searchQuery"
          @input="handleSearch" name="search" style="max-width: 100%" />
        <div class="catalog-popup__search-icon">
          <SearchSVG />
        </div>
        <button v-if="currentSubID" @click="resetCatalog" class="catalog-popup__search-reset">
          Сбросить
        </button>
      </div>
      <ClosePopUpButton class="catalog-popup__close-btn" @click="closePopup" />
    </div>

    <div class="catalog-popup__sections" v-if="!catalogStore.productDetails">
      <div class="catalog-popup__sections_left">
        <div v-for="section in filteredCategories" :key="section.ID" class="catalog-section"
          :class="{ active: currentMainID === section.ID }" @click="handleCategoriesListClick(section)"
          v-memo="[section.ID, currentMainID === section.ID]">
          <h3 class="catalog-section__title">
            {{ section.NAME }}
          </h3>
        </div>
      </div>

      <div class="catalog-popup__sections_right">
        <div v-if="breadcrumb.length > 0" class="breadcrumb-container">
          <div class="breadcrumb">
            <template v-for="(item, index) in breadcrumb" :key="item.id">
              <span class="breadcrumb__separator" v-if="index > 0">/</span>
              <span class="breadcrumb__item" :class="{ active: index === breadcrumb.length - 1 }" @click="
                index !== breadcrumb.length - 1
                  ? handleBreadcrumbClick(item)
                  : null
                ">
                {{ item.name }}
              </span>
            </template>
          </div>
        </div>
        <div v-if="filteredSubCategories.length > 0" class="catalog-popup__level-two">
          <div v-for="subsection in displayedSubCategories" :key="subsection.ID" class="catalog-section-sub"
            :class="{ active: currentSubID === subsection.ID }" @click="handleSubCategoriesListClick(subsection)"
            v-memo="[subsection.ID, currentSubID === subsection.ID]">
            <h3 class="catalog-section__title">
              {{ subsection.NAME }}
            </h3>
          </div>
          <button v-if="hasMoreSubCategories" @click="toggleShowAllSubCategories"
            class="catalog-section-sub catalog-section-sub__show-more-btn">
            <span class="catalog-section__title">{{
              showAllSubCategories
                ? "Скрыть"
                : `Показать еще (${filteredSubCategories.length - 6})`
            }}</span>
          </button>
        </div>
        <div v-if="products.length > 0" class="products-grid">
          <div v-for="product in products" :key="product.ID" class="product-item"
            v-memo="[product.ID, product.NAME, product.PRICE, product.IMG]">
            <div class="product-item__img">
              <img :src="product?.IMG
                ? `${API_URL}${product.IMG}`
                : `/upload/709778d1-2ada-44ff-99a6-ac20e9ea9b03.png`
                " :alt="product?.NAME || 'Product image'" loading="lazy" />
            </div>
            <div class="product-item__wrapper">
              <h4 class="product-item__title" @click="callChildMethod(Number(product.ID))" style="cursor: pointer">
                {{ product.NAME }}
                <!-- {{ appData.appData.CATALOG.PRODUCTS[product?.ID]?.DATA_PETROVICH }} -->
                <span>
                  {{
                    appData.appData?.article[
                      appData.appData.CATALOG.PRODUCTS[product?.ID]?.DATA_PETROVICH
                    ]?.PROPERTIES?.ARTICLE?.VALUE
                      ? `- ${appData.appData?.article[
                        appData.appData.CATALOG.PRODUCTS[product?.ID]?.DATA_PETROVICH
                      ]?.PROPERTIES?.ARTICLE?.VALUE}`
                      : ''
                  }}
                </span>
              </h4>

              <div class="product-item__footer">
                <div class="product-item__price">{{ product.PRICE }}</div>
                <button class="product-item__basket" @click="callChildMethod(Number(product.ID))">
                  В корзину
                </button>
              </div>

              <!-- <button class="product-item__basket" @click="handleProductClick(Number(product.ID))">В корзину</button> -->
            </div>
          </div>
        </div>
        <div v-else class="product-none">
          В данном разделе товаров не найдено
        </div>
        <div style="margin-top: auto">
          <Pagination :nav-data="pagination" @page-changed="handlePageChange" v-show="pagination" />
        </div>
      </div>
    </div>

    <!-- <ProductDetails 
      :productDetails="catalogStore.productDetails" 
      @back="handleBackPage" 
      ref="productDetailsRef" 
    /> -->

    <ProductDetails ref="productDetailsRef" :productDetails="catalogStore.productDetails" @back="handleBackPage" />

    <div v-if="isLoading" class="catalog-popup__loader"></div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, nextTick } from "vue";
import { storeToRefs } from "pinia";

// Components
import MainInput from "@/components/ui/inputs/MainInput.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import MainButton from "@/components/ui/buttons/MainButton.vue";
import Pagination from "@/components/ui/pagination/Pagination.vue";

// Stores
import { usePopupStore } from "@/store/appStore/popUpsStore";
import { useCatalogStore } from "@/store/appStore/catalogStore";

// Icons
import SearchSVG from "@/components/ui/svg/SearchSVG.vue";
import ProductDetails from "@/components/product-details/ProductDetails.vue";
import { useAppData } from "@/store/appliction/useAppData";
import { BASE_DOMAIN } from "@/utils/originalDomain";

// const API_URL = ref('https://dev.vardek.online');
const API_URL = ref(`https://${BASE_DOMAIN}`);

const popupStore = usePopupStore();
const catalogStore = useCatalogStore();
const appData = useAppData();

// Создаем ref для дочернего компонента
const productDetailsRef = ref(null);

const callChildMethod = (id) => {
  if (productDetailsRef.value) {
    productDetailsRef.value.getProductHTML(id); // Вызываем метод
  } else {
    console.error("Дочерний компонент не найден!");
  }
};

// State from store
const {
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
} = storeToRefs(catalogStore);

const {
  fetchInitialCatalog,
  fetchSubCatalogData,
  setDreadcrumb,
  resetCatalogData,
  updateProductPrice,
  fetchProductPrice,
} = catalogStore;

const searchTimeout = ref(null);
const showAllSubCategories = ref(false);

// Использование в шаблоне
const filteredCategories = computed(() =>
  filterHiddenCategories(сategoriesList.value),
);
const filteredSubCategories = computed(() =>
  filterHiddenCategories(subCategoriesList.value),
);
const displayedSubCategories = computed(() => {
  const categories = filteredSubCategories.value;
  return showAllSubCategories.value ? categories : categories.slice(0, 6);
});
const hasMoreSubCategories = computed(
  () => filteredSubCategories.value.length > 6,
);
const priceProduct = computed(() =>
  catalogStore.updateProductPrice(productPrice.value),
);

onMounted(async () => {
  console.log(appData.appData.CITY.config);
  console.log(appData.appData.CITY.style);
  await catalogStore.fetchInitialCatalog({
    idSection: false,
    page: "1",
    query: false,
    config: appData.appData.CITY.config,
    style: appData.appData.CITY.style,
  });
});

watch(
  () => productPrice.value,
  (newValue, oldValue) => {
    console.log("Цена изменилась:", oldValue, "→", newValue);
    catalogStore.updateProductPrice(productPrice.value);
    // Дополнительные действия при изменении
  },
);

// Methods
const handleCategoriesListClick = async (data) => {
  showAllSubCategories.value = false; // Сбрасываем состояние при переходе
  catalogStore.resetCatalogData();
  catalogStore.setDreadcrumb(data.ID, data.DEPTH_LEVEL, data.NAME);
  await catalogStore.fetchSubCatalogData({
    idSection: data.ID,
    config: appData.appData.CITY.config,
    style: appData.appData.CITY.style,
  });
};

const handleSubCategoriesListClick = async (data) => {
  showAllSubCategories.value = false; // Сбрасываем состояние при переходе
  catalogStore.setDreadcrumb(data.ID, data.DEPTH_LEVEL, data.NAME);
  await catalogStore.fetchSubCatalogData({
    idSection: data.ID,
    config: appData.appData.CITY.config,
    style: appData.appData.CITY.style,
  });
  catalogStore.searchQuery = "";
};

const handleBreadcrumbClick = async (data) => {
  showAllSubCategories.value = false; // Сбрасываем состояние при переходе
  trimArrayByLevel(data.level);
  await catalogStore.fetchSubCatalogData({
    idSection: data.id,
    config: appData.appData.CITY.config,
    style: appData.appData.CITY.style,
  });
  catalogStore.searchQuery = "";
};

const handlePageChange = async (page) => {
  await catalogStore.fetchSubCatalogData({
    idSection: catalogStore.currentSubID,
    page: page,
    query: catalogStore.searchQuery,
  });
};

const handleSearch = () => {
  clearTimeout(searchTimeout.value);

  searchTimeout.value = setTimeout(async () => {
    await catalogStore.fetchSubCatalogData({
      idSection: currentSubID.value,
      page: currentPage.value,
      query: searchQuery.value,
    });

    if (!searchQuery.value.length && !catalogStore.currentSubID) {
      catalogStore.resetCatalogData();
    }
  }, 500);
};

const handleProductClick = async (id) => {
  selectedProductId.value = id;
  const formData = new FormData();
  formData.append("ID", id.toString());
  formData.append("custom_price_type", false);

  await catalogStore.fetchProductDetails(formData);
};

const filterHiddenCategories = (categories) => {
  return categories?.filter((category) => !category.hidden) || [];
};

const trimArrayByLevel = (targetLevel) => {
  const targetLevelNum = parseInt(targetLevel);
  breadcrumb.value = breadcrumb.value.filter(
    (item) => parseInt(item.level) <= targetLevelNum,
  );
};

const closePopup = () => {
  catalogStore.resetCatalogData();
  popupStore.closePopup("catalog");
};

const resetCatalog = () => {
  showAllSubCategories.value = false; // Сбрасываем состояние при сбросе
  catalogStore.resetCatalogData();
};

const handleBackPage = () => {
  catalogStore.productDetails = null;
};

const toggleShowAllSubCategories = () => {
  showAllSubCategories.value = !showAllSubCategories.value;
};
</script>

<style lang="scss" scoped>
.catalog-popup__top {
  position: relative;
  display: flex;
  gap: 2rem;
  align-items: center;

}

.catalog-popup {
  position: relative;
  width: 760px;
  // padding: 20px;
  border-radius: 8px;
  box-sizing: border-box;
  height: 80vh; // Ограничиваем максимальную высоту попапа
  display: flex;
  flex-direction: column;

  @media (min-width: 992px) {
    width: 900px;
  }

  @media (min-width: 1440px) {
    width: 1300px;
  }

  @media (min-width: 1700px) {
    width: 1500px;
  }

  &__header {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0; // Запрещаем сжатие заголовка
  }

  &__title {
    font-weight: 600;
    font-size: 3rem;
    line-height: 100%;
    letter-spacing: 0%;
    text-align: center;
  }

  &__close-btn {
    position: absolute;
    right: -15px;
    top: -15px;
    // transform: translate(-50%, -50%);
    cursor: pointer;
  }

  &__search {
    position: relative;
    margin: 5px auto;
    width: 50%;

    &-icon {
      width: 20px;
      height: 20px;
      position: absolute;
      left: 5px;
      top: 50%;
      transform: translate(0, -50%);
    }

    &-input {
      // max-width: 500px;
      width: 100%;

      flex-shrink: 0; // Запрещаем сжатие поиска
      padding: 5px;
      padding-left: 45px;
    }

    &-reset {
      max-width: 100px;
      // height: 44px;
      opacity: 1;
      border-radius: 15px;
      padding: 0.5rem 1rem;
      background: #da444c;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: none;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      color: white;
      /* если есть текст */
      font-family: inherit;
      /* или укажите нужный шрифт */
      font-size: 1.4rem;
      /* примерный размер, подберите под ваш дизайн */
      transition: background 0.3s ease;
      /* плавное изменение фона */
      position: absolute;
      right: 0;
      top: 50%;
      transform: translate(0, -50%);
    }

    &-reset:hover {
      background: #c03a42;
      /* немного темнее при наведении */
    }
  }

  &__sections {
    display: flex;
    flex-direction: column;
    margin-top: 20px;
    gap: 20px;
    flex-grow: 1; // Занимаем всё доступное пространство
    overflow: hidden; // Скрываем переполнение
    // overflow-y: auto; // Добавляем скролл при необходимости

    @media (min-width: 768px) {
      flex-direction: row;
    }

    &_left {
      width: 100%;
      max-width: 25%;
      display: flex;
      flex-direction: column;
      overflow-y: auto; // Добавляем скролл при необходимости
      gap: 5px;
      padding-right: 8px;
      box-sizing: border-box;
      flex-shrink: 0; // Фиксируем ширину
      min-height: 0;

      // @media (min-width: 768px) {
      //   width: 20%;
      //   height: 100%; // Занимаем всю высоту родителя
      // }
    }

    &_right {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 5px;
      box-sizing: border-box;
      flex-grow: 1; // Занимаем оставшееся пространство
      // height: 100%; // Занимаем всю высоту родителя
      min-height: 0;
      padding-right: 0.5rem;

      @media (min-width: 768px) {
        width: 80%;
      }
    }
  }

  &__level-two {
    display: flex;
    flex-wrap: wrap;

    gap: 5px; // Используем gap вместо margin для более предсказуемого поведения
    margin-bottom: 5px;

    .catalog-section {
      width: calc(50% - 0.5rem);

      @media (min-width: 576px) {
        width: calc(33.333% - 0.666rem);
      }

      @media (min-width: 992px) {
        width: calc(25% - 0.75rem);
      }
    }
  }

  &__show-more-btn {
    width: 100%;
    height: 44px;
    border: 1px solid #c6c6c6;
    border-radius: 8px;
    background: transparent;
    color: #5d6069;
    font-weight: 600;
    font-size: 1.4rem;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 10px;

    &:hover {
      border-color: #131313;
      color: #131313;
      background: #f6f5fa;
    }
  }

  &__loader {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    position: absolute;
    top: 1px;
    left: 0;
    animation: rotate 1s linear infinite;
  }

  &__loader::before,
  &__loader::after {
    content: "";
    box-sizing: border-box;
    position: absolute;
    inset: 0px;
    border-radius: 50%;
    border: 5px solid #da444c73;
    animation: prixClipFix 2s linear infinite;
  }

  &__loader::after {
    border-color: #da444c;
    animation:
      prixClipFix 2s linear infinite,
      rotate 0.5s linear infinite reverse;
    inset: 6px;
  }
}

.catalog-section-sub,
.catalog-section {
  padding: 0.5rem 1rem;
  border: 1px solid #c6c6c6;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;

  &.active {
    border-color: #131313;
    border: 1px solid #131313;
  }

  &:hover {
    color: #131313;
    border: 1px solid #131313;
    // transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &__title {
    font-weight: 600;
    font-size: 1.4rem;
    line-height: 100%;
    letter-spacing: 0%;
    color: #5d6069;
  }
}

// .catalog-section-sub {
//   padding: 10px 15px;
//   border-radius: 15px;
// }

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  overflow-y: auto; // Добавляем скролл при необходимости
  padding-right: 0.5rem;

  @media (min-width: 1440px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.product-item {
  padding: 1remm;
  border-radius: 6px;
  transition: all 0.2s;
  background-color: #f6f5fa;
  display: flex;

  &:hover {
    // border-color: $primary;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &__img {
    padding: 0.7rem;
    min-width: 50px;
    max-width: 95px;
    width: 100%;
    // height: 160px;
    margin-right: 20px;
    border-radius: 8px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain; // или cover, в зависимости от потребностей
      display: block;
      transition: transform 0.3s ease;
    }
  }

  &__wrapper {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    padding: 0.5rem;
  }

  &__price,
  &__title {
    font-weight: 600;
    font-size: 1.4rem;
    line-height: 100%;
    letter-spacing: 0%;
    color: #111b21;
  }

  // &__basket {
  //   // margin-top: auto;
  // }

  &__basket {
    max-width: 150px;
    // height: 44px;
    opacity: 1;
    border-radius: 15px;
    padding: 0.5rem 1rem;
    background: #da444c;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: none;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    color: white;
    /* если есть текст */
    font-family: inherit;
    /* или укажите нужный шрифт */
    font-size: 1.4rem;
    /* примерный размер, подберите под ваш дизайн */
    transition: background 0.3s ease;
    /* плавное изменение фона */
  }

  &__basket:hover {
    background: #c03a42;
    /* немного темнее при наведении */
  }

  &__basket::before {
    content: "";
    display: inline-block;
    width: 20px;
    /* размер иконки */
    height: 20px;
    /* размер иконки */
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>');
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }

  &__footer{
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.product-none {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  font-weight: 600;
  font-size: 1.6rem;
  line-height: 100%;
  letter-spacing: 0%;
  vertical-align: middle;
  color: #a3a9b5;
}

.breadcrumb {
  display: inline-flex;
  margin-bottom: 0.5rem;

  &__separator {
    margin: 0 10px;
    position: relative;
    // bottom: 3px;
  }

  &__item {
    font-size: 1.2rem;
    line-height: 100%;
    letter-spacing: 0%;
    color: #a3a9b5;
    cursor: pointer;

    &.active {
      font-weight: 600;
      color: #131313;
      cursor: auto;
    }
  }
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@keyframes prixClipFix {
  0% {
    clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0);
  }

  25% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0);
  }

  50% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%);
  }

  75% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 100%);
  }

  100% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 0);
  }
}

.catalog-section-sub__show-more-btn {
  background-color: #da444c;

  span {
    color: #fff;
  }
}
</style>
