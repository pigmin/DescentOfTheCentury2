import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType, PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';

import { GlobalManager, PhysMasks } from "./globalmanager";


class Tree {

    //Mesh
    gameObject;

    //physic
    aggregate;

    constructor(treeMesh) {
        this.gameObject = treeMesh;

        //TODO : create a "tree" object instance to react to wind, jumps, etc.
        this.aggregate = new PhysicsAggregate(treeMesh, PhysicsShapeType.MESH, { mass: 20, friction: 0.5, restitution: 0.3 }, GlobalManager.scene);
        this.aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
        this.aggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;


        GlobalManager.waterMaterial.addToRenderList(treeMesh);
        treeMesh.receiveShadows = true;
        GlobalManager.addShadowCaster(treeMesh);

    }

    init() {

    }

    update(delta) {

    }

}

export default Tree;