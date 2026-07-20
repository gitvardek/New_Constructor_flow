//@ts-nocheck
import * as THREE from "three"
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

export class DeepDispose {

    constructor() { }

    clearRoom(room: THREE.Object3D, scene: THREE.Scene) {

        room.children.forEach((child) => {
            if (child instanceof THREE.Mesh) {
                // Очистка геометрии
                if (child.geometry) {
                    child.geometry.dispose();
                    child.geometry = null;
                }

                // Очистка материалов и текстур
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((material) => {
                            material.map?.dispose();
                            material.dispose();
                        });
                    } else {
                        child.material.map?.dispose();
                        child.material.dispose();
                    }
                    child.material = null;
                }

                // Удаляем меш из сцены
                scene.remove(child);
            } else if (child instanceof THREE.Object3D) {
                // Если это не меш, рекурсивно удаляем его детей
                this.clearScene(child as THREE.Scene);
            }
        });

    }

    clearScene(scene: THREE.Scene) {
        // Проверяем, что сцена существует
        if (!scene) return;

        // Копируем массив детей, чтобы избежать изменений во время итерации
        const objects = [...scene.children];

        objects.forEach((child) => {
            // ИСКЛЮЧЕНИЕ: Пропускаем TransformControls gizmo/helper
            if (child.userData && child.userData.isTransformGizmo) {
                return;  // Не удаляем и не traverse
            }

            // Traverse для CSS2DObject (остаётся, но только если не gizmo)
            child.traverse((elem) => {
                if (elem instanceof CSS2DObject) {
                    // Удаляем элемент DOM, связанный с CSS2DObject
                    if (elem.element && elem.element.parentNode) {
                        elem.element.parentNode.removeChild(elem.element);
                    }
                }
            });

            if (child instanceof THREE.Camera) {
                // Не удаляем камеры и свет, оставляем их в сцене
                return;
            }

            if (child instanceof THREE.Mesh) {
                // Очистка геометрии
                if (child.geometry) {
                    child.geometry.dispose();
                    child.geometry = null;
                }

                // Очистка материалов и текстур
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((material) => {
                            material.map?.dispose();
                            material.dispose();
                        });
                    } else {
                        child.material.map?.dispose();
                        child.material.dispose();
                    }
                    child.material = null;
                }

                // Удаляем меш из сцены
                scene.remove(child);
            } else if (child instanceof THREE.Object3D) {
                this.clearScene(child as THREE.Scene);
                scene.remove(child);
            }
        });
    }

    clearObject(object: THREE.Object3D, scene: THREE.Scene) {
        if (object instanceof THREE.Group || object instanceof THREE.Object3D) {
            // Удаляем все дочерние объекты рекурсивно
            for (let i = object.children.length - 1; i >= 0; i--) {
                this.clearObject(object.children[i], scene);
                object.remove(object.children[i]); // Удаляем из родителя
            }
        }

        // Обработка CSS2DObject
        if (object instanceof CSS2DObject) {
            if (object.element && object.element.parentNode) {
                object.element.parentNode.removeChild(object.element);
            }
        }

        // Очистка Mesh
        if (object instanceof THREE.Mesh) {
            if (object.geometry) {
                object.geometry.dispose();
                object.geometry = null;
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach((material) => {
                        if (material.map) material.map.dispose();
                        material.dispose();
                    });
                } else {
                    if (object.material.map) object.material.map.dispose();
                    object.material.dispose();
                }
                object.material = null;
            }
        }

        // Удаляем объект из родителя, если он есть
        if (object.parent) {
            object.parent.remove(object);
        }

        // Удаляем объект из сцены
        if (scene.children.includes(object)) {
            scene.remove(object);
        }
    }

    clearParent(object: THREE.Object3D) {
        while (object.children.length > 0) {
            const child = object.children[0];

            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((mat) => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
            this.clearParent(child);  // Рекурсивно удаляем дочерние
            object.remove(child);  // Удаляем из родителя


        }
    }

    clearObjectFromParrent(object: THREE.Object3D) {
        while (object.children.length > 0) {
            const child = object.children[0];

            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((mat) => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
            this.clearObjectFromParrent(child);  // Рекурсивно удаляем дочерние
            object.remove(child);  // Удаляем из родителя


        }
        object.parent.remove(object)
    }

    clearTotal(scene: THREE.Scene) {

        // Рекурсивная функция для очистки объектов и их ресурсов
        function disposeObject(object) {

            if (object.geometry) {
                object.geometry.dispose(); // Освобождаем геометрию
            }

            if (object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];

                materials.forEach(material => {
                    ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap'].forEach(mapType => {
                        if (material[mapType]) material[mapType].dispose();
                    });
                    material.dispose();
                });
            }

            object.traverse(child => {
                if (child instanceof CSS2DObject) {
                    // Удаляем элемент DOM, связанный с CSS2DObject
                    if (child.element && child.element.parentNode) {
                        child.element.parentNode.removeChild(child.element);
                    }
                }
            })

            if (object.texture) {
                object.texture.dispose(); // Освобождаем текстуру
            }

            if (object.children && object.children.length > 0) {
                // Рекурсивно очищаем дочерние объекты
                object.children.slice().forEach(child => {
                    disposeObject(child);
                });
            }

            if (object.dispose) {
                object.dispose(); // Если объект имеет метод dispose, вызываем его
            }
        }

        // Очищаем все объекты в сцене
        while (scene.children.length > 0) {
            const object = scene.children[0];
            disposeObject(object); // Очищаем объект и его ресурсы
            scene.remove(object); // Удаляем объект из сцены
        }

        console.log('✅ Сцена и ресурсы полностью очищены.');
    }

    clearExceptEssential(scene: THREE.Scene) {
        function disposeObject(object: THREE.Object3D) {
            // ИСКЛЮЧЕНИЕ: Пропускаем TransformControls gizmo/helper (не dispose)
            if (object.userData && object.userData.isTransformGizmo) {
                return;  // Не очищаем и не рекурсируем
            }

            // Освобождаем геометрию
            if ((object as any).geometry) {
                (object as any).geometry.dispose();
            }

            // Освобождаем материалы и текстуры
            if ((object as any).material) {
                const materials = Array.isArray((object as any).material)
                    ? (object as any).material
                    : [(object as any).material];

                materials.forEach(material => {
                    ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap'].forEach(mapType => {
                        if (material[mapType]) {
                            material[mapType].dispose();
                        }
                    });
                    material.dispose();
                });
            }

            // Удаляем DOM-элементы у CSS2DObject
            object.traverse(child => {
                if (child instanceof CSS2DObject) {
                    if (child.element?.parentNode) {
                        child.element.parentNode.removeChild(child.element);
                    }
                }
            });

            // Освобождаем текстуру
            if ((object as any).texture) {
                (object as any).texture.dispose();
            }

            // Рекурсивная очистка дочерних объектов
            if (object.children?.length > 0) {
                object.children.slice().forEach(child => disposeObject(child));
            }

            // Вызов dispose, если доступен
            if ((object as any).dispose) {
                (object as any).dispose();
            }
        }

        // Проверка, нужно ли сохранять объект
        function shouldKeep(object: THREE.Object3D): boolean {
            const cam = object instanceof THREE.Camera;
            const light = object instanceof THREE.Light;
            const room = object.children.find(el => el.userData.elementType === 'ROOM');
            // const room = object.children.find(el => el.elementType === 'element_room');

            // ИСКЛЮЧЕНИЕ: Сохраняем TransformControls gizmo/helper
            const isTransformGizmo = object.userData && object.userData.isTransformGizmo;

            const should = cam || light || !!room || isTransformGizmo;  // Добавили || isTransformGizmo

            return should;
        }

        // Удаляем объекты, которые не должны сохраняться
        scene.children.slice().forEach(object => {
            if (!shouldKeep(object)) {
                disposeObject(object);
                scene.remove(object);
            }
        });

        console.log('✅ Сцена очищена, ключевые объекты сохранены.');
    }
}