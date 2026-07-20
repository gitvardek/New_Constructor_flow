import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface IScreenshot {
  id: string
  roomId: string
  roomLabel: string
  mode: 'normal' | 'drawing'
  blob: Blob
  timestamp: number
  fileName: string
}

export const useScreenshotsStore = defineStore('screenshotsStore', () => {
    const screenshots = ref<IScreenshot[]>([])

    const addScreenshot = (screenshot: IScreenshot) => {
        screenshots.value.push(screenshot)
    }

    const getScreenshots = () => {
        return screenshots.value
    }

    const getScreenshotsByRoom = (roomId: string) => {
        return screenshots.value.filter(s => s.roomId === roomId)
    }

    const clearScreenshots = () => {
        screenshots.value = []
    }

    const removeScreenshot = (id: string) => {
        const index = screenshots.value.findIndex(s => s.id === id)
        if (index !== -1) {
            screenshots.value.splice(index, 1)
        }
    }

    return { 
        screenshots,
        addScreenshot,
        getScreenshots,
        getScreenshotsByRoom,
        clearScreenshots,
        removeScreenshot
    }
})