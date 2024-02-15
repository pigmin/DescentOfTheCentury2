import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType, PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';

import { GlobalManager, PhysMasks } from "./globalmanager";
import { Vector3 } from '@babylonjs/core';


class Tree {

    //Mesh
    gameObject;

    //physic
    aggregate;

    wind = Vector3.Zero();
    top = new Vector3(0, 0, 0);



    constructor(treeMesh) {
        this.gameObject = treeMesh;

        //TODO : create a "tree" object instance to react to wind, jumps, etc.
        this.aggregate = new PhysicsAggregate(treeMesh, PhysicsShapeType.MESH, { mass: 10, friction: 0.5, restitution: 0.3 }, GlobalManager.scene);
        this.aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
        this.aggregate.shape.filterMembershipMask = PhysMasks.PHYS_MASK_GROUND;

        GlobalManager.waterMaterial.addToRenderList(treeMesh);
        treeMesh.receiveShadows = true;
        GlobalManager.addShadowCaster(treeMesh);

    }

    init() {

    }

    update(delta) {
        /*let now = performance.now();
        this.wind.set( 1 * Math.cos(now / 2000), 0, 1 * Math.sin(now / 2000));
        this.aggregate.body.applyForce(this.wind, this.aggregate.body.transformNode.position);*/
    }

}

export default Tree;