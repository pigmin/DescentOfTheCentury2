import { Vector3, Vector2 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType, PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scalar } from '@babylonjs/core/Maths/math.scalar';
import { ActionManager } from '@babylonjs/core/Actions/actionManager';
import { ExecuteCodeAction } from '@babylonjs/core/Actions/directActions';

import { GlobalManager, PhysMasks, States } from "./globalmanager";

import peachCastleUrl from "../assets/models/peach_castle.glb";


import debugTexUrl from "../assets/textures/GridEmissive.png";


class World {

    x;
    y;
    z;

    gameObject;
    meshAggregate;


    constructor(x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    async init() {

        const result = await SceneLoader.ImportMeshAsync("", "", peachCastleUrl, GlobalManager.scene);
        this.gameObject = result.meshes[0];

        this.gameObject.name = "Castle";
        this.gameObject.position = new Vector3(95.2, -28.13, -33.57);
        this.gameObject.scaling.scaleInPlace(0.5);
        
        GlobalManager.addShadowCaster(this.gameObject, true);
        for (let childMesh of result.meshes) {

            childMesh.refreshBoundingInfo(true);
            if (childMesh.getTotalVertices() > 0) {
                if (childMesh.name === "Castle") {
                    const groundAggregate = new PhysicsAggregate(childMesh, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.2 }, GlobalManager.scene);
                    groundAggregate.body.setMotionType(PhysicsMotionType.STATIC);
                    groundAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;
                    GlobalManager.waterMaterial.addToRenderList(childMesh);
                    childMesh.receiveShadows = true;
                    GlobalManager.addShadowCaster(childMesh);
                }
                else if (childMesh.name === "Grass") {
                    const groundAggregate = new PhysicsAggregate(childMesh, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.3 }, GlobalManager.scene);
                    groundAggregate.body.setMotionType(PhysicsMotionType.STATIC);
                    groundAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;
                    GlobalManager.waterMaterial.addToRenderList(childMesh);
                    childMesh.receiveShadows = true;
                    GlobalManager.addShadowCaster(childMesh);
                }
                else if (childMesh.name === "Skybox") {
                    GlobalManager.waterMaterial.addToRenderList(childMesh);
                    childMesh.receiveShadows = false;
                }
                else if (childMesh.name.includes("Windows")) {
                    GlobalManager.waterMaterial.addToRenderList(childMesh);
                    childMesh.receiveShadows = false;
                }
                else if (childMesh.name.includes("Tree")) {
                    //TODO : create a "tree" object instance to react to wind, jumps, etc.
                    const groundAggregate = new PhysicsAggregate(childMesh, PhysicsShapeType.MESH, { mass: 20, friction: 0.5, restitution: 0.3 }, GlobalManager.scene);
                    groundAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
                    groundAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;

        
                    GlobalManager.waterMaterial.addToRenderList(childMesh);
                    childMesh.receiveShadows = true;
                    GlobalManager.addShadowCaster(childMesh);
                }
                else {
                   //RAS
                }
            }
        }

        //GlobalManager.waterMaterial.addToRenderList(GlobalManager.environment.skybox);

/*
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
*/


        let debugMat = new StandardMaterial("debugMat", GlobalManager.scene);
        debugMat.emissiveTexture = new Texture(debugTexUrl);
        debugMat.emissiveColor = new Color3(0, 0.1, 0.4);
        debugMat.diffuseColor = new Color3(0.57, 0.57, 0.7);
        debugMat.emissiveTexture.level = 2;

        let debugPlane = MeshBuilder.CreateBox("debugPlane", { width: 96, height: 0.5, depth: 96, subdivisions: 16 }, GlobalManager.scene);
        debugPlane.receiveShadows = true;
        debugPlane.material = debugMat.clone();
        debugPlane.material.emissiveTexture.uScale = 16;
        debugPlane.material.emissiveTexture.vScale = 16;
        debugPlane.material.Color3 = new Color3(1, 0, 0);
        debugPlane.position = new Vector3(131, -12.25, 72.38);
        let debugAggregate = new PhysicsAggregate(debugPlane, PhysicsShapeType.MESH, { mass: 0, friction: 0.5, restitution: 0.2 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.STATIC);
        debugAggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;

        let debugBouncingBox = MeshBuilder.CreateBox("debugBouncingBox", { size: 5 });
        debugBouncingBox.receiveShadows = true;
        GlobalManager.addShadowCaster(debugBouncingBox);
        debugBouncingBox.position = new Vector3(100, 0, -10);
        debugBouncingBox.scaling = new Vector3(1, 0.1, 2);
        debugBouncingBox.rotation = new Vector3(0, 0, 0);
        debugBouncingBox.material = debugMat.clone();
        debugBouncingBox.material.diffuseColor = new Color4(0.8, 0, 0, 0.5);
        debugBouncingBox.material.emissiveColor = new Color4(0.2, 0, 0, 0.5);

        debugAggregate = new PhysicsAggregate(debugBouncingBox, PhysicsShapeType.BOX, { mass: 10, friction: 0.5, restitution: 0.8 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);


        this.createDynamicCubesInstances();
       // this.createStaticCubes();

        let debugSphere = MeshBuilder.CreateSphere("debugSphere", { diameter: 5 });
        debugSphere.receiveShadows = true;
        GlobalManager.addShadowCaster(debugSphere);
        debugSphere.position = new Vector3(100, 0, -10);
        debugSphere.rotation = new Vector3(0, Math.PI / 3, Math.PI / 5);
        debugSphere.material = debugMat.clone();
        debugSphere.material.alpha = 0.5;
        debugAggregate = new PhysicsAggregate(debugSphere, PhysicsShapeType.SPHERE, { mass: 3, friction: 0.5, restitution: 0.1 }, GlobalManager.scene);
        debugAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);



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


    /**
     * Les thinInstances semblent ne pas prendrent en compte scaling et rot pour le moment... je bascule en instances classiques
     */
    createDynamicCubesInstances() {
        let debugMat = new StandardMaterial("debugMat", GlobalManager.scene);
        debugMat.emissiveTexture = new Texture(debugTexUrl);
        debugMat.emissiveColor = new Color3(0, 0.1, 0.4);
        debugMat.diffuseColor = new Color3(0.57, 0.57, 0.7);
        debugMat.emissiveTexture.level = 2;

        //Scene render/register
        // Our built-in 'sphere' shape.
        let debugBoxMod = MeshBuilder.CreateBox("debugBoxD0", { width:2, depth: 4, height: 0.5});
        debugBoxMod.position = Vector3.Zero();
        debugBoxMod.computeWorldMatrix(true);
        GlobalManager.addShadowCaster(debugBoxMod);
        debugBoxMod.material = debugMat.clone();
        debugBoxMod.material.diffuseColor = new Color4(0.0, 0.8, 0, 1);
        debugBoxMod.material.emissiveColor = new Color4(0.0, 0.4, 0, 1);
        debugBoxMod.receiveShadows = true;
        
        let NB_DYN_CUBES = 20;
        for (let i = 0; i < NB_DYN_CUBES; i++) {

                let instance = debugBoxMod.createInstance('dynCube' + i);
                instance.position = new Vector3(Scalar.RandomRange(95, 140), Scalar.RandomRange(-20, -24), Scalar.RandomRange(-18, 15));
                new PhysicsAggregate(instance, PhysicsShapeType.BOX, { mass: 5, friction: 0.5, restitution: 0.1 }, GlobalManager.scene);
            }
        debugBoxMod.dispose();


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