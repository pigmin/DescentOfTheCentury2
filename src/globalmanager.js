import { Vector3 } from '@babylonjs/core/Maths/math.vector';

import { SoundManager } from "./soundmanager";

export const States = Object.freeze({
    STATE_NONE: 0,
    STATE_INIT: 10,
    STATE_LOADING: 20,
    STATE_PRE_INTRO: 22,
    STATE_MENU: 25,
    STATE_START_INTRO: 28,
    STATE_INTRO: 30,
    STATE_START_GAME: 35,
    STATE_NEW_LEVEL: 45,
    STATE_LEVEL_READY: 55,
    STATE_RUNNING: 60,
    STATE_PAUSE: 70,
    STATE_BUT_A : 75,
    STATE_BUT_B : 76,
    STATE_LOOSE: 80,
    STATE_GAME_OVER: 90,
    STATE_END: 100,
});

export const PhysMasks = Object.freeze({
    PHYS_MASK_PLAYER : 1,
    PHYS_MASK_GROUND : 2,
    PHYS_MASK_CURLING : 4,
    PHYS_MASK_NET : 8,
    PHYS_MASK_ENNEMIES : 16,

    PHYS_MASK_ALL: 0xffffffff
});

class GlobalManager {

    canvas;
    engine
    scene;
    gameCamera;
    debugCamera;
    gizmoManager;
    gravityVector = new Vector3(0, -9.81, 0)

    gameState = States.STATE_NONE;
    bPause = false;

    shadowGenerators = [];
    environment;
    
    water;
    waterMaterial;

    scoreA = 0;
    scoreB = 0;

    timeToDo = 0;

    static get instance() {
        return (globalThis[Symbol.for(`PF_${GlobalManager.name}`)] ||= new this());
    }

    constructor() {

    }

    init(canvas, engine) {
        this.canvas = canvas;
        this.engine = engine;
    }

    update(delta) {
        
    }

    addShadowGenerator(shad) {
        this.shadowGenerators.push(shad);
    }

    addShadowCaster(object, bChilds) {
        bChilds = bChilds || false;
        for (let shad of this.shadowGenerators) {
            shad.addShadowCaster(object, bChilds)
        }
    }

    goalZoneA() {
        SoundManager.playSound(0);
        this.scoreA++;
        this.gameState = States.STATE_BALL_CENTER;
    }

    goalZoneB() {
        SoundManager.playSound(0);
        this.scoreB++;
        this.gameState = States.STATE_BALL_CENTER;
    }

    clampMagnitudeInPlace(vector, maxLength) {
        // Calculer la longueur (magnitude) actuelle du vecteur
        let currentLength = vector.length();
    
        // Si la longueur est déjà inférieure ou égale à maxLength, renvoyer le vecteur initial
        if (currentLength <= maxLength) {
            return vector;
        }
    
        // Retourner le vecteur redimensionné
        vector.scaleInPlace(maxLength / currentLength)
    }
    
}

//Destructuring on ne prends que la propriété statique instance
const {instance} = GlobalManager;
export { instance as GlobalManager };
