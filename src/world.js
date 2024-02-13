import { ActionManager, Axis, Color3, Color4, Engine, ExecuteCodeAction, Material, Matrix, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShape, PhysicsShapeType, Quaternion, Scalar, SceneLoader, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";
import { GlobalManager, PhysMasks, States } from "./globalmanager";

import terrainMeshUrl from "../assets/models/Snow Scene Output 1024.glb";
import terrainDetailTexUrl from "../assets/textures/d00.png";

import terrainMeshTexture from "../assets/textures/Snow Bitmap Output 1024.png";

import decor1Url from "../assets/models/handpainted_pine_tree.glb";

import debugTexUrl from "../assets/textures/GridEmissive.png";

class World {

    x;
    y;
    z;

    gameObject;
    meshAggregate;

    zoneA;
    zoneB;

    Boards_primitive1;


    constructor(x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    async init() {


        const result = await SceneLoader.ImportMeshAsync("", "", terrainMeshUrl, GlobalManager.scene);
        this.gameObject = result.meshes[1];
        this.gameObject.setParent(null);
        result.meshes[0].dispose();

        this.gameObject.name = "Terrain";
        this.gameObject.position = new Vector3(0, 0, 0);
        let min = this.gameObject.getBoundingInfo().boundingBox.minimumWorld;
        let max = this.gameObject.getBoundingInfo().boundingBox.maximumWorld;
        this.gameObject.scaling.scaleInPlace(.05);
        let deltaX = (max.x - min.x) / 40;
        let deltaZ = (max.z - min.z) / 40;
        let deltaY = (max.y - min.y) / 40;
        this.gameObject.position.set(deltaX, -deltaY, deltaZ);
        this.gameObject.receiveShadows = true;
        GlobalManager.addShadowCaster(this.gameObject, true);

        let groundMat = this.gameObject.material;
        groundMat.environmentIntensity = 1;
        groundMat.ambientColor = new Color4(0, 0, 0, 0);
        groundMat.ambientTexture.level = 1;
        groundMat.ambientTextureStrength = 0.1;
        groundMat.roughness = 1;
        groundMat.metallic = 0;


        groundMat.detailMap.texture = new Texture(terrainDetailTexUrl, GlobalManager.scene);
        groundMat.detailMap.texture.uScale = 512;
        groundMat.detailMap.texture.vScale = 512;
        groundMat.detailMap.isEnabled = true;
        groundMat.detailMap.diffuseBlendLevel = 0.35; // between 0 and 1
        groundMat.detailMap.bumpLevel = 1; // between 0 and 1
        //groundMat.bumpTexture.level = 0.4;
        groundMat.detailMap.roughnessBlendLevel = 0.5; // between 0 and 1

        const groundAggregate = new PhysicsAggregate(this.gameObject, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.2 }, GlobalManager.scene);
        groundAggregate.body.setMotionType(PhysicsMotionType.STATIC);
        groundAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;

        let debugMat = new StandardMaterial("debugMat", GlobalManager.scene);
        debugMat.emissiveTexture = new Texture(debugTexUrl);
        debugMat.emissiveColor = new Color3(0, 0.1, 0.4);
        debugMat.diffuseColor = new Color3(0.57, 0.57, 0.7);
        debugMat.emissiveTexture.level = 2;

        let debugPlane = MeshBuilder.CreateBox("debugPlane", { width: 48, height: 0.5, depth: 48, subdivisions: 16 }, GlobalManager.scene);
        debugPlane.receiveShadows = true;
        debugPlane.material = debugMat.clone();
        debugPlane.material.emissiveTexture.uScale = 16;
        debugPlane.material.emissiveTexture.vScale = 16;
        debugPlane.material.Color3 = new Color3(1, 0, 0);
        debugPlane.position = new Vector3(50, -38.0, 0);
        let debugAggregate = new PhysicsAggregate(debugPlane, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.2 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.STATIC);
        debugAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;

        let debugBouncingBox = MeshBuilder.CreateBox("debugBouncingBox", { size: 5 });
        debugBouncingBox.receiveShadows = true;
        GlobalManager.addShadowCaster(debugBouncingBox);
        debugBouncingBox.position = new Vector3(38, -37.25, 3);
        debugBouncingBox.scaling = new Vector3(1, 0.1, 2);
        debugBouncingBox.rotation = new Vector3(0, 0, 0);
        debugBouncingBox.material = debugMat.clone();
        debugBouncingBox.material.diffuseColor = new Color4(0.8, 0, 0, 0.5);
        debugBouncingBox.material.emissiveColor = new Color4(0.2, 0, 0, 0.5);

        debugAggregate = new PhysicsAggregate(debugBouncingBox, PhysicsShapeType.BOX, { mass: 15, friction: 0.5, restitution: 0.8 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
/*

        let debugBoxMod = MeshBuilder.CreateBox("debugBoxD0", { size: 1 });
        GlobalManager.addShadowCaster(debugBoxMod);
        debugBoxMod.material = debugMat.clone();
        debugBoxMod.material.diffuseColor = new Color4(0.0, 0.8, 0, 1);
        debugBoxMod.material.emissiveColor = new Color4(0.0, 0.4, 0, 1);
        debugBoxMod.receiveShadows = true;

        let boxArray = []
        for (let i = 0; i < 15; i++) {
            //let debugBox = debugBoxMod.createInstance("debugBoxD"+i);
            let position = new Vector3(Scalar.RandomRange(25, 70), Scalar.RandomRange(60, -30), Scalar.RandomRange(-20, 20));
            let rotation = Quaternion.FromEulerAngles(0, Scalar.RandomRange(-Math.PI / 2, Math.PI / 2), Scalar.RandomRange(-Math.PI / 4, Math.PI / 4));
            let scale = new Vector3(Scalar.RandomRange(1.0, 4.0), Scalar.RandomRange(0.25, 1.0), Scalar.RandomRange(1.5, 3.0));
            let matrix = Matrix.Compose(scale, rotation, position);
            boxArray.push(matrix);
        }
        debugBoxMod.thinInstanceAdd(boxArray, true);
        debugAggregate = new PhysicsAggregate(debugBoxMod, PhysicsShapeType.BOX, { mass: 15, friction: 0.5, restitution: 0.1 }, GlobalManager.scene);
        //debugAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);

          let debugBoxMod2 = MeshBuilder.CreateBox("debugBoxS0", { size: 1 });
        GlobalManager.addShadowCaster(debugBoxMod2);
        debugBoxMod2.material = debugMat;
        debugBoxMod2.receiveShadows = true;

        let boxArray2 = []
        for (let i = 0; i < 15; i++) {
            let position = new Vector3(Scalar.RandomRange(25, 70), -37.65, Scalar.RandomRange(-20, 20));
            let scaling = new Vector3(Scalar.RandomRange(0.5, 1.5), 0.5, 5);
            let rotation = Quaternion.Identity();
            let matrix = Matrix.Compose(scaling, rotation, position);
            boxArray2.push(matrix);
        }
        debugBoxMod2.thinInstanceAdd(boxArray2, true);

        debugAggregate = new PhysicsAggregate(debugBoxMod2, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.1 }, GlobalManager.scene);
        //    debugAggregate.body.setMotionType(PhysicsMotionType.STATIC);

*/
        this.createClones();

        let debugSphere = MeshBuilder.CreateSphere("debugSphere", { diameter: 5 });
        debugSphere.receiveShadows = true;
        GlobalManager.addShadowCaster(debugSphere);
        debugSphere.position = new Vector3(18, -31, 8);
        debugSphere.rotation = new Vector3(0, Math.PI / 3, Math.PI / 5);
        debugSphere.material = debugMat.clone();
        debugSphere.material.alpha = 0.5;
        debugAggregate = new PhysicsAggregate(debugSphere, PhysicsShapeType.SPHERE, { mass: 3, friction: 0.5, restitution: 0.1 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);


        let debugRampe = MeshBuilder.CreateBox("debugRampe", { size: 1 });
        debugRampe.scaling = new Vector3(20, 0.2, 5);
        debugRampe.receiveShadows = true;
        GlobalManager.addShadowCaster(debugRampe);
        debugRampe.position = new Vector3(46, -37, 8);
        debugRampe.rotation = new Vector3(0, 0, Math.PI / 6);
        debugRampe.material = debugMat.clone();
        debugAggregate = new PhysicsAggregate(debugRampe, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.0 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
        debugAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;

        debugRampe = MeshBuilder.CreateBox("debugRampe2", { size: 1 });
        debugRampe.scaling = new Vector3(5, 0.2, 5);
        debugRampe.receiveShadows = true;
        GlobalManager.addShadowCaster(debugRampe);
        debugRampe.position = new Vector3(57.1, -32, 8);
        //debugRampe.rotation = new Vector3(0, Scalar.RandomRange(-Math.PI, Math.PI), Math.PI/6);
        debugRampe.material = debugMat.clone();
        debugAggregate = new PhysicsAggregate(debugRampe, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.0 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
        debugAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;

        /*  
        
                this.zoneA = MeshBuilder.CreateBox("zoneA", { width: 4.2, height: 0.2, depth: 2.0 }, GlobalManager.scene);
                let zoneMat = new StandardMaterial("zoneA", GlobalManager.scene);
                zoneMat.diffuseColor = Color3.Red();
                //zoneMat.alpha = 0.5;
                this.zoneA.material = zoneMat;
                this.zoneA.position = new Vector3(0, 0.1, 27.5);
        
        
                this.zoneB = MeshBuilder.CreateBox("zoneB",  { width: 4.2, height: 0.2, depth: 2.0 }, GlobalManager.scene);
                let zoneMatB = new StandardMaterial("zoneB", GlobalManager.scene);
                zoneMatB.diffuseColor = Color3.Green();
                //zoneMatB.alpha = 0.5;
                this.zoneB.material = zoneMatB;
                this.zoneB.position = new Vector3(0, 0.1, -27.5);
        */

    }


    createClones() {
        let debugMat = new StandardMaterial("debugMat", GlobalManager.scene);
        debugMat.emissiveTexture = new Texture(debugTexUrl);
        debugMat.emissiveColor = new Color3(0, 0.1, 0.4);
        debugMat.diffuseColor = new Color3(0.57, 0.57, 0.7);
        debugMat.emissiveTexture.level = 2;

        //Scene render/register
        // Our built-in 'sphere' shape.
        let debugBoxMod = MeshBuilder.CreateBox("debugBoxD0", { size: 1 });
        GlobalManager.addShadowCaster(debugBoxMod);
        debugBoxMod.material = debugMat.clone();
        debugBoxMod.material.diffuseColor = new Color4(0.0, 0.8, 0, 1);
        debugBoxMod.material.emissiveColor = new Color4(0.0, 0.4, 0, 1);
        debugBoxMod.receiveShadows = true;
        
        // Move the sphere upward 1/2 its height

        let boxeArray = [];
        for (let i = 0; i < 15; i++) {
//                const matrix2 = Matrix.Translation(i * 10 + Scalar.RandomRange(-1, 1), -30, 10 + Scalar.RandomRange(-1, 1));

                let position = new Vector3(Scalar.RandomRange(25, 70), Scalar.RandomRange(60, -30), Scalar.RandomRange(-20, 20));
                let rotation = Quaternion.FromEulerAngles(0, Scalar.RandomRange(-Math.PI / 2, Math.PI / 2), Scalar.RandomRange(-Math.PI / 4, Math.PI / 4));
                let scale = new Vector3(Scalar.RandomRange(1.0, 4.0), Scalar.RandomRange(0.25, 1.0), Scalar.RandomRange(1.5, 3.0));
                let matrix = Matrix.Compose(scale, rotation, position);


                boxeArray.push(matrix);
        }

            debugBoxMod.thinInstanceAdd(boxeArray, true);
        
        let debugAggregate = new PhysicsAggregate(debugBoxMod, PhysicsShapeType.BOX, { mass: 15, friction: 0.5, restitution: 0.1 }, GlobalManager.scene);


    }

    setCollisionZones(curlingMesh) {
        this.zoneA.actionManager = new ActionManager(GlobalManager.scene);
        this.zoneA.actionManager.registerAction(
            new ExecuteCodeAction(
                {
                    trigger: ActionManager.OnIntersectionEnterTrigger,
                    parameter: curlingMesh,
                },
                (actionEv) => {
                    GlobalManager.goalZoneA();
                }
            )
        );
        this.zoneB.actionManager = new ActionManager(GlobalManager.scene);
        this.zoneB.actionManager.registerAction(
            new ExecuteCodeAction(
                {
                    trigger: ActionManager.OnIntersectionEnterTrigger,
                    parameter: curlingMesh,
                },
                (actionEv) => {
                    GlobalManager.goalZoneB();
                }
            )
        );
    }

    update(delta) {

    }
}

export default World;