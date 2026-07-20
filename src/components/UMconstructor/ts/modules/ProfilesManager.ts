//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import * as THREE from "three";
import {GridModule} from "@/components/UMconstructor/types/UMtypes.ts";


export default class ProfilesManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    changeProfileSide(
        side: String,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
        ) {
        if(grid.profilesConfig?.sideProfile) {
            const profileSidesMap = {
                "right": new THREE.Vector2(-grid.profilesConfig.sideProfile.manufacturerOffset - grid.profilesConfig.sideProfile.size.y / 2, 0),
                "left": new THREE.Vector2(grid.width + grid.profilesConfig.sideProfile.manufacturerOffset + grid.profilesConfig.sideProfile.size.y / 2, 0),
            }
            const profileRotationMap = {
                "right": Math.PI / 2,
                "left": -Math.PI / 2,
            }

            grid.profilesConfig.sideProfile.position = profileSidesMap[side]
            grid.profilesConfig.sideProfile.rotation = new THREE.Vector3(0, 0, profileRotationMap[side]);

            grid.profilesConfig.sideProfile.side = side;
        }
    };
}