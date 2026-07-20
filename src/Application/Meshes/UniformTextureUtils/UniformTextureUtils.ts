import * as THREETypes from '@/types/types'
import { UniformTextureEvents } from "./UniformTextureEvents";
import { UniformTextureExtremes } from "./UniformTextureExtremes";
import { UniformTextureCreateTexture } from "./UniformTextureCreateTexture";

export class UniformTextureUtils  {

    uniformEvents: UniformTextureEvents
    uniformExtremes: UniformTextureExtremes
    createTexture: UniformTextureCreateTexture

    constructor(root: THREETypes.TApplication) {

        this.uniformEvents = new UniformTextureEvents()
        this.uniformExtremes = new UniformTextureExtremes()
        this.createTexture = new UniformTextureCreateTexture(root)
    }

}