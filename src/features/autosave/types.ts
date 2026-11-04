import type { IProjectParams } from '@/types/interfases'
import type { IBasket } from '@/types/basket'

/** Корзина на момент снятия снапшота */
export interface IAutosaveBasket {
    mainConstructor: IBasket[]
    mainCatalog: IBasket[]
}

/** Снапшот автосохранения, который лежит в localStorage */
export interface IAutosaveSnapshot {
    version: number
    /** Время записи снапшота, мс */
    savedAt: number
    /** Вид, на котором работал пользователь */
    view: '/2d' | '/3d'
    /** Активная комната на момент записи */
    roomId: string | null
    /** ID проекта на сервере, если правился уже сохранённый проект */
    projectId: string | null
    projectName: string
    project: IProjectParams
    /** null, если корзина не влезла в лимит хранилища */
    basket: IAutosaveBasket | null
}
