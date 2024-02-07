import { ArcFollowCamera, ArcRotateCamera, BoundingInfo, Color3, Color4, CubeTexture, DefaultRenderingPipeline, DirectionalLight, FlyCamera, FollowCamera, FreeCamera, HavokPlugin, HemisphericLight, KeyboardEventTypes, MeshBuilder, MotionBlurPostProcess, ParticleSystem, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Quaternion, Scalar, Scene, SceneLoader, ShadowGenerator, Sound, StandardMaterial, TargetCamera, Texture, TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";
import { Inspector } from "@babylonjs/inspector";
import HavokPhysics from "@babylonjs/havok";


const NB_DECORS = 30;
const MAIN_SCENE_ROT_X = 0;

const PLAYER_Z_BASE = 14;

const PLAYER_START = new Vector3(-85, 20, 83);
const CAMERA_START_POS = new Vector3(-100, 200, 122);

import envfileUrl from "../assets/env/environment.env";



import { InputController } from "./inputcontroller";
import { GlobalManager, States } from "./globalmanager";
import { SoundManager } from "./soundmanager";

import GameUI from "./gameUI";
import Player from "./player";
import World from "./world";
import { FollowCamera2 } from "./followCamera2";

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
        GlobalManager.gameCamera = new FollowCamera2("camera1", new Vector3(0, 20, -30), GlobalManager.scene);
        //GlobalManager.gameCamera.fov = 0.8;
        GlobalManager.gameCamera.heightOffset = 8;
        GlobalManager.gameCamera.radius = 24;
        GlobalManager.gameCamera.maxCameraSpeed = 10;
        GlobalManager.gameCamera.cameraAcceleration = 0.05;
        GlobalManager.gameCamera.rotationOffset = 0;
        GlobalManager.gameCamera.maxZ = 10000;
        
        //GlobalManager.gameCamera.fov = 0.8;

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

        
        let debugBox = MeshBuilder.CreateBox("debugBox", {size:5});
        debugBox.receiveShadows = true;
        GlobalManager.addShadowCaster(debugBox);
        debugBox.position = new Vector3(123, -63, -59);

        let debugPlane = MeshBuilder.CreatePlane("debugPlane", {size:20}, GlobalManager.scene);
        debugPlane.receiveShadows = true;
        debugPlane.rotation.set(Math.PI/2, 0, 0);
        debugPlane.position = new Vector3(123, -66, -59);

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