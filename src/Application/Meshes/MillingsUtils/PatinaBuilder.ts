//@ts-nocheck
import * as THREE from 'three';
import * as THREETypes from "@/types/types"

export class PatinaBuilder {
    private patinaColors: { [key: string]: string | THREE.Color } = {
        475453: "#d4af37", // GOLD
        567326: "#d1d0cf", // SILVER
        475452: "#aa5a0f", // BRONSE
    }

    constructor() {

    }

    public createPatinaColor({ geometry, patinaId, startMaterial }: { geometry: THREE.BufferGeometry, patinaId: number | string, startMaterial: THREE.MeshStandardMaterial }) {

        if (!startMaterial || !geometry || !startMaterial) return;

        geometry.computeVertexNormals();
        geometry.computeBoundingBox();

        // console.log(startMaterial, '=== startMaterial')

        const defaultColor = startMaterial.color;
        const defaultRoughness = startMaterial.roughness;
        const defaultMetalness = startMaterial.metalness;

        const colors = new Float32Array(geometry.attributes.position.count * 3).fill(1);

        this.patinaColors[475428] = defaultColor // Дефолтный цвет

        const currentPatina = this.patinaColors[patinaId];
        const patinaColor = new THREE.Color(currentPatina);

        const position = geometry.attributes.position;
        const normal = geometry.attributes.normal;

        geometry.groups.forEach((group) => {
            if (group.materialIndex === 2) { // Работаем только с вырезанными гранями
                let minZ = Infinity, maxZ = -Infinity;

                // **Применяем градиент только внутри текущей грани**
                for (let i = group.start; i < group.start + group.count; i++) {

                    let z = position.getZ(i);
                    if (z < minZ) minZ = z;
                    if (z > maxZ) maxZ = z;
                    let gradientFactor = (z - minZ) / (maxZ - minZ); // 0 → 1 для текущей грани

                    const nx = normal.getX(i);
                    const ny = normal.getY(i);
                    const nz = normal.getZ(i);


                    // Инвертируем градиент
                    Math.pow(gradientFactor = 1 - gradientFactor, 1.5)

                    if (Math.abs(nz) >= 1) {
                        colors[i * 3] = defaultColor.r;
                        colors[i * 3 + 1] = defaultColor.g;
                        colors[i * 3 + 2] = defaultColor.b;
                    }
                    else {
                        let lerpColor = new THREE.Color().lerpColors(defaultColor, patinaColor, gradientFactor)
                        colors[i * 3] = lerpColor.r;
                        colors[i * 3 + 1] = lerpColor.g;
                        colors[i * 3 + 2] = lerpColor.b;
                    }

                }
            }
        });

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = [
            startMaterial,
            startMaterial,
            new THREE.MeshStandardMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                wireframe: false,
                metalness: defaultMetalness,
                roughness: defaultRoughness
            })
        ];


        return { geometry, material };
    }
}