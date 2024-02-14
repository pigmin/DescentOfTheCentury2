import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Inspector } from '@babylonjs/inspector';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import HavokPhysics from "@babylonjs/havok";
import { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';

const NB_DECORS = 30;
const MAIN_SCENE_ROT_X = 0;

const PLAYER_Z_BASE = 14;

const PLAYER_START = new Vector3(71.6, -26, -10.6);
const CAMERA_START_POS = new Vector3(50, -20, -14);

import envfileUrl from "../assets/env/environment.env";



import { GlobalManager, States } from "./globalmanager";
import { InputController } from "./inputcontroller";
import { SoundManager } from "./soundmanager";

import { FollowCamera2 } from "./followCamera2";
import GameUI from "./gameUI";
import Player from "./player";
import World from "./world";


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

    player;
    decors = [];

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

        this.world.update(delta);
        
        this.player.update(delta);

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

        this.player = new Player(PLAYER_START.x, PLAYER_START.y, PLAYER_START.z);
        await this.player.init();

        this.world = new World(0, 0, 0);
        await this.world.init();

    }

    async createScene() {

        const hk = new HavokPlugin(true, this.havokInstance);
        // enable physics in the scene with a gravity
        GlobalManager.scene.enablePhysics(GlobalManager.gravityVector, hk);
        //GlobalManager.scene.gravity = new Vector3(0, -0.15, 0);      
        GlobalManager.scene.clearColor = new Color3(0.7, 0.7, 0.95);
        GlobalManager.scene.ambientColor = new Color3(0.9, 0.9, 1);
        /*GlobalManager.scene.fogMode = Scene.FOGMODE_EXP;
        GlobalManager.scene.fogDensity = 0.001;
        GlobalManager.scene.fogStart = SPAWN_POS_Z - 30;
        GlobalManager.scene.fogEnd = SPAWN_POS_Z;
        GlobalManager.scene.fogColor = new Color3(0.6, 0.6, 0.85);*/
/*
        GlobalManager.gizmoManager = new GizmoManager(GlobalManager.scene);
        GlobalManager.gizmoManager.positionGizmoEnabled = true;
        GlobalManager.gizmoManager.rotationGizmoEnabled = true;*/

        // This creates and positions a free camera (non-mesh)
        GlobalManager.gameCamera = new FollowCamera2("camera1", CAMERA_START_POS, GlobalManager.scene);
        //GlobalManager.gameCamera.fov = 0.8;
        GlobalManager.gameCamera.heightOffset = 3;
        GlobalManager.gameCamera.lowerHeightOffsetLimit = 1;
        GlobalManager.gameCamera.upperHeightOffsetLimit = 10;
        GlobalManager.gameCamera.radius = -15;
        GlobalManager.gameCamera.lowerRadiusLimit = -25;
        GlobalManager.gameCamera.upperRadiusLimit = -4;
        GlobalManager.gameCamera.maxCameraSpeed = 20;
        GlobalManager.gameCamera.cameraAcceleration = 0.1;
        GlobalManager.gameCamera.rotationOffset = 0;
        GlobalManager.gameCamera.maxZ = 10000;
        GlobalManager.gameCamera.wheelPrecision = 0.5; //Mouse wheel speed
        GlobalManager.gameCamera.attachControl(this.canvas, true);
        GlobalManager.gameCamera.inputs.attached.pointers.angularSensibilityX = 1.5;
        GlobalManager.gameCamera.inputs.attached.pointers.angularSensibilityY = 1.5;


        GlobalManager.debugCamera = new FreeCamera("debugCam", new Vector3(0, 8, -10), GlobalManager.scene);
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
        GlobalManager.environment = GlobalManager.scene.createDefaultEnvironment(envOptions);

        GlobalManager.environment.skybox.rotation.set(0.43, 4.79, 0);

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

        let shadowGenerator = new ShadowGenerator(4096, light);
        shadowGenerator.useBlurCloseExponentialShadowMap  = true;
        shadowGenerator.bias = 0.001;
        shadowGenerator.normalBias = 0.25;
        shadowGenerator.frustumEdgeFalloff = 1.0;
        shadowGenerator.setDarkness(0.0);
        GlobalManager.addShadowGenerator(shadowGenerator);


        // Finally create the motion blur effect :)
        /*        var mb = new MotionBlurPostProcess('mb', GlobalManager.scene, 1.0, GlobalManager.gameCamera);
                mb.motionStrength = 0.5;*/

        


        //let decorModele = MeshBuilder.CreateBox("decor", { width: 0.5, height: 1, depth: 1 }, GlobalManager.scene);
        /*
        let res = await SceneLoader.ImportMeshAsync("", "", decor1Url, GlobalManager.scene);
        let decorModele = res.meshes[0];

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


        this.gameUI = new GameUI();
        await this.gameUI.init();
        this.gameUI.show(true);

        //this.music = new Sound("music", musicUrl, GlobalManager.scene, undefined, { loop: true, autoplay: true, volume: 0.4 });
        //this.aie = new Sound("aie", hitSoundUrl, GlobalManager.scene);
        //this.skiing = new Sound("skiing", skiingSoundUrl, GlobalManager.scene, undefined, { loop: true, autoplay: true, volume: SKIING_VOLUME_MIN });

    }
}

export default Game;