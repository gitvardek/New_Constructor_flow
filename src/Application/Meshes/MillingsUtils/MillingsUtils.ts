// @ts-nocheck

import * as THREETypes from "@/types/types"

import { BuildersHelper } from "../BuildersHelper"
import { PatternBuilder } from './PatternBuilder';
import { PatinaBuilder } from "./PatinaBuilder";

export class MillingsUtils extends BuildersHelper {
    root: THREETypes.TApplication | null = null
    patternBuilder: PatternBuilder
    patinaBuilder: PatinaBuilder

    constructor(root: THREETypes.TApplication) {
        super(root)
        this.patternBuilder = new PatternBuilder();
        this.patinaBuilder = new PatinaBuilder()  
    }
}