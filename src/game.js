import { ArcRotateCamera, BoundingInfo, Color3, Color4, CubeTexture, DefaultRenderingPipeline, DirectionalLight, FlyCamera, FollowCamera, FreeCamera, HavokPlugin, HemisphericLight, KeyboardEventTypes, MeshBuilder, MotionBlurPostProcess, ParticleSystem, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Quaternion, Scalar, Scene, SceneLoader, ShadowGenerator, Sound, StandardMaterial, Texture, TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";
import { Inspector } from "@babylonjs/inspector";
import HavokPhysics from "@babylonjs/havok";


const NB_DECORS = 30;
const SPEED_Z = 40;
const SPEED_X = 10;
const SKIING_VOLUME_MIN = 0.5;
const SKIING_VOLUME_MAX = 2.5;
const MAIN_SCENE_ROT_X = 0;

const PLAYER_Z_BASE = 14;

const PLAYER_START = new Vector3(-85, 20, 83);
const CAMERA_START_POS = new Vector3(-100, 200, 122);

import envfileUrl from "../assets/env/environment.env";


import terrainMeshUrl from "../assets/models/Snow Scene Output 1024.glb";
import terrainDetailTexUrl from "../assets/textures/d00.png";

import meshUrl from "../assets/models/player.glb";
import snowBoardUrl from "../assets/models/intermediate_advanced_snowboard.glb";

import decor1Url from "../assets/models/handpainted_pine_tree.glb";

import flareParticleUrl from "../assets/textures/flare.png";
import { InputController } from "./inputcontroller";
import { GlobalManager, States } from "./globalmanager";
import { SoundManager } from "./soundmanager";

import GameUI from "./gameUI";

class Game {

    engine;
    canvas;
    scene;
    havokInstance;

    gameUI;
    startTimer;

    score = 0;
    nbLives = 5;

    bInspector = false;

    particleSystemSnow;
    player;
    playerSphere;
    decors = [];
    snowboard;

    aie;
    music;
    skiing;

    inputMap = {};
    actions = {};

    constructor(canvas, engine) {
        this.engine = engine;
        this.canvas = canvas;
        GlobalManager.init(canvas, engine);
    }

    async start() {
        this.startTimer = 0;

        await this.initGame();
        GlobalManager.gameState = States.STATE_MENU;

        this.gameLoop();
        this.endGame();


    }
    endGame() {

    }


    gameLoop() {

        const divFps = document.getElementById("fps");
        this.engine.runRenderLoop(() => {

            let delta = this.engine.getDeltaTime() / 1000.0;
            let now = performance.now();

            InputController.update(delta);
            SoundManager.update(delta);
            GlobalManager.update(delta);

            switch (GlobalManager.gameState) {
                default:
                    this.updateGame(delta);
            }

            //Debug
            if (InputController.actions["KeyI"]) {
                this.bInspector = !this.bInspector;

                if (this.bInspector) {
                    GlobalManager.scene.activeCamera = GlobalManager.debugCamera;
                    Inspector.Show(GlobalManager.scene, { embedMode: false })
                }
                else {
                    GlobalManager.scene.activeCamera = GlobalManager.gameCamera;
                    Inspector.Hide();
                }
            }

            InputController.resetActions();
            //divFps.innerHTML = this.engine.getFps().toFixed() + " fps";
            GlobalManager.scene.render();

        });
    }


    updateGame(delta) {

    }

    async getInitializedHavok() {
        return await HavokPhysics();
    }

    async initGame() {

        //GlobalManager.gameState = States.STATE_INIT;

        GlobalManager.gameState = States.STATE_INIT;

        this.havokInstance = await this.getInitializedHavok();
        GlobalManager.scene = new Scene(this.engine);
        GlobalManager.scene.collisionsEnabled = true;


        InputController.init();
        await SoundManager.init();
        await this.createScene();
    }

    async createScene() {

        const hk = new HavokPlugin(true, this.havokInstance);
        // enable physics in the scene with a gravity
        GlobalManager.scene.enablePhysics(new Vector3(0, -9.81, 0), hk);
        GlobalManager.scene.collisionsEnabled = true;
        GlobalManager.scene.gravity = new Vector3(0, -0.15, 0);

        GlobalManager.scene.clearColor = new Color3(0.7, 0.7, 0.95);
        GlobalManager.scene.ambientColor = new Color3(0.9, 0.9, 1);
        /*GlobalManager.scene.fogMode = Scene.FOGMODE_EXP;
        GlobalManager.scene.fogDensity = 0.001;
        GlobalManager.scene.fogStart = SPAWN_POS_Z - 30;
        GlobalManager.scene.fogEnd = SPAWN_POS_Z;
        GlobalManager.scene.fogColor = new Color3(0.6, 0.6, 0.85);*/

        // This creates and positions a free camera (non-mesh)
        GlobalManager.gameCamera = new FollowCamera("camera1", CAMERA_START_POS.clone(), GlobalManager.scene);
        GlobalManager.gameCamera.maxZ = 10000;
        //GlobalManager.gameCamera.fov = 0.8;
        GlobalManager.gameCamera.heightOffset = 18;
        GlobalManager.gameCamera.radius = -20;
        GlobalManager.gameCamera.maxCameraSpeed = 1.5;
        GlobalManager.gameCamera.cameraAcceleration = 0.035;
        GlobalManager.gameCamera.rotationOffset = 0;
        // This targets the camera to scene origin
        // GlobalManager.gameCamera.setTarget(PLAYER_START.clone());


        GlobalManager.debugCamera = new FreeCamera("debugCam", new Vector3(141, -50, -68), GlobalManager.scene);
        GlobalManager.debugCamera.maxZ = 10000;
        GlobalManager.debugCamera.inputs.addMouseWheel();
        // This attaches the camera to the canvas
        //GlobalManager.debugCamera.setTarget(PLAYER_START.clone());
        GlobalManager.debugCamera.attachControl(this.canvas, true);

        // if not setting the envtext of the scene, we have to load the DDS module as well
        var envOptions = {
            environmentTexture: new CubeTexture(envfileUrl, GlobalManager.scene),
            skyboxTexture: envfileUrl,
            skyboxSize: 8000,
            createGround: false,
        };
        this.env = GlobalManager.scene.createDefaultEnvironment(envOptions);

        this.env.skybox.rotation.set(0.43, 4.79, 0);

        // Set up new rendering pipeline
        /*   var pipeline = new DefaultRenderingPipeline("default", true, GlobalManager.scene, [GlobalManager.gameCamera]);
   
           pipeline.glowLayerEnabled = true;
           pipeline.glowLayer.intensity = 0.25;
           pipeline.glowLayer.blurKernelSize = 8;
           pipeline.glowLayer.ldrMerge = true;
   */


        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        var light = new DirectionalLight("light", new Vector3(-39, 93, -242), GlobalManager.scene);
        light.direction = new Vector3(0.83, -0.30, -0.48);
        light.autoUpdateExtends = true;
        light.autoCalcShadowZBounds = true;

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 2;

        let shadowGenerator = new ShadowGenerator(2048, light);
        shadowGenerator.useBlurCloseExponentialShadowMap  = true;
        shadowGenerator.bias = 0.0001;
        shadowGenerator.normalBias = 0.1;
        shadowGenerator.frustumEdgeFalloff = 1.0;
        shadowGenerator.setDarkness(0.2);
        GlobalManager.addShadowGenerator(shadowGenerator);


        // Finally create the motion blur effect :)
        /*        var mb = new MotionBlurPostProcess('mb', GlobalManager.scene, 1.0, GlobalManager.gameCamera);
                mb.motionStrength = 0.5;*/

        // Our built-in 'ground' shape.
        const groundRes = await SceneLoader.ImportMeshAsync("", "", terrainMeshUrl, GlobalManager.scene);
        this.groundMesh = groundRes.meshes[1];
        this.groundMesh.setParent(null);
        groundRes.meshes[0].dispose();

        this.groundMesh.name = "Terrain";
        this.groundMesh.position = new Vector3(0, 0, 0);
        let min = this.groundMesh.getBoundingInfo().boundingBox.minimumWorld;
        let max = this.groundMesh.getBoundingInfo().boundingBox.maximumWorld;
        this.groundMesh.scaling.scaleInPlace(.1);
        let deltaX = (max.x - min.x) / 20;
        let deltaZ = (max.z - min.z) / 20;
        let deltaY = (max.y - min.y) / 20;
        this.groundMesh.position.set(deltaX, -deltaY, deltaZ);
        this.groundMesh.receiveShadows = true;
        GlobalManager.addShadowCaster(this.groundMesh, true);

        let groundMat = this.groundMesh.material;
        groundMat.environmentIntensity = 1;
        groundMat.ambientColor = new Color4(0, 0, 0, 0);
        groundMat.ambientTexture.level = 1;
        groundMat.ambientTextureStrength = 0.1;

        groundMat.detailMap.texture = new Texture(terrainDetailTexUrl, GlobalManager.scene);
        groundMat.detailMap.texture.uScale = 256;
        groundMat.detailMap.texture.vScale = 256;
        groundMat.detailMap.isEnabled = true;
        groundMat.detailMap.diffuseBlendLevel = 0.3; // between 0 and 1
        groundMat.detailMap.bumpLevel = 1; // between 0 and 1
        //groundMat.bumpTexture.level = 0.4;
        groundMat.detailMap.roughnessBlendLevel = 0.5; // between 0 and 1

        const groundAggregate = new PhysicsAggregate(this.groundMesh, PhysicsShapeType.MESH, { mass: 0, friction: 0.1, restitution: 0.3 }, GlobalManager.scene);
        groundAggregate.body.setMotionType(PhysicsMotionType.STATIC);

        let pivot = new TransformNode("world", GlobalManager.scene);



        let res = await SceneLoader.ImportMeshAsync("", "", meshUrl, GlobalManager.scene);

        // Set the target of the camera to the first imported mesh
        this.player = res.meshes[0];
        //mb.excludeSkinnedMesh(this.player);

        GlobalManager.gameCamera.lockedTarget = this.player;

        this.player.name = "Player";
        this.player.scaling = new Vector3(1, 1, 1);
        this.player.position = Vector3.Zero();
        this.player.rotation = new Vector3(0, 0, 0);
        //        res.animationGroups[0].stop();
        //        res.animationGroups[1].play(true);
        GlobalManager.addShadowCaster(this.player, true);

        res = await SceneLoader.ImportMeshAsync("", "", snowBoardUrl, GlobalManager.scene);
        this.snowboard = res.meshes[0];
        this.snowboard.scaling.scaleInPlace(0.8);
        this.snowboard.position.set(0, 0.05, 0.125);
        this.snowboard.name = "snowboard";
        this.snowboard.parent = this.player;

        GlobalManager.addShadowCaster(this.snowboard, true);

        this.playerSphere = MeshBuilder.CreateSphere("playerCap", { diameter: 0.4 });
        /*this.playerSphere = MeshBuilder.CreateSphere("playerCap", { diameter: 2});
        this.playerSphere.scaling.y = 0.2;
        this.playerSphere.scaling.x = 0.2;
        this.playerSphere.bakeCurrentTransformIntoVertices();
        this.playerSphere.scaling.y = 1;*/
        this.playerSphere.position = PLAYER_START.clone();
        this.playerSphere.checkCollisions = true;
        this.playerSphere.collisionGroup = 1;
        this.playerSphere.visibility = 0;
        this.playerSphere.showBoundingBox = false;

        this.playerAggregate = new PhysicsAggregate(this.playerSphere, PhysicsShapeType.SPHERE, { mass: 1, friction: 0.2, restitution: 0.2 }, GlobalManager.scene);
        this.playerAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);

        //On bloque les rotations avec cette méthode, à vérifier.
        this.playerAggregate.body.setMassProperties({
            inertia: new Vector3(0, 0.4, 0),
            centerOfMass: new Vector3(0, 0, 0),
            mass: 1,
            //inertiaOrientation: new Quaternion(0, 0, 0, 0)
        });

        this.player.parent = this.playerSphere;


        let debugBox = MeshBuilder.CreateBox("debugBox", {size:5});
        debugBox.receiveShadows = true;
        GlobalManager.addShadowCaster(debugBox);
        debugBox.position = new Vector3(123, -63, -59);

        let debugPlane = MeshBuilder.CreatePlane("debugPlane", {size:20}, GlobalManager.scene);
        debugPlane.receiveShadows = true;
        debugPlane.rotation.set(Math.PI/2, 0, 0);
        debugPlane.position = new Vector3(123, -66, -59);

        //let decorModele = MeshBuilder.CreateBox("decor", { width: 0.5, height: 1, depth: 1 }, GlobalManager.scene);
        res = await SceneLoader.ImportMeshAsync("", "", decor1Url, GlobalManager.scene);
        let decorModele = res.meshes[0];

        /*
                for (let i = 0; i < NB_DECORS; i++) {
                    let decor = decorModele.clone("");
                    decor.normalizeToUnitCube();
        
        
                    decor.scaling.scaleInPlace(Scalar.RandomRange(5, 10));
        
                    let x = Scalar.RandomRange(-TRACK_WIDTH / 1.85, TRACK_WIDTH / 1.85);
                    let z = Scalar.RandomRange(SPAWN_POS_Z * .5, SPAWN_POS_Z);
                    decor.position.set(x, 0, z);
        
                    let childMeshes = decor.getChildMeshes();
        
                    let min = childMeshes[0].getBoundingInfo().boundingBox.minimumWorld;
                    let max = childMeshes[0].getBoundingInfo().boundingBox.maximumWorld;
        
                    for (let i = 0; i < childMeshes.length; i++) {
        
                        let meshMin = childMeshes[i].getBoundingInfo().boundingBox.minimumWorld;
                        let meshMax = childMeshes[i].getBoundingInfo().boundingBox.maximumWorld;
        
        
                        min = Vector3.Minimize(min, meshMin);
                        max = Vector3.Maximize(max, meshMax);
                    }
                    //On diminue les bouding boxes pour ne pas toucher les branches
                    //On aurait du filtrer et ne prendre que le tronc mais l'objet est ainsi
                    min = min.multiplyByFloats(0.4, 1, 0.4);
                    max = max.multiplyByFloats(0.4, 1, 0.4);
                    decor.setBoundingInfo(new BoundingInfo(min, max));
                    //decor.showBoundingBox = true;
                    decor.checkCollisions = true;
                    decor.collisionGroup = 2;
                    decor.parent = pivot;
        
                    this.decors.push(decor);
                }
                decorModele.dispose();
        */
        // Create a particle system
        this.particleSystemSnow = new ParticleSystem("particles", 2000, GlobalManager.scene);
        this.particleSystemSnow.gravity = new Vector3(0, -9.81, 0);
        //Texture of each particle
        this.particleSystemSnow.particleTexture = new Texture(flareParticleUrl, GlobalManager.scene);
        // Where the particles come from
        this.particleSystemSnow.emitter = new TransformNode("spawnsnow", GlobalManager.scene);
        this.particleSystemSnow.emitter.parent = this.player;
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

        this.gameUI = new GameUI();
        await this.gameUI.init();
        this.gameUI.show(true);

        //this.music = new Sound("music", musicUrl, GlobalManager.scene, undefined, { loop: true, autoplay: true, volume: 0.4 });
        //this.aie = new Sound("aie", hitSoundUrl, GlobalManager.scene);
        //this.skiing = new Sound("skiing", skiingSoundUrl, GlobalManager.scene, undefined, { loop: true, autoplay: true, volume: SKIING_VOLUME_MIN });

    }
}

export default Game;