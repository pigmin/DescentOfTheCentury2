import { ActionManager, Axis, Color3, Color4, Engine, ExecuteCodeAction, Material, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShape, PhysicsShapeType, Scalar, SceneLoader, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";
import { GlobalManager, PhysMasks, States } from "./globalmanager";

import terrainMeshUrl from "../assets/models/Snow Scene Output 1024.glb";
import terrainDetailTexUrl from "../assets/textures/d00.png";

import terrainMeshTexture from "../assets/textures/Snow Bitmap Output 1024.png";

import decor1Url from "../assets/models/handpainted_pine_tree.glb";


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
        this.gameObject.scaling.scaleInPlace(.2);
        let deltaX = (max.x - min.x) / 10;
        let deltaZ = (max.z - min.z) / 10;
        let deltaY = (max.y - min.y) / 10;
        this.gameObject.position.set(deltaX, -deltaY, deltaZ);
        this.gameObject.receiveShadows = true;
        GlobalManager.addShadowCaster(this.gameObject, true);

        let groundMat = this.gameObject.material;
        groundMat.environmentIntensity = 1;
        groundMat.ambientColor = new Color4(0, 0, 0, 0);
        groundMat.ambientTexture.level = 1;
        groundMat.ambientTextureStrength = 0.1;

        groundMat.detailMap.texture = new Texture(terrainDetailTexUrl, GlobalManager.scene);
        groundMat.detailMap.texture.uScale = 256;
        groundMat.detailMap.texture.vScale = 256;
        groundMat.detailMap.isEnabled = true;
        groundMat.detailMap.diffuseBlendLevel = 0.2; // between 0 and 1
        groundMat.detailMap.bumpLevel = 1; // between 0 and 1
        //groundMat.bumpTexture.level = 0.4;
        groundMat.detailMap.roughnessBlendLevel = 0.5; // between 0 and 1
/*
        this.gameObject = MeshBuilder.CreateGround("groundDebug", {width:256, height:256, subdivisions:32}, GlobalManager.scene);
        //this.gameObject.rotation = new Vector3(Math.PI/2, 0, 0);
        this.gameObject.material = new StandardMaterial("groundmat", GlobalManager.scene);
        this.gameObject.material.diffuseTexture = new Texture(terrainMeshTexture);
*/
        const groundAggregate = new PhysicsAggregate(this.gameObject, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.3 }, GlobalManager.scene);
        groundAggregate.body.setMotionType(PhysicsMotionType.STATIC);
        groundAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;
        
        let debugBox = MeshBuilder.CreateBox("debugBox2", {size:5});
        debugBox.receiveShadows = true;
        GlobalManager.addShadowCaster(debugBox);
        debugBox.position = new Vector3(3, 0, 1);
        debugBox.rotation = new Vector3(0, -1, Math.PI/5);
        let debugAggregate = new PhysicsAggregate(debugBox, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.3 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.STATIC);
        debugAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;

                
        debugBox = MeshBuilder.CreateBox("debugBox2", {size:5});
        debugBox.receiveShadows = true;
        GlobalManager.addShadowCaster(debugBox);
        debugBox.position = new Vector3(3, -1, 4);
        debugBox.rotation = new Vector3(0, Math.PI/2, Math.PI/4);
        debugAggregate = new PhysicsAggregate(debugBox, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.3 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.STATIC);
        debugAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;

                        
        debugBox = MeshBuilder.CreateBox("debugBox2", {size:5});
        debugBox.receiveShadows = true;
        GlobalManager.addShadowCaster(debugBox);
        debugBox.position = new Vector3(8, -1, 8);
        debugBox.rotation = new Vector3(0, Math.PI/3, Math.PI/5);
        debugAggregate = new PhysicsAggregate(debugBox, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.3 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.STATIC);
        debugAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;
                        
        debugBox = MeshBuilder.CreateBox("debugBox2", {size:5});
        debugBox.receiveShadows = true;
        GlobalManager.addShadowCaster(debugBox);
        debugBox.position = new Vector3(16, -1, 8);
        debugBox.rotation = new Vector3(0, Scalar.RandomRange(-Math.PI, Math.PI), Math.PI/6);
        debugAggregate = new PhysicsAggregate(debugBox, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.3 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.STATIC);
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