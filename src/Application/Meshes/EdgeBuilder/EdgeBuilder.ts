//@ts-nocheck
import * as THREE from 'three'
// import { TBuildProduct } from '@/types/types'

type TEdgeParams = {
    mesh: THREE.Mesh,
    name?: string,
    manualParent?: THREE.Object3D,
    material: THREE.Material
}

export class EdgeBuilder {
    // private parent: TBuildProduct


    private fasadeMaterial: THREE.MeshBasicMaterial
    private defaultMaterial: THREE.MeshBasicMaterial
    private lineMaterial: THREE.LineBasicMaterial

    constructor() {
        // this.parent = parent
        this.defaultMaterial = new THREE.MeshBasicMaterial({
            color: 'rgba(252, 252, 139, 1)',
            // transparent: true,
            // opacity: 0.15,
            side: THREE.DoubleSide // иначе будет видно только снаружи
        })
        this.fasadeMaterial = new THREE.MeshBasicMaterial({
            color: 'rgba(154, 154, 255, 1)',
            depthTest: false,
            depthWrite: false,
            // transparent: true,
            // opacity: 1,
            side: THREE.DoubleSide // иначе будет видно только снаружи
        })
        this.lineMaterial = new THREE.LineBasicMaterial({
            color: 'rgba(32, 32, 32, 1)', linewidth: 1,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 1,
        })

        this.defaultLineMaterial = new THREE.LineBasicMaterial({
            color: 'rgb(0, 0, 0)', linewidth: 1,
            // depthTest: false,
            // depthWrite: false,
            transparent: true,
            opacity: 0.5,
        })

    }

    public createEdge(object: THREE.Object3D, manualParent?: THREE.Object3D) {
        const edgeBody = new THREE.Object3D()
        // Привязываем ссылку на родителя для возможного внешнего использования
        edgeBody.userData.parentProduct = manualParent ?? this.parent

        // Матрица object нужна для перевода world-трансформа меша в локальное пространство object
        object.updateMatrixWorld(true)
        const invObjectMatrix = new THREE.Matrix4().copy(object.matrixWorld).invert()

        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Трансформ child относительно object (с учётом всей иерархии родителей)
                const relativeMatrix = new THREE.Matrix4().multiplyMatrices(invObjectMatrix, child.matrixWorld)

                // линии
                const edge = this.createSingleEdge({ mesh: child, name: object.name, manualParent, material: this.lineMaterial })
                if (edge) {
                    edge.applyMatrix4(relativeMatrix)
                    edgeBody.add(edge)
                }

                // плоскости
                const face = this.createSingleFace(child, object.name, manualParent)
                face.applyMatrix4(relativeMatrix)
                edgeBody.add(face)
            }
        })

        object.matrix.decompose(edgeBody.position, edgeBody.quaternion, edgeBody.scale)

        edgeBody.userData.edge = true
        edgeBody.visible = false
        return edgeBody
    }

    public createVisibleEdge(object: THREE.Object3D) {
        const edgeBody = new THREE.Object3D()

        object.updateMatrixWorld(true)
        const invObjectMatrix = new THREE.Matrix4().copy(object.matrixWorld).invert()

        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const relativeMatrix = new THREE.Matrix4().multiplyMatrices(invObjectMatrix, child.matrixWorld)
                // линии
                const edge = this.createSingleEdge({ mesh: child, name: 'default', material: this.defaultLineMaterial })
                if (edge) {
                    edge.applyMatrix4(relativeMatrix)
                    edgeBody.add(edge)
                }
            }
        })

        object.matrix.decompose(edgeBody.position, edgeBody.quaternion, edgeBody.scale)

        return edgeBody
    }

    private createSingleEdge({ mesh, name, manualParent, material }: TEdgeParams) {


        if (!mesh.geometry || !mesh.geometry.isBufferGeometry) {
            console.warn('Not ready или не BufferGeometry', mesh.geometry);
            return null;
        }

        const posAttr = mesh.geometry.getAttribute('position');

        if (!posAttr || typeof posAttr.count !== 'number') {
            console.warn('Geometry без position attribute', mesh.geometry);
            return null;
        }


        const edges = new THREE.EdgesGeometry(mesh.geometry)

        const meshEdge = new THREE.LineSegments(
            edges,
            material
        )
        meshEdge.renderOrder = 1;

        if (name != 'default') {
            meshEdge.userData.edge = true
            meshEdge.userData.name = name
            meshEdge.userData.parent = manualParent ?? mesh
        }

        return meshEdge
    }

    private createSingleFace(mesh: THREE.Mesh, name?: string, manualParent?: THREE.Object3D) {
        const material = name === 'fasade' ? this.fasadeMaterial : this.defaultMaterial

        let faceMesh = new THREE.Mesh(mesh.geometry, material)
        if (name === 'fasade') faceMesh.renderOrder = 1;

        faceMesh.userData.edge = true
        faceMesh.userData.name = name
        faceMesh.userData.parent = manualParent ?? mesh


        return faceMesh
    }
}
