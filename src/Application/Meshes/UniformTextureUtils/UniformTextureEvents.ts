
//@ts-nocheck
import * as THREETypes from "@/types/types"
import { useUniformState } from "@/store/appliction/useUniformState";
import { useModelState } from '@/store/appliction/useModelState';


export class UniformTextureEvents {
    modelState: ReturnType<typeof useModelState> = useModelState();
    uniformState: ReturnType<typeof useUniformState> = useUniformState();

    private unionMode: boolean = false
    private preGroup: boolean = false
    private groupAddition: boolean = false
    private degrouping: boolean = false


    private groupIdToCorrect: number | null = null



    constructor() {

    }

    get _unionMode() {
        return this.unionMode
    }

    get _preGroup() {
        return this.preGroup
    }

    get _groupAddition() {
        return this.groupAddition
    }

    get _degrouping() {
        return this.degrouping
    }

    get _groupIdToCorrect() {
        return this.groupIdToCorrect as number
    }

    addVueEvents() {

    }

    togleUnionMode() {
        this.unionMode = !this.unionMode

        this.uniformState.setUniformModeData(
            {
                uniformMode: this.unionMode,
                preGrouping: this.preGroup
            }
        )

        if (!this.unionMode) {
            this.groupIdToCorrect = null
        }
    }

    desableUnionMode() {
        this.unionMode = false
        this.uniformState.setUniformModeData(
            {
                uniformMode: false,
                preGrouping: false
            }
        )
    }

    enablePreGrouping() {
        this.preGroup = true
        this.uniformState.setPreGrouping(true)
    }

    desablePreGrouping() {
        this.preGroup = false
        this.uniformState.setPreGrouping(false)
        this.uniformState.setPreGroup(0)
    }

    enableGroupAddition(groupId: number) {
        this.degrouping = false

        this.groupAddition = true
        this.groupIdToCorrect = groupId
    }

    desableGroupAddition() {
        this.groupAddition = false
        this.groupIdToCorrect = null
    }

    enableDegrouping(groupId: number) {
        this.groupAddition = false

        this.degrouping = true
        this.groupIdToCorrect = groupId
    }

    desableDegrouping() {
        this.degrouping = false
        this.groupIdToCorrect = null
    }



}