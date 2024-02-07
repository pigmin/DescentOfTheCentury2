import { Color3, Color4, Matrix, Mesh, MeshBuilder, ParticleSystem, Physics6DoFConstraint, PhysicsAggregate, PhysicsConstraintAxis, PhysicsMotionType, PhysicsRaycastResult, PhysicsShapeType, Quaternion, Ray, RayHelper, Scalar, SceneLoader, Texture, TransformNode, Vector3 } from "@babylonjs/core";


import { GlobalManager, PhysMasks } from "./globalmanager";
import { SoundManager } from "./soundmanager";
import { InputController } from "./inputcontroller";

import meshUrl from "../assets/models/player.glb";
import snowBoardUrl from "../assets/models/intermediate_advanced_snowboard.glb";
import flareParticleUrl from "../assets/textures/flare.png";

const USE_FORCES = true;
let RUNNING_SPEED = 8;
let JUMP_IMPULSE = 6;
const PLAYER_HEIGHT = 1.4;
const PLAYER_RADIUS = 0.8;

const SPEED_Z = 40;
const SPEED_X = 10;
const SKIING_VOLUME_MIN = 0.5;
const SKIING_VOLUME_MAX = 2.5;

class Player {

    //Position dans le monde
    transform;
    //Mesh
    gameObject;
    snowboard;
    particleSystemSnow;

    //Physic
    playerAggregate;

    //Animations
    animationsGroup;

    bWalking = false;
    bOnGround = false;
    bFalling = false;
    bJumping = false;

    idleAnim;
    skatingAnim;
    runAnim;
    walkAnim;

    moveDir = new Vector3(0, 0, 0);

    x = 0.0;
    y = 0.0;
    z = 0.0;

    speedX = 0.0;
    speedY = 0.0;
    speedZ = 0.0;

    constructor(x, y, z) {

        this.x = x || 0.0;
        this.y = y || 0.0;
        this.z = z || 0.0;
        this.transform = MeshBuilder.CreateSphere("playerSphere", { diameter: PLAYER_RADIUS/2 } , GlobalManager.scene);
        this.transform.visibility = 0.0;
        this.transform.position = new Vector3(this.x, this.y, this.z);

        this.transform.checkCollisions = true;
        this.transform.collisionGroup = 1;
        this.transform.showBoundingBox = false;
    }

    async init() {

        const mesh1 = await SceneLoader.ImportMeshAsync("", "", meshUrl, GlobalManager.scene);
        this.gameObject = mesh1.meshes[0];
        this.gameObject.name = "Player";
        this.gameObject.scaling = new Vector3(1, 1, 1);
        this.gameObject.position = Vector3.Zero();
        this.gameObject.rotate(Vector3.UpReadOnly, Math.PI);
        this.gameObject.bakeCurrentTransformIntoVertices();
        
        GlobalManager.gameCamera.lockedTarget = this.gameObject;
        GlobalManager.addShadowCaster(this.gameObject, true);

        const mesh2 = await SceneLoader.ImportMeshAsync("", "", snowBoardUrl, GlobalManager.scene);
        this.snowboard = mesh2.meshes[0];
        this.snowboard.scaling.scaleInPlace(0.8);
        this.snowboard.position.set(0, 0.05, 0.125);
        this.snowboard.name = "snowboard";
        this.snowboard.parent = this.gameObject;
        GlobalManager.addShadowCaster(this.snowboard, true);

        this.playerAggregate = new PhysicsAggregate(this.transform, PhysicsShapeType.SPHERE, { mass: 1, friction: 1.0, restitution: 0.1 }, GlobalManager.scene);
        this.playerAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
        
        //On bloque les rotations avec cette méthode, à vérifier.
        this.playerAggregate.body.setMassProperties({
            inertia: new Vector3(0, 0.0, 0),
            centerOfMass: new Vector3(0, 0, 0),
            mass: 1,
            //inertiaOrientation: new Quaternion(0, 0, 0, 0)
        });

        //On annule tous les frottements, on laisse le IF pour penser qu'on peut changer suivant le contexte
        if (USE_FORCES) {
            this.playerAggregate.body.setLinearDamping(0.2);
            this.playerAggregate.body.setAngularDamping(0.2);
        }
        else {
            this.playerAggregate.body.setLinearDamping(0.2);
            this.playerAggregate.body.setAngularDamping(0.2);
        }

        this.gameObject.parent = this.transform;
        this.animationsGroup = mesh1.animationGroups;
        this.animationsGroup[0].stop();
        this.skatingAnim = GlobalManager.scene.getAnimationGroupByName('Skating'); 
        /*this.idleAnim = GlobalManager.scene.getAnimationGroupByName('Idle');
        this.runAnim = GlobalManager.scene.getAnimationGroupByName('Running');
        this.walkAnim = GlobalManager.scene.getAnimationGroupByName('Walking');
        this.idleAnim.start(true, 1.0, this.idleAnim.from, this.idleAnim.to, false);*/

        this.initParticles();
    }

    initParticles() {
        // Create a particle system
        this.particleSystemSnow = new ParticleSystem("particles", 2000, GlobalManager.scene);
        this.particleSystemSnow.gravity = new Vector3(0, -9.81, 0);
        //Texture of each particle
        this.particleSystemSnow.particleTexture = new Texture(flareParticleUrl, GlobalManager.scene);
        // Where the particles come from
        this.particleSystemSnow.emitter = new TransformNode("spawnsnow", GlobalManager.scene);
        this.particleSystemSnow.emitter.parent = this.gameObject;
        this.particleSystemSnow.emitter.position.z = -1;
        this.particleSystemSnow.minEmitBox = new Vector3(-.2, -.1, 1.5); // Bottom Left Front
        this.particleSystemSnow.maxEmitBox = new Vector3(.2, 0, -.2); // Top Right Back

        // Colors of all particles
        this.particleSystemSnow.color1 = new Color4(0.8, 0.8, 1.0, 1.0);
        this.particleSystemSnow.color2 = new Color4(0.7, 0.7, 1.0, 1.0);
        this.particleSystemSnow.colorDead = new Color4(0.2, 0.2, 0.4, 0.0);

        // Size of each particle (random between...
        this.particleSystemSnow.minSize = 0.025;
        this.particleSystemSnow.maxSize = 0.35;

        // Life time of each particle (random between...
        this.particleSystemSnow.minLifeTime = 0.1;
        this.particleSystemSnow.maxLifeTime = 0.6;

        // Emission rate
        this.particleSystemSnow.emitRate = 4000;

        // Direction of each particle after it has been emitted
        this.particleSystemSnow.direction1 = new Vector3(-3, 0, -SPEED_Z / 2);
        this.particleSystemSnow.direction2 = new Vector3(3, 8, -SPEED_Z);

        // Angular speed, in radians
        this.particleSystemSnow.minAngularSpeed = 0;
        this.particleSystemSnow.maxAngularSpeed = Math.PI / 4;

        // Speed
        this.particleSystemSnow.minEmitPower = .1;
        this.particleSystemSnow.maxEmitPower = 2;
        this.particleSystemSnow.updateSpeed = 0.0075;

        // Start the particle system
        this.particleSystemSnow.start();        
    }

    checkGround() {
        let ret = false;

        var rayOrigin = this.transform.absolutePosition;
        var ray1Dir = Vector3.Down();
        var ray1Len = (PLAYER_HEIGHT / 2) + 0.1;
        var ray1Dest = rayOrigin.add(ray1Dir.scale(ray1Len));

        const raycastResult = GlobalManager.scene.getPhysicsEngine().raycast(rayOrigin, ray1Dest, PhysMasks.PHYS_MASK_GROUND);
        if (raycastResult.hasHit) {
            //console.log("Collision at ", raycastResult.hitPointWorld);
            if (!this.bOnGround)
                console.log("Grounded");
            ret = true;
        }
/*
        var ray1 = new Ray(rayOrigin, ray1Dir, ray1Len);
        var ray1Helper = new RayHelper(ray1);
        ray1Helper.show(GlobalManager.scene, new Color3(1, 1, 0));
*/

        return ret;
    }

    inputMove() {
        let ret = false;
        const axis = InputController.getAxisVectorP1();

        if (axis.length() < 0.01) {
            this.moveDir.setAll(0);            
        }
        else {
            this.moveDir.x = axis.y * RUNNING_SPEED;
            this.moveDir.y = 0;
            this.moveDir.z = -axis.x * RUNNING_SPEED;
            ret = true;
        }
        return ret;
    }
    //Pour le moment on passe les events clavier ici, on utilisera un InputManager plus tard
    update(delta) {
        let bWasOnGround = this.bOnGround;
        this.bOnGround = this.checkGround();

        let bWasWalking = this.bWalking;
        this.bWalking = this.inputMove();


        if (this.bOnGround) {
            //Inputs
            if (!this.moveDir.equals(Vector3.Zero())) {
                this.speedX = this.moveDir.x;
                this.speedZ = this.moveDir.z;
            }
            else {
               if (!USE_FORCES) {
                    this.speedX = Scalar.MoveTowards(this.speedX, 0, delta/3);
                    this.speedZ = Scalar.MoveTowards(this.speedZ, 0, delta/3);
               }
            }
        }
        else {
            //Inputs
            if (!this.moveDir.equals(Vector3.Zero())) {
                this.speedX = this.moveDir.x/1.5;
                this.speedZ = this.moveDir.z/1.5;
            }
            else {
                if (!USE_FORCES) {
                    this.speedX = Scalar.MoveTowards(this.speedX, 0, delta/3);
                    this.speedZ = Scalar.MoveTowards(this.speedZ, 0, delta/3);
               }
            }
        }


        if (InputController.actions["Space"] && this.bOnGround) {
            SoundManager.playSound(0);
            this.playerAggregate.body.applyImpulse(new Vector3(0, JUMP_IMPULSE, 0), Vector3.Zero());
        }
        
        //On applique tout
        if (USE_FORCES) {
            this.moveDir.set(this.speedX, 0, this.speedZ);
            this.playerAggregate.body.applyForce(this.moveDir, Vector3.Zero());
        }
        else {
            //Gravity  + deplacement + saut
            this.moveDir.set(this.speedX, this.playerAggregate.body.getLinearVelocity().y, this.speedZ);
            this.playerAggregate.body.setLinearVelocity(this.moveDir);
        }        
        
        //Animations
        if (this.bWalking) {
            //Orientation
            let directionXZ = new Vector3(this.speedX, 0, this.speedZ);
            this.gameObject.lookAt(directionXZ.normalize());

            if (!bWasWalking) {
                this.skatingAnim.start(true, 1.0, this.skatingAnim.from, this.skatingAnim.to, false);
            }
        }
        else {
            if (bWasWalking) {
                this.skatingAnim.stop();
                //this.idleAnim.start(true, 1.0, this.idleAnim.from, this.idleAnim.to, false);
            }
        }
    }

}

export default Player;