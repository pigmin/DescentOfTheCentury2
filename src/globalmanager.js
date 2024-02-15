import { Vector3, Matrix, Quaternion } from "@babylonjs/core/Maths/math.vector";
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

    Quaternion_LookRotation(target, up) {
        
        var right = Vector3.Cross(up, target).normalize();
        var correctedUp = Vector3.Cross(target, right).normalize();
    
        var mat = Matrix.FromValues(
            right.x, correctedUp.x, target.x, 0,
            right.y, correctedUp.y, target.y, 0,
            right.z, correctedUp.z, target.z, 0,
            0, 0, 0, 1
        );
    
        var quaternion = new Quaternion();
        quaternion.fromRotationMatrix(mat);
        return quaternion;
    }
    
    getTorqueToAlignVector(mass, fromVector, toVector) {
        // Normaliser les vecteurs
        fromVector.normalize();
        toVector.normalize();
    
        // Calculer l'axe de rotation et l'angle
        const axis = Vector3.Cross(fromVector, toVector).normalize();
        const angle = Math.acos(Vector3.Dot(fromVector, toVector));
    
        // Calculer le couple nécessaire
        const torque = axis.scale(angle * mass);
    
        // Appliquer le couple
        return torque;
    }

    toAngleAxis(quaternion) {
        let angle = 2 * Math.acos(quaternion.w);
        let s = Math.sqrt(1 - quaternion.w * quaternion.w); // Sinon, l'axe n'est pas normalisé
        let axis;

        if (s < 0.001) { // Si s est proche de zéro, l'angle est proche de 0 ou 180 degrés
            axis = new Vector3(quaternion.x, quaternion.y, quaternion.z); // L'axe n'est pas important
        } else {
            axis = new Vector3(quaternion.x / s, quaternion.y / s, quaternion.z / s); // L'axe normalisé
        }
        return {angle, axis};
    }

    getTorqueToAlignQuaternion(mass, fromQuaternion, toQuaternion) {
        // Calculer le quaternion de rotation nécessaire
        const requiredRotation = toQuaternion.multiply(fromQuaternion.invert());
    
        // Convertir le quaternion en axe et angle
        const axisAngle = this.toAngleAxis(requiredRotation);
        const axis = axisAngle.axis;
        let angle = axisAngle.angle;
    
        // Normaliser l'angle pour qu'il soit entre -PI et PI
        angle = angle > Math.PI ? angle - 2 * Math.PI : angle;
        angle = angle < -Math.PI ? angle + 2 * Math.PI : angle;
    
        // Calculer le couple en fonction de l'axe et de l'angle
        // La magnitude du couple peut être ajustée en fonction des besoins de votre simulation
        const torque = axis.scale(angle * mass);
    
        // Appliquer le couple
        return torque;
    }

    applyTorque(torqueWorld, body) {
        
        //var torqueWorld = scene.getPhysicsEngine().getPhysicsPlugin().world;
        let massProps = body.getMassProperties();
        let worldFromInertia = massProps.inertiaOrientation.multiply(body.transformNode.absoluteRotationQuaternion);
        let inertiaFromWorld = worldFromInertia.conjugate();
        let impLocal = torqueWorld.applyRotationQuaternion(inertiaFromWorld);
        let impWorld = impLocal.multiply(massProps.inertia).applyRotationQuaternion(worldFromInertia);
        let newAV = body.getAngularVelocity().add(impWorld.scale(this.scene.getPhysicsEngine().getTimeStep()));
        body.setAngularVelocity(newAV);
    }
}

//Destructuring on ne prends que la propriété statique instance
const {instance} = GlobalManager;
export { instance as GlobalManager };
