//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import {GridModule} from "@/types/constructor2d/interfaсes.ts";

export default class OptionsManager {
    scope: UMconstructorClass
    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    checkOptionsChanged(grid: GridModule) {
        const PROPS = this.scope.UM_STORE.getUMData();

        PROPS.CONFIG.OPTIONS?.forEach(option => {
            switch (+option.id) {
                case 5738924:
                    if(option.active) {
                        grid.noBottom = true
                        grid.horizont = PROPS.CONFIG.HORIZONT = 0
                    }
                    else {
                        delete grid.noBottom
                    }
                    break;
                case 1795067: //Опция без петель
                    if(option.active) {
                        grid.noLoops = true
                    }
                    else {
                        delete grid.noLoops
                    }
                    break;
                default:
                    break;
            }
        })

        this.checkNoBackwall(grid)
        this.scope.reset(grid)
    }
    
    checkNoBackwall(grid: GridModule) {
        const PROPS = this.scope.UM_STORE.getUMData();

        if(!PROPS.CONFIG.BACKWALL?.COLOR){
            grid.noBackwall = true
        }
        else {
            grid.noBackwall = false
        }

        return grid.noBackwall
    }

    checkOptionWithoutBottom(grid: GridModule) {
        const PROPS = this.scope.UM_STORE.getUMData();

        if(PROPS.CONFIG.OPTIONS?.find((opt, index) => {
            if (+opt.id === 5738924 && opt.active)
                return opt;
        })) {
            grid.noBottom = true
            grid.horizont = PROPS.CONFIG.HORIZONT = 0
        }
        else {
            delete grid.noBottom
        }

        this.checkNoBackwall(grid)

        return grid.noBottom
    }
}