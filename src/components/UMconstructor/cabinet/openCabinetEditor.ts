// "Редактировать" у карточки тумбочки: создаёт сессию и открывает уровень
// навигации окна гардеробной. Сессию закрывает сама страница при размонтировании.
import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import type { EditorNavigation } from "@/components/UMconstructor/editor-v2/navigation/editorNavigation.ts";
import { createCabinetEditSession } from "./session/cabinetEditSession.ts";
import CabinetEditorPage from "./views/CabinetEditorPage.vue";

interface Params {
    navigation: EditorNavigation | null;
    wardrobeEngine: UMconstructorClass;
    secIndex: number;
    cabinetId: number;
    title: string;
}

let levelCounter = 0;

export const openCabinetEditor = ({ navigation, wardrobeEngine, secIndex, cabinetId, title }: Params) => {
    if (!navigation) {
        wardrobeEngine.callAlert("warning", "Редактор тумбочки открывается только из окна гардеробной");
        return;
    }

    let session;
    try {
        session = createCabinetEditSession({ wardrobeEngine, secIndex, cabinetId });
    } catch (error) {
        console.error(error);
        wardrobeEngine.callAlert("error", "Не удалось открыть редактор тумбочки");
        return;
    }

    navigation.push({
        id: `cabinet-${++levelCounter}`,
        title,
        component: CabinetEditorPage,
        props: { session },
    });
};
