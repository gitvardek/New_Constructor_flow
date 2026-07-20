// import { defineStore } from 'pinia'
// import { ref } from 'vue'

export abstract class AbstractRoomConnector {
    protected abstract dataWall: any[]
    protected abstract roomsMap: Map<number | string, any>
    
}