import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import { Vector3, Matrix, Quaternion, Vector2 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from '@babylonjs/core/Culling/ray';
import { RayHelper } from '@babylonjs/core/Debug/rayHelper';
import { AxesViewer } from '@babylonjs/core/Debug/axesViewer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType, PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Scalar } from '@babylonjs/core/Maths/math.scalar';

import { GlobalManager, PhysMasks } from "./globalmanager";
import { SoundManager } from "./soundmanager";
import { InputController } from "./inputcontroller";
import { Tools } from './tools';

import meshUrl from "../assets/models/robot_sphere.glb";
//import meshUrl from "../assets/models/girl1.glb";
import dustParticleUrl from "../assets/textures/dust.png";


const DEBUG_FORCES = false;
const ADJUST_INPUT_TO_CAMERA = true;


const PLAYER_MASS = 1;
const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 2.0;
const RIDE_HEIGHT = 2.0;
const RIDE_CENTER_OFFSET = RIDE_HEIGHT / 2.0;
const ONGROUND_LENGTH = RIDE_HEIGHT * 1.3;
const RAY_DOWN_LENGTH = 3.0;

const RIDE_SPRING_STRENGTH = 400;
const RIDE_SPRING_DAMPER = 10;

const BODY_FORCE_FEED_BACK_MULTIPLIER = 1.0;


class Player {

    //Position dans le monde
    transform;
    //Mesh
    gameObject;
    particleSystemDust;

    maxSlopeAngle = 0.8;
    currentSlope = 0;
    rayHit = new PhysicsRaycastResult();

    hitMatrix = new Matrix();
    hitBodyVector = Vector3.Zero();

    cameraRoot;
    jumpWasPressed = false;

    //Physic
    playerAggregate;
    gravitationalForce;
    rayDir = Vector3.Down();
    previousVelocity = Vector3.Zero();
    moveContext = Vector2.Zero();


    shouldMaintainHeight = true;

    //Up right internal
    uprightTargetRot = Quaternion.Identity();
    lastTargetRot = Quaternion.Identity();
    platformInitRot = null;
    didLastRayHit = false;

    //Upright params
    lookDirection = Vector3.Zero();
    uprightSpringStrength = 40.0;
    uprightSpringDamper = 20.0;

    //Movements internal
    moveInput = Vector3.Zero();
    speedFactor = 1.0;
    maxAccelForceFactor = 1.0;
    m_GoalVel = Vector3.Zero();

    //Movements params
    maxSpeed = 20.0;
    acceleration = 400.0;
    maxAccelForce = 300.0;
    leanFactor = 0.45;
    //_accelerationFactorFromDot
    //_maxAccelerationForceFactorFromDot
    moveForceScale = new Vector3(1, 0, 1);

    //Jump internal
    jumpInput = Vector3.Zero();
    timeSinceJumpPressed = 0.0;
    timeSinceUngrounded = 0.0;
    timeSinceJump = 0.0;
    jumpReady = true;
    isJumping = false;
    
    //Jump params
    jumpForceFactor = 18.0;
    jumpVector;
    riseGravityFactor = 3.0;
    fallGravityFactor = 8.0;
    lowJumpFactor = 10.0;
    jumpBuffer = 0.15;
    coyoteTime = 0.25;

    //Animations
    animationsGroup;

    bWalking = false;
    bOnGround = false;
    bFalling = false;
    bJumping = false;

    idleAnim;
    runAnim;
    walkAnim;

    ray1 = Ray.Zero();
    ray1Helper = new RayHelper(this.ray1);


    moveInputLines;

    x = 0.0;
    y = 0.0;
    z = 0.0;

    speed = 0;


    constructor(x, y, z) {

        this.jumpVector = Vector3.Up().scale(this.jumpForceFactor)
        this.x = x || 0.0;
        this.y = y || 0.0;
        this.z = z || 0.0;
        this.transform = new MeshBuilder.CreateSphere("player", { height: PLAYER_HEIGHT, radius: PLAYER_RADIUS }, GlobalManager.scene);
        this.transform.position = new Vector3(this.x, this.y, this.z);
        this.transform.rotationQuaternion = Quaternion.Identity();

        if (DEBUG_FORCES) {
            let debugMat = new StandardMaterial("debugMat");
            debugMat.diffuseColor = new Color3(0.3, 0.3, 1);
            this.transform.material = debugMat;
            let debugRideHeight = new MeshBuilder.CreateCylinder("debugRide", { diameter: 0.05, height: RIDE_HEIGHT, faceColors: [Color3.Red(), Color3.Red(), Color3.Red()], enclose: true }, GlobalManager.scene);
            debugRideHeight.setParent(this.transform);
            //debugRideHeight.visibility = 0.0;        
            debugRideHeight.position = new Vector3(0, -RIDE_CENTER_OFFSET, 0);
        }
        else {
            this.transform.visibility = 0.0;

        }

        this.transform.checkCollisions = true;
        this.transform.collisionGroup = 1;
        this.transform.showBoundingBox = false;

        this.cameraRoot = new TransformNode("cameraRoot");

        if (DEBUG_FORCES) {
            this.moveInputLines = new AxesViewer(GlobalManager.scene, 2);
            this.moveInputLines.xAxis.parent = this.transform;
            this.moveInputLines.yAxis.parent = this.transform;
            this.moveInputLines.zAxis.parent = this.transform;
        }
        //showAxes(5, this.transform, GlobalManager.scene);


    }

    async init() {

        const mesh1 = await SceneLoader.ImportMeshAsync("", "", meshUrl, GlobalManager.scene);
        this.gameObject = mesh1.meshes[0];
        this.gameObject.name = "playerMesh";
        this.gameObject.scaling = new Vector3(2, 2, 2);
        this.gameObject.position = new Vector3(0, 0, 0);
        //this.gameObject.rotate(Vector3.UpReadOnly, Math.PI);
        this.gameObject.bakeCurrentTransformIntoVertices();
        if (DEBUG_FORCES) {
            mesh1.meshes[0].visibility = 0;
            mesh1.meshes[1].visibility = 0;
        }
        this.cameraRoot.setParent(this.gameObject);
        this.cameraRoot.position = new Vector3(0, 0, 0);

        GlobalManager.gameCamera.lockedTarget = this.gameObject;
        GlobalManager.addShadowCaster(this.gameObject, true);
        GlobalManager.waterMaterial.addToRenderList(mesh1.meshes[1]);

        this.playerAggregate = new PhysicsAggregate(this.transform, PhysicsShapeType.SPHERE, { mass: PLAYER_MASS, friction: 0.5, restitution: 0.1 }, GlobalManager.scene);
        this.playerAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);

        //On bloque les rotations avec cette méthode, à vérifier.
        /*this.playerAggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0),  // 0, 0, 0 ...??
            centerOfMass: new Vector3(0, 0, 0),
            mass: PLAYER_MASS,
            //inertiaOrientation: Quaternion.Identity()
        });*/

        this.gravitationalForce = GlobalManager.gravityVector.scale(PLAYER_MASS);

        //console.log(this.playerAggregate.body.getGravityFactor());

        //On annule tous les frottements, on laisse le IF pour penser qu'on peut changer suivant le contexte
        this.playerAggregate.body.setLinearDamping(0);
        this.playerAggregate.body.setAngularDamping(0.05);

        this.gameObject.parent = this.transform;
        this.animationsGroup = mesh1.animationGroups;
        this.animationsGroup[0].stop();
        this.idleAnim = this.animationsGroup[0];
        this.runAnim = this.animationsGroup[0];
        this.walkAnim = this.animationsGroup[0];
      /*
          this.idleAnim = GlobalManager.scene.getAnimationGroupByName('Idle');
        this.runAnim = GlobalManager.scene.getAnimationGroupByName('Running');
        this.walkAnim = GlobalManager.scene.getAnimationGroupByName('Walking');*/
        this.idleAnim.start(true, 1.0, this.idleAnim.from, this.idleAnim.to, false);

        this.initParticles();
        this.test();
    }

    test() {
        window.addEventListener('dblclick', () => {
            var pickResult = GlobalManager.scene.pick(GlobalManager.scene.pointerX, GlobalManager.scene.pointerY);

            var mat = new StandardMaterial('mat1', GlobalManager.scene);
            mat.diffuseColor = new Color3(1, 0, 0);

            var sphere = MeshBuilder.CreateSphere(
                'sphere1',
                { diameter: 2, segments: 16 },
                GlobalManager.scene
            );
            sphere.material = mat;
            sphere.position.y = 3;

            var cube = MeshBuilder.CreateBox(
                'cube',
                { size: 0.5, height: 3 },
                GlobalManager.scene
            );
            cube.position = new Vector3(0, 1.5, 0);
            cube.material = mat;

            var mesh = Mesh.MergeMeshes([sphere, cube]);

            mesh.position = pickResult.pickedPoint;

            // !!!!!!!!!!!!!!!!!!!!!
            // ROTATION MUST BE HERE
            // !!!!!!!!!!!!!!!!!!!!!

            var axis1 = pickResult.getNormal();
            var axis2 = Vector3.Up();
            var axis3 = Vector3.Zero();
            var start = GlobalManager.gameCamera.position;

            Vector3.CrossToRef(start, axis1, axis2);
            Vector3.CrossToRef(axis2, axis1, axis3);
            var tmpVec = Vector3.RotationFromAxis(axis3.negate(), axis1, axis2);
            //var quat = Quaternion.RotationYawPitchRoll(tmpVec.y, tmpVec.x, tmpVec.z);
            mesh.rotation = tmpVec;
        });
    }

    initParticles() {
        // Create a particle system
        this.particleSystemDust = new ParticleSystem("particles", 200, GlobalManager.scene);
        this.particleSystemDust.gravity = new Vector3(0, 0.5, 0);
        //Texture of each particle
        this.particleSystemDust.particleTexture = new Texture(dustParticleUrl, GlobalManager.scene);
        // Where the particles come from
        this.particleSystemDust.emitter = new TransformNode("spawndust", GlobalManager.scene);
        this.particleSystemDust.emitter.parent = this.gameObject;
        this.particleSystemDust.emitter.position.y = -(ONGROUND_LENGTH / 2);
        this.particleSystemDust.minEmitBox = new Vector3(-.2, -.1, -.2); // Bottom Left Front
        this.particleSystemDust.maxEmitBox = new Vector3(.2, 0, .2); // Top Right Back

        // Colors of all particles
        this.particleSystemDust.color1 = new Color4(0.52, 0.36, 0.12, 1.0);
        this.particleSystemDust.color2 = new Color4(0.33, 0.18, 0, 1.0);
        this.particleSystemDust.colorDead = new Color4(0, 0, 0, 0.0);

        // Size of each particle (random between...
        this.particleSystemDust.minSize = 0.05;
        this.particleSystemDust.maxSize = 0.5;

        // Life time of each particle (random between...
        this.particleSystemDust.minLifeTime = 0.1;
        this.particleSystemDust.maxLifeTime = 0.6;

        // Emission rate
        this.particleSystemDust.emitRate = 20;

        // Direction of each particle after it has been emitted
        this.particleSystemDust.direction1 = new Vector3(-3, 0, -3);
        this.particleSystemDust.direction2 = new Vector3(3, 1, 3);

        // Angular speed, in radians
        this.particleSystemDust.minAngularSpeed = 0;
        this.particleSystemDust.maxAngularSpeed = 0;
        this.particleSystemDust.minInitialRotation = 0;
        this.particleSystemDust.maxInitialRotation = 180;
        // Speed
        this.particleSystemDust.minEmitPower = .1;
        this.particleSystemDust.maxEmitPower = 2;
        this.particleSystemDust.updateSpeed = 0.0075;

        // Start the particle system
        this.particleSystemDust.stop();
    }


    inputMove() {

        let ret = false;
        this.moveContext = InputController.getAxisVectorP1();

        if (Math.abs(this.moveContext.length()) < 0.01) {
            this.moveInput.setAll(0);
        }
        else {
            this.moveInput.x = this.moveContext.x;
            this.moveInput.y = 0;
            this.moveInput.z = this.moveContext.y;
            ret = true;
        }
        this.speed = 1;//dthis.moveInput.length();

        this.moveInput.normalize();

        return ret;
    }
    inputJump() {
        if (InputController.inputMap["Space"]) {
            if (!this.jumpWasPressed)
                this.timeSinceJumpPressed = 0;

            this.jumpInput.set(0, 1, 0);
            this.jumpWasPressed = true;
        }
        else {
            this.jumpWasPressed = false;
            this.jumpInput.setAll(0);
        }

    }
    //Pour le moment on passe les events clavier ici, on utilisera un InputManager plus tard
    update(delta) {

        let bWasWalking = this.bWalking;
        this.bWalking = this.inputMove();
        this.inputJump();

        //On applique tout suivant l'orientation de la camera
        if (ADJUST_INPUT_TO_CAMERA)
            this.applyCameraDirectionToInput();

        let rayHitGround = this.raycastToGround();

        let bWasOnGround = this.bOnGround;
        this.bOnGround = this.checkIfGrounded(rayHitGround);


        if (this.bOnGround) {
            if (!bWasOnGround) {
                //TODO : Landing sound

                //TODO : Landing particles
            }

            this.updateAnimations(bWasWalking);

            this.timeSinceUngrounded = 0;
            if (this.timeSinceJump > 0.2) {
                this.isJumping = false;
            }

        }
        else {
            this.updateAnimations(bWasWalking);
            this.timeSinceUngrounded += delta;
        }

        //On regarde le slope etc.
        this.calculateSlope();
        //Effect secondaire : alignement sur la pente..
        //this.applySlopeOnMove();


        this.characterMove(delta);
        this.characterJump(delta);

        if (rayHitGround && this.shouldMaintainHeight)
        {
            this.maintainHeight();
        }

        this.lookDirection.copyFrom(this.moveInput);
        if (this.bWalking) {
//            this.lookDirection.copyFrom(this.moveInput);
        /*    let velocity = this.playerAggregate.body.getLinearVelocity().normalizeToNew();
            velocity.y = 0;
            if (velocity.length() != 0)
                this.lookDirection.set(velocity.x, 0, velocity.z);*/
        }
        
        
        this.maintainUpright();
    }

    maintainUpright() {

        this.calculateTargetRotation();
        const toGoal = Tools.shortestRotationBetweenQuatertions(this.uprightTargetRot, this.playerAggregate.body.transformNode.rotationQuaternion);
        
        // Convertir le quaternion en axe et angle
        const axisAngle = Tools.toAngleAxis(toGoal);
        const rotAxis = axisAngle.axis;
        rotAxis.normalize();

       
        // Normaliser l'angle pour qu'il soit entre -PI et PI
        //angle = angle > Math.PI ? angle - 2 * Math.PI : angle;
        //angle = angle < -Math.PI ? angle + 2 * Math.PI : angle;
        let angularVelocity = this.playerAggregate.body.getAngularVelocity();
        let force = rotAxis.scale(axisAngle.angle * this.uprightSpringStrength).subtract(angularVelocity.scale(this.uprightSpringDamper) );
       

        Tools.applyTorque(force, this.playerAggregate.body);
//        this.gameObject.lookAt(this.lookDirection);
       //Quaternion.SlerpToRef(this.gameObject.rotationQuaternion, this.uprightTargetRot, 0.16, this.gameObject.rotationQuaternion);
    }

    calculateTargetRotation() {
        if (this.didLastRayHit)
        {
            this.lastTargetRot = this.uprightTargetRot;
           /*try
            {
                this.platformInitRot = transform.parent.rotation.eulerAngles;
            }
            catch
            {
                this.platformInitRot = Vector3.Zero();
            }*/
        }
        if (this.rayHit.hitBody == null)
        {
            this.didLastRayHit = true;
        }
        else
        {
            this.didLastRayHit = false;
        }

        if (this.lookDirection.length() != 0)
        {
            Quaternion.FromLookDirectionRHToRef(this.lookDirection, Vector3.UpReadOnly, this.uprightTargetRot);
            this.lastTargetRot = this.uprightTargetRot.clone();
            /*try
            {
                this.platformInitRot = transform.parent.rotation.eulerAngles;
            }
            catch
            {
                this.platformInitRot = Vector3.Zero();
            }*/
        }
        else
        {
          /*  try
            {
                let platformRot = transform.parent.rotation.eulerAngles;
                let deltaPlatformRot = platformRot - this.platformInitRot;
                let yAngle = this.lastTargetRot.eulerAngles.y + deltaPlatformRot.y;
                this.uprightTargetRot = Quaternion.Euler(new Vector3(0, yAngle, 0));
            }
            catch
            {

            }*/
        }
    }

    characterMove(delta) {
        let m_UnitGoal = this.moveInput;
        let unitVel = this.m_GoalVel.normalizeToNew();
        let velDot = Vector3.Dot(m_UnitGoal, unitVel);

        let accel = this.acceleration * Scalar.SmoothStep(1.5, 1, velDot);

        let goalVel = m_UnitGoal.scale(this.maxSpeed * this.speedFactor);

        this.m_GoalVel.set(Scalar.MoveTowards(this.m_GoalVel.x, goalVel.x, accel * delta),
            Scalar.MoveTowards(this.m_GoalVel.y, goalVel.y, accel * delta),
            Scalar.MoveTowards(this.m_GoalVel.z, goalVel.z, accel * delta));

        let neededAccel = this.m_GoalVel.subtract(this.playerAggregate.body.getLinearVelocity()).scale(1.0 / delta);


        let maxAccel = this.maxAccelForce * Scalar.SmoothStep(1.5, 1, velDot) * this.maxAccelForceFactor;
        Tools.clampMagnitudeInPlace(neededAccel, maxAccel);
        let force = neededAccel.scaleInPlace(PLAYER_MASS);
        force.multiplyInPlace(this.moveForceScale);

        let posForce = this.playerAggregate.body.transformNode.position.clone();
       // posForce.y += this.leanFactor;
        this.playerAggregate.body.applyForce(force, posForce);
        //        this.playerAggregate.body.applyForceAtPosition(force, transform.position + new Vector3(0f, transform.localScale.y * _leanFactor, 0f)); // Using AddForceAtPosition in order to both move the player and cause the play to lean in the direction of input.

    }

    characterJump(delta) {

        let velocity = this.playerAggregate.body.getLinearVelocity();

        this.timeSinceJumpPressed += delta;
        this.timeSinceJump += delta;
        if (velocity.y < 0) {
            this.shouldMaintainHeight = true;
            this.jumpReady = true;
            if (!this.bOnGround) {
                // Increase downforce for a sudden plummet.
                this.playerAggregate.body.applyForce(this.gravitationalForce.scale(this.fallGravityFactor - 1.0), this.playerAggregate.body.transformNode.position); // Hmm... this feels a bit weird. I want a reactive jump, but I don't want it to dive all the time...
            }
        }
        else if (velocity.y > 0) {
            if (!this.bOnGround) {
                if (this.isJumping) {
                    this.playerAggregate.body.applyForce(this.gravitationalForce.scale(this.riseGravityFactor - 1.0), this.playerAggregate.body.transformNode.position);
                }
                if (this.jumpInput.length() == 0) {
                    // Impede the jump height to achieve a low jump.
                    this.playerAggregate.body.applyForce(this.gravitationalForce.scale(this.lowJumpFactor - 1.0), this.playerAggregate.body.transformNode.position);
                }
            }
        }

        if (this.timeSinceJumpPressed < this.jumpBuffer) {
            if (this.timeSinceUngrounded < this.coyoteTime) {
                if (this.jumpReady) {
                    this.jumpReady = false;
                    this.shouldMaintainHeight = false;
                    this.isJumping = true;
                    velocity.y = 0;
                    this.playerAggregate.body.setLinearVelocity(velocity); // Cheat fix... (see comment below when adding force to rigidbody).
                    if (this.rayHit.hitDistance != 0) // i.e. if the ray has hit
                    {
                        this.playerAggregate.body.disablePreStep = false;
                        this.playerAggregate.body.transformNode.position.y = this.playerAggregate.body.transformNode.position.y - (this.rayHit.hitDistance - RIDE_HEIGHT);
                        GlobalManager.scene.onAfterRenderObservable.addOnce(() => {
                            // Turn disablePreStep on again for maximum performance
                            this.playerAggregate.body.disablePreStep = true;
                        });
                    }
                    this.playerAggregate.body.applyImpulse(this.jumpVector, this.playerAggregate.body.transformNode.position); // This does not work very consistently... Jump height is affected by initial y velocity and y position relative to RideHeight... Want to adopt a fancier approach (more like PlayerMovement). A cheat fix to ensure consistency has been issued above...
                    this.timeSinceJumpPressed = this.jumpBuffer; // So as to not activate further jumps, in the case that the player lands before the jump timer surpasses the buffer.
                    this.timeSinceJump = 0.0;

                    //TODO Sound JUMP
                }
            }
        }
    }

    updateAnimations(bWasWalking) {

        //Animations
        if (this.bWalking) {

            if (!bWasWalking) {
                this.runAnim.start(true, 1.0, this.runAnim.from, this.runAnim.to, false);
                this.particleSystemDust.start();
            }
        }
        else {
            if (bWasWalking) {
                this.particleSystemDust.stop();
                this.runAnim.stop();
                this.idleAnim.start(true, 1.0, this.idleAnim.from, this.idleAnim.to, false);
            }
        }
    }


    checkIfGrounded(rayHitGround) {
        let grounded = false;
        if (rayHitGround)
            grounded = (this.rayHit.hitDistance < ONGROUND_LENGTH);

        return grounded;
    }

    raycastToGround() {

        var rayOrigin = this.transform.absolutePosition;
        var ray1Dir = Vector3.DownReadOnly;
        var ray1Len = RAY_DOWN_LENGTH;
        var ray1Dest = rayOrigin.add(ray1Dir.scale(ray1Len));

        this.rayHit.reset();
        GlobalManager.scene.getPhysicsEngine().raycastToRef(rayOrigin, ray1Dest, this.rayHit, { collideWith: PhysMasks.PHYS_MASK_ALL });

        return this.rayHit.hasHit;
    }

    calculateSlope() {
        this.currentSlope = 0;
        this.onSlope = false;
        if (this.rayHit.hasHit) {
            let ortho = Vector3.Cross(Vector3.UpReadOnly, this.rayHit.hitNormal);
            this.currentSlope = Vector3.GetAngleBetweenVectors(Vector3.UpReadOnly, this.rayHit.hitNormal, ortho);
            // let ortho2 = Vector3.Cross(ortho, this.rayHit.hitNormal);

            this.onSlope = (this.currentSlope != 0);

            // console.log(this.currentSlope);

        }
        //ALTERNATIVE / let angle3 = -Math.acos(Vector3.Dot(Vector3.UpReadOnly,  this.rayHit.hitNormal)); 

        //let angle4 = -Math.asin(Vector3.Dot(Vector3.RightReadOnly,  this.rayHit.hitNormal)); 
    }

    applySlopeOnMove() {

        if (this.onSlope) {

            let planeNormal = this.rayHit.hitNormal.normalize();
            // Calcul du produit scalaire entre le vecteur à projeter et la normale du plan
            let dotProduct = Vector3.Dot(this.moveInput, planeNormal);

            // Calcul du vecteur perpendiculaire
            let perpendicularVector = planeNormal.scale(dotProduct);

            // Projection du vecteur sur le plan
            let projectedVector = this.moveInput.subtract(perpendicularVector);


            if (DEBUG_FORCES)
                this.moveInputLines.update(Vector3.ZeroReadOnly, this.moveInput, projectedVector, planeNormal);

            // projectedVector est maintenant la projection de vectorToProject sur le plan
            this.moveInput = projectedVector;

        }
        else {
            if (DEBUG_FORCES)
                this.moveInputLines.update(Vector3.ZeroReadOnly, this.moveInput, this.moveInput, this.transform.up);
        }
    }

    maintainHeight() {
        if (this.rayHit.hasHit) {

            let vel = this.playerAggregate.body.getLinearVelocity();


            let otherVel = Vector3.Zero();
            let hitBody = this.rayHit.body;
            if (hitBody != null) {
                hitBody.getLinearVelocityToRef(otherVel);
            }
            let rayDirVel = Vector3.Dot(this.rayDir, vel);
            let otherDirVel = Vector3.Dot(this.rayDir, otherVel);
            let relVel = rayDirVel - otherDirVel;
            let currHeight = this.rayHit.hitDistance - RIDE_HEIGHT;

            let springForce = (currHeight * RIDE_SPRING_STRENGTH) - (relVel * RIDE_SPRING_DAMPER);
            let maintainHeightForce = this.rayDir.scale(springForce).subtract(this.gravitationalForce);
            //Vector3 oscillationForce = springForce * Vector3.down;


            this.playerAggregate.body.applyForce(maintainHeightForce, this.playerAggregate.body.transformNode.position);
            if (DEBUG_FORCES) {
                this.ray1.origin = this.transform.position;
                this.ray1.direction.copyFrom(this.rayDir);
                this.ray1.length = springForce;
                this.ray1Helper.show(GlobalManager.scene, new Color3(1, 1, 0));
            }
            //console.log(this.rayHit.hitDistance, springForce);

            if (hitBody != null) {
                //console.log(this.rayHit);
                /*hitBody.transformNode.getWorldMatrix().invertToRef(this.hitMatrix);
                Vector3.TransformCoordinatesToRef(this.rayHit.hitPoint, this.hitMatrix, this.hitBodyVector);*/
                //TODO : passe the body instance...how to get it ...???
                hitBody.applyForce(maintainHeightForce.scale(BODY_FORCE_FEED_BACK_MULTIPLIER).negate(), this.rayHit.hitPoint);
            }
        }
        else {
            this.ray1Helper.hide();
        }
    }
    
    getUpVector(_mesh) {
        _mesh.computeWorldMatrix(true);
        var up_local = new Vector3(0, 1, 0);
        const worldMatrix = _mesh.getWorldMatrix();
        return Vector3.TransformNormal(up_local, worldMatrix);
    }

    getForwardVector(_mesh) {
        _mesh.computeWorldMatrix(true);
        var forward_local = new Vector3(0, 0, 1);
        const worldMatrix = _mesh.getWorldMatrix();
        return Vector3.TransformNormal(forward_local, worldMatrix);
    }

    getRightVector(_mesh) {
        _mesh.computeWorldMatrix(true);
        var right_local = new Vector3(1, 0, 0);
        const worldMatrix = _mesh.getWorldMatrix();
        return Vector3.TransformNormal(right_local, worldMatrix);
    }

    verticalSlope(v) {
        return Math.atan(Math.abs(v.y / Math.sqrt(v.x * v.x + v.z * v.z)));
    }

    applyCameraDirectionToInput() {

        if (this.moveInput.length() != 0) {
            let forwardCamera = this.getForwardVector(GlobalManager.scene.activeCamera);
            let rightCamera = this.getRightVector(GlobalManager.scene.activeCamera);
            forwardCamera.scaleInPlace(this.moveInput.z);
            rightCamera.scaleInPlace(this.moveInput.x);

            //movement based off of camera's view
            this.moveInput = rightCamera.addInPlace(forwardCamera);
            //this.moveInput = new Vector3((move).normalize().x, 0, (move).normalize().z);    
            this.moveInput.y = 0;
            this.moveInput.normalize();
        }

    }

}

function showAxes(size, mesh, scene) {
    var makeTextPlane = function (text, color, size) {
        var dynamicTexture = new DynamicTexture("DynamicTexture", 50, scene, true);
        dynamicTexture.hasAlpha = true;
        dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color, "transparent", true);
        var plane = new MeshBuilder.CreatePlane("TextPlane", { size: size, updatable: true }, scene);
        plane.material = new StandardMaterial("TextPlaneMaterial", scene);
        plane.material.backFaceCulling = false;
        plane.material.specularColor = new Color3(0, 0, 0);
        plane.material.diffuseTexture = dynamicTexture;
        return plane;
    };

    var axisX = Mesh.CreateLines("axisX", [
        Vector3.Zero(), new Vector3(size, 0, 0), new Vector3(size * 0.95, 0.05 * size, 0),
        new Vector3(size, 0, 0), new Vector3(size * 0.95, -0.05 * size, 0)
    ], scene);
    axisX.color = new Color3(1, 0, 0);
    var xChar = makeTextPlane("X", "red", size / 10);
    xChar.position = new Vector3(0.9 * size, -0.05 * size, 0);

    var axisY = Mesh.CreateLines("axisY", [
        Vector3.Zero(), new Vector3(0, size, 0), new Vector3(-0.05 * size, size * 0.95, 0),
        new Vector3(0, size, 0), new Vector3(0.05 * size, size * 0.95, 0)
    ], scene);
    axisY.color = new Color3(0, 1, 0);
    var yChar = makeTextPlane("Y", "green", size / 10);
    yChar.position = new Vector3(0, 0.9 * size, -0.05 * size);

    var axisZ = Mesh.CreateLines("axisZ", [
        Vector3.Zero(), new Vector3(0, 0, size), new Vector3(0, -0.05 * size, size * 0.95),
        new Vector3(0, 0, size), new Vector3(0, 0.05 * size, size * 0.95)
    ], scene);
    axisZ.color = new Color3(0, 0, 1);
    var zChar = makeTextPlane("Z", "blue", size / 10);
    zChar.position = new Vector3(0, 0.05 * size, 0.9 * size);

    var axisParent = new TransformNode("axisParent");
    axisX.parent = axisY.parent = axisZ.parent = xChar.parent = yChar.parent = zChar.parent = axisParent;

    // If the mesh is provided, position the axes at the mesh's position
    if (mesh) {
        axisParent.parent = mesh;

        axisParent.position = Vector3.Zero();
    }
}


export default Player;