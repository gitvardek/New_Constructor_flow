import * as THREE from "three"

type TGlassMaterialParams = {
    color?: string
    roughness?: number
    opacity?: number
}

/**
 * Материал стекла.
 *
 * Матовость и преломление даёт transmission — без него стекло выглядит плоской
 * серой плёнкой. Но WebGLRenderer рендерит в буфер преломления только непрозрачные
 * объекты (renderTransmissionPass -> renderObjects(opaqueObjects)), поэтому одно
 * стекло не видит другое через этот буфер.
 *
 * Спасают два флага:
 *
 * transparent: true — при false фрагмент замещает содержимое буфера кадра, и витрина
 * затирала всё, что нарисовано до неё. Со смешиванием объект блендится с уже
 * отрисованным, а прозрачные объекты сортируются от дальнего к ближнему, поэтому
 * полка успевает нарисоваться раньше фасада. Заодно начинает работать opacity,
 * которая без этого флага не влияла ни на что.
 *
 * depthWrite: false — иначе ближнее стекло пишет глубину и отсекает дальнее.
 */
export const createGlassMaterial = ({
    color = "#ffffff",
    roughness = 0.05,
    opacity = 0.8,
}: TGlassMaterialParams = {}): THREE.MeshPhysicalMaterial => {

    const material = new THREE.MeshPhysicalMaterial({
        reflectivity: 1,
        transmission: 0.95,
        roughness,
        metalness: 0.25,
        color,
        ior: 1.5,
        thickness: 0.5,
        clearcoat: 0.1,
        clearcoatRoughness: 0.1,
        opacity,
        transparent: true,
        depthWrite: false,
    })

    material.encoding = THREE.SRGBColorSpace

    return material
}
