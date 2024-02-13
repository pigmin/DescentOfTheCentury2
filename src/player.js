
import { GlobalManager, PhysMasks } from "./globalmanager";
import { SoundManager } from "./soundmanager";
import { InputController } from "./inputcontroller";

import meshUrl from "../assets/models/girl1.glb";
import flareParticleUrl from "../assets/textures/flare.png";
import { AxesViewer, Color3, Color4, DynamicTexture, Matrix, Mesh, MeshBuilder, ParticleSystem, PhysicsAggregate, PhysicsMotionType, PhysicsRaycastResult, PhysicsShapeType, Ray, RayHelper, SceneLoader, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";



const DEBUG_FORCES = false;
const USE_FORCES = false;
let RUNNING_SPEED = 10;
let AIR_SPEED = 10;
let JUMP_IMPULSE = 16;
const PLAYER_MASS = 1;
const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.0;
const RIDE_HEIGHT = 1.0;
const RIDE_CENTER_OFFSET = RIDE_HEIGHT / 2.0;
const ONGROUND_LENGTH = PLAYER_HEIGHT * 1.3;
const RAY_DOWN_LENGTH = 3.0;
const MESH_PLAYER_HEIGHT = RIDE_HEIGHT - 0.05;
const RIDE_SPRING_STRENGTH = 200;
const RIDE_SPRING_DAMPER = 10;
const BODY_FORCE_FEED_BACK_MULTIPLIER = 0.8;

const SPEED_Z = 40;
const SPEED_X = 10;
const SKIING_VOLUME_MIN = 0.5;
const SKIING_VOLUME_MAX = 2.5;

class Player {

    //Position dans le monde
    transform;
    //Mesh
    gameObject;
    particleSystemSnow;

    maxSlopeAngle = 0.8;
    currentSlope = 0;
    rayHit = new PhysicsRaycastResult();
    gravitationalForce;
    hitMatrix = new Matrix();
    hitBodyVector = Vector3.Zero();

    cameraRoot;

    //Physic
    playerAggregate;

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

    moveDir = new Vector3(0, 0, 0);
    direction = new Vector3();

    moveDirLines;

    x = 0.0;
    y = 0.0;
    z = 0.0;

    speed = 0;


    constructor(x, y, z) {

        this.x = x || 0.0;
        this.y = y || 0.0;
        this.z = z || 0.0;
        this.transform = new MeshBuilder.CreateCapsule("player", { height: PLAYER_HEIGHT, radius: PLAYER_RADIUS }, GlobalManager.scene);
        this.transform.position = new Vector3(this.x, this.y, this.z);

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
            this.moveDirLines = new AxesViewer(GlobalManager.scene, 2);
            this.moveDirLines.xAxis.parent = this.transform;
            this.moveDirLines.yAxis.parent = this.transform;
            this.moveDirLines.zAxis.parent = this.transform;
        }
        //showAxes(5, this.transform, GlobalManager.scene);


    }

    async init() {

        const mesh1 = await SceneLoader.ImportMeshAsync("", "", meshUrl, GlobalManager.scene);
        this.gameObject = mesh1.meshes[0];
        this.gameObject.name = "Player";
        this.gameObject.scaling = new Vector3(1, 1, 1);
        this.gameObject.position = new Vector3(0, -MESH_PLAYER_HEIGHT, 0);
        this.gameObject.rotate(Vector3.UpReadOnly, Math.PI);
        this.gameObject.bakeCurrentTransformIntoVertices();
        if (DEBUG_FORCES) {
            mesh1.meshes[0].visibility = 0;
            mesh1.meshes[1].visibility = 0;
        }
        this.cameraRoot.setParent(this.gameObject);
        this.cameraRoot.position = new Vector3(0, 0, 0);

        GlobalManager.gameCamera.lockedTarget = this.gameObject;
        GlobalManager.addShadowCaster(this.gameObject, true);

        this.playerAggregate = new PhysicsAggregate(this.transform, PhysicsShapeType.CAPSULE, { mass: PLAYER_MASS, friction: 0.5, restitution: 0.1 }, GlobalManager.scene);
        this.playerAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);

        //On bloque les rotations avec cette méthode, à vérifier.
        this.playerAggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0),  // 0, 0, 0 ...??
            centerOfMass: new Vector3(0, PLAYER_HEIGHT / 2, 0),
            mass: PLAYER_MASS,
            //inertiaOrientation: new Quaternion(0, 0, 0, 0)
        });

        this.gravitationalForce = GlobalManager.gravityVector.scale(PLAYER_MASS);

        //console.log(this.playerAggregate.body.getGravityFactor());

        //On annule tous les frottements, on laisse le IF pour penser qu'on peut changer suivant le contexte
        if (USE_FORCES) {
            this.playerAggregate.body.setLinearDamping(0);
            this.playerAggregate.body.setAngularDamping(0.05);
        }
        else {
            this.playerAggregate.body.setLinearDamping(0);
            this.playerAggregate.body.setAngularDamping(0.05);
        }

        this.gameObject.parent = this.transform;
        this.animationsGroup = mesh1.animationGroups;
        this.animationsGroup[0].stop();
        this.idleAnim = GlobalManager.scene.getAnimationGroupByName('Idle');
        this.runAnim = GlobalManager.scene.getAnimationGroupByName('Running');
        this.walkAnim = GlobalManager.scene.getAnimationGroupByName('Walking');
        this.idleAnim.start(true, 1.0, this.idleAnim.from, this.idleAnim.to, false);

        //ithis.initParticles();
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


    inputMove() {
        let ret = false;
        const axis = InputController.getAxisVectorP1();

        if (Math.abs(axis.length()) < 0.01) {
            this.moveDir.setAll(0);
        }
        else {
            this.moveDir.x = axis.x;
            this.moveDir.y = 0;
            this.moveDir.z = axis.y;
            ret = true;
        }
        this.speed = 1;//dthis.moveDir.length();

        this.moveDir.normalize();
        return ret;
    }
    //Pour le moment on passe les events clavier ici, on utilisera un InputManager plus tard
    update(delta) {

        let bWasWalking = this.bWalking;
        this.bWalking = this.inputMove();

        let bWasOnGround = this.bOnGround;
        this.bOnGround = this.checkGround();

        let gravity = this.playerAggregate.body.getLinearVelocity().y;

        //On applique tout suivant l'orientation de la camera
        this.applyCameraDirectionToMoveDirection();

        this.applyFloatForce();
        //On regarde le slope etc.
        this.calculateSlope();
        this.applySlopeOnMove();


        if (this.bOnGround) {
            //Inputs
            this.moveDir.scaleInPlace(this.speed * RUNNING_SPEED);
        }
        else {
            //Inputs
            this.moveDir.scaleInPlace(this.speed * AIR_SPEED);
        }


        //this.gameObject.setDirection(this.direction);
        this.gameObject.lookAt(this.direction);

        if (InputController.actions["Space"] && this.bOnGround) {
            //SoundManager.playSound(0);
            this.playerAggregate.body.applyImpulse(new Vector3(0, JUMP_IMPULSE, 0), Vector3.ZeroReadOnly);
            this.bJumping = true;
        }
        //console.log(this.moveDir.x, this.moveDir.y, this.moveDir.z);
        if (USE_FORCES) {
            this.playerAggregate.body.applyForce(this.moveDir, Vector3.ZeroReadOnly);
        }
        else {
            this.moveDir.set(this.moveDir.x, this.playerAggregate.body.getLinearVelocity().y, this.moveDir.z);
            this.playerAggregate.body.setLinearVelocity(this.moveDir);
        }


        this.updateAnimations(bWasWalking);

    }


    updateAnimations(bWasWalking) {

        //Animations
        if (this.bWalking) {

            if (!bWasWalking) {
                this.runAnim.start(true, 1.0, this.runAnim.from, this.runAnim.to, false);
            }
        }
        else {
            if (bWasWalking) {
                this.runAnim.stop();
                this.idleAnim.start(true, 1.0, this.idleAnim.from, this.idleAnim.to, false);
            }
        }
    }


    checkGround() {
        let ret = false;

        var rayOrigin = this.transform.absolutePosition;

        var ray1Dir = Vector3.DownReadOnly;
        var ray1Len = RAY_DOWN_LENGTH;
        var ray1Dest = rayOrigin.add(ray1Dir.scale(ray1Len));

        this.rayHit.reset();
        GlobalManager.scene.getPhysicsEngine().raycastToRef(rayOrigin, ray1Dest, this.rayHit, { collideWith: PhysMasks.PHYS_MASK_ALL });
        if (this.rayHit.hasHit) {
            //console.log("Collision at ", this.rayHit.hitPointWorld);
            if (this.rayHit.hitDistance < ONGROUND_LENGTH) {
                if (!this.bOnGround) {
                    console.log("Grounded");

                }

                ret = true;
            }
        }
        return ret;
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
            let dotProduct = Vector3.Dot(this.moveDir, planeNormal);

            // Calcul du vecteur perpendiculaire
            let perpendicularVector = planeNormal.scale(dotProduct);

            // Projection du vecteur sur le plan
            let projectedVector = this.moveDir.subtract(perpendicularVector);


            if (DEBUG_FORCES)
                this.moveDirLines.update(Vector3.ZeroReadOnly, this.moveDir, projectedVector, planeNormal);

            // projectedVector est maintenant la projection de vectorToProject sur le plan
            this.moveDir = projectedVector;

        }
        else {
            if (DEBUG_FORCES)
                this.moveDirLines.update(Vector3.ZeroReadOnly, this.moveDir, this.moveDir, this.transform.up);
        }
    }


    applyFloatForce() {

        if (this.rayHit.hasHit) {

            let vel = this.playerAggregate.body.getLinearVelocity();

            let rayDir = Vector3.DownReadOnly;
            let otherVel = Vector3.Zero();
            let hitBody = this.rayHit.body;
            if (hitBody != null) {
                hitBody.getLinearVelocityToRef(otherVel);
            }
            let rayDirVel = Vector3.Dot(rayDir, vel);
            let otherDirVel = Vector3.Dot(rayDir, otherVel);
            let relVel = rayDirVel - otherDirVel;
            let currHeight = this.rayHit.hitDistance - RIDE_HEIGHT;

            let springForce = (currHeight * RIDE_SPRING_STRENGTH) - (relVel * RIDE_SPRING_DAMPER);
            let maintainHeightForce = rayDir.scale(springForce).subtract(this.gravitationalForce);
            //Vector3 oscillationForce = springForce * Vector3.down;


            this.playerAggregate.body.applyForce(maintainHeightForce, Vector3.ZeroReadOnly);
            if (DEBUG_FORCES) {
                this.ray1.origin = this.transform.position;
                this.ray1.direction = rayDir;
                this.ray1.length = springForce;
                this.ray1Helper.show(GlobalManager.scene, new Color3(1, 1, 0));
            }
            //console.log(this.rayHit.hitDistance, springForce);

            if (hitBody != null) {
                //console.log(this.rayHit);
                hitBody.transformNode.getWorldMatrix().invertToRef(this.hitMatrix);
                Vector3.TransformCoordinatesToRef(this.rayHit.hitPoint, this.hitMatrix, this.hitBodyVector);
                hitBody.applyForce(maintainHeightForce.scale(BODY_FORCE_FEED_BACK_MULTIPLIER).negate(), this.hitBodyVector);
            }
        }
        else {
            this.ray1Helper.hide();
        }

    }

    getUpVector(_mesh) {
        _mesh.computeWorldMatrix(true);
        var forward_local = new Vector3(0, 1, 0);
        const worldMatrix = _mesh.getWorldMatrix();
        return Vector3.TransformNormal(forward_local, worldMatrix);
    }

    getForwardVector(_mesh) {
        _mesh.computeWorldMatrix(true);
        var forward_local = new Vector3(0, 0, 1);
        const worldMatrix = _mesh.getWorldMatrix();
        return Vector3.TransformNormal(forward_local, worldMatrix);
    }

    getRightVector(_mesh) {
        _mesh.computeWorldMatrix(true);
        var forward_local = new Vector3(1, 0, 0);
        const worldMatrix = _mesh.getWorldMatrix();
        return Vector3.TransformNormal(forward_local, worldMatrix);
    }

    verticalSlope(v) {
        return Math.atan(Math.abs(v.y / Math.sqrt(v.x * v.x + v.z * v.z)));
    }

    applyCameraDirectionToMoveDirection() {

        if (this.moveDir.length() != 0) {
            let forwardCamera = this.getForwardVector(GlobalManager.scene.activeCamera);
            let rightCamera = this.getRightVector(GlobalManager.scene.activeCamera);
            forwardCamera.scaleInPlace(this.moveDir.z);
            rightCamera.scaleInPlace(this.moveDir.x);

            //movement based off of camera's view
            this.moveDir = rightCamera.addInPlace(forwardCamera);
            //this.moveDir = new Vector3((move).normalize().x, 0, (move).normalize().z);    
            this.moveDir.y = 0;
            this.moveDir.normalize();
            this.direction.copyFrom(this.moveDir);
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