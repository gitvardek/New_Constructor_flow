import axios from 'axios'

// Константы
// const API_URL = 'https://vardek.ru'
const API_URL = 'https://dev.vardek.online/'
// const BASE_API_URL = `${API_URL}/local/templates/constructor/API`
const BASE_API_URL = `${API_URL}api/modeller/catalog/getlist/`
const REQUEST_TIMEOUT = 10000


// Сервис
export const CatalogService = {
  async ensureHeaderInitialized() {
    try {
      await this.initHeader();
    } catch (error) {
      console.warn('Header initialization failed, continuing anyway:', error);
    }
  },
  async getCatalogList({
    idSection = false,
    page = '1',
    query = false,
    config = '43830',
    style = '689680'
  }: CatalogListParams = {}): Promise<CatalogResponse> {
    await this.ensureHeaderInitialized();
    // setTimeout(() => {

    // })
    try {
      let filter = ''
      if (query) filter = `&filter=${query}`
      const { data } = await axios.get(
        `${BASE_API_URL}?config=${config}&style=${style}&cityid=17281&cityidprice=17281&section=${idSection}&type=catalog&page=${page}${filter}&userid=22541`,
        // `${BASE_API_URL}?config=43830&style=689680&cityid=17281&cityidprice=17281&section=${idSection}&type=catalog&page=${page}${filter}&userid=22541`,
        // `${BASE_API_URL}/data.get.php?config=43830&style=689680&cityid=17281&cityidprice=17281&section=${idSection}&type=catalog&page=${page}${filter}`,
        // https://dev.vardek.online/api/modeller/catalog/getlist/?config=43830&style=689680&cityid=17281&cityidprice=17281&section=2483&type=catalog&page=1
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: REQUEST_TIMEOUT
        }
      )
      return data.DATA
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Ошибка при подключении к серверу')
      }
      throw error
    }
  },

  async getProductDetails( data: ProductRequestData): Promise<ProductDetailsResponse> {
    try {
      const url = `https://vardek.ru/local/templates/constructor/API/catalog.element.get.php`
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: REQUEST_TIMEOUT
      })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Ошибка при получении деталей продукта')
      }
      throw error
    }
  },
  async getProductPrice(formData: ProductRequestData): Promise<ProductPriceResponse> {
    try {
      const url = `https://vardek.ru/local/templates/constructor/API/catalog.element.getprice.php`
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: REQUEST_TIMEOUT
      })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Ошибка при получении цены продукта')
      }
      throw error
    }
  },

  // async getProductDescriprtion(formData: ProductRequestData): Promise<ProductPriceResponse> {
  //   try {
  //     const url = `https://vardek.ru/local/templates/constructor/API/catalog.element.getprice.php`
  //     const response = await axios.post(url, formData, {
  //       headers: {
  //         'Content-Type': 'multipart/form-data'
  //       },
  //       timeout: REQUEST_TIMEOUT
  //     })
  //     return response.data
  //   } catch (error) {
  //     if (axios.isAxiosError(error)) {
  //       throw new Error(error.response?.data?.message || 'Ошибка при получении цены продукта')
  //     }
  //     throw error
  //   }
  // },

  async initHeader(): Promise<any> {
    try {
      const { data } = await axios.get(
        `${API_URL}api/modeller/mainobject/InitHeader/`,
        {
          headers: {
            'Accept': 'application/json'
          },
          timeout: REQUEST_TIMEOUT
        }
      )
      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Ошибка при получении данных заголовка')
      }
      throw error
    }
  },
  
}