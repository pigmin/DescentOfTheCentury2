import { FollowCamera, Node, TargetCamera, Tools, Vector3 } from "@babylonjs/core";

Node.AddNodeConstructor("FollowCamera2", (name, scene) => {
    return () => new FollowCamera2(name, Vector3.Zero(), scene);
});

/**
 * A follow camera takes a mesh as a target and follows it as it moves. Both a free camera version followCamera and
 * an arc rotate version arcFollowCamera are available.
 * @see https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction#followcamera
 */
export class FollowCamera2 extends FollowCamera {
    /**
     * Distance the follow camera should follow an object at
     */
    radius = 12;

    /**
     * Minimum allowed distance of the camera to the axis of rotation
     * (The camera can not get closer).
     * This can help limiting how the Camera is able to move in the scene.
     */
    lowerRadiusLimit = null;

    /**
     * Maximum allowed distance of the camera to the axis of rotation
     * (The camera can not get further).
     * This can help limiting how the Camera is able to move in the scene.
     */
    upperRadiusLimit = null;

    /**
     * Define a rotation offset between the camera and the object it follows
     */
    rotationOffset = 0;

    /**
     * Minimum allowed angle to camera position relative to target object.
     * This can help limiting how the Camera is able to move in the scene.
     */    
    lowerRotationOffsetLimit = null;

    /**
     * Maximum allowed angle to camera position relative to target object.
     * This can help limiting how the Camera is able to move in the scene.
     */
    upperRotationOffsetLimit = null;

    /**
     * Define a height offset between the camera and the object it follows.
     * It can help following an object from the top (like a car chasing a plane)
     */

    heightOffset = 4;

    /**
     * Minimum allowed height of camera position relative to target object.
     * This can help limiting how the Camera is able to move in the scene.
     */

    lowerHeightOffsetLimit = null;

    /**
     * Maximum allowed height of camera position relative to target object.
     * This can help limiting how the Camera is able to move in the scene.
     */

    upperHeightOffsetLimit = null;

    /**
     * Define how fast the camera can accelerate to follow it s target.
     */

    cameraAcceleration = 0.05;

    /**
     * Define the speed limit of the camera following an object.
     */

    maxCameraSpeed = 20;

    /**
     * Define the target of the camera.
     */
    lockedTarget = null;

    constructor(name, position, scene, lockedTarget) {
        super(name, position, scene);

        this.lockedTarget = lockedTarget;
        // Uncomment the following line when the relevant handlers have been implemented.
        // this.inputs.addKeyboard().addMouseWheel().addPointers().addVRDeviceOrientation();
    }

    _follow(cameraTarget) {
        if (!cameraTarget) {
            return;
        }

/*        const rotMatrix = TmpVectors.Matrix[0];
        cameraTarget.absoluteRotationQuaternion.toRotationMatrix(rotMatrix);
        const yRotation = Math.atan2(rotMatrix.m[8], rotMatrix.m[10]);

*/
        const yRotation = 0;

        const radians = Tools.ToRadians(this.rotationOffset) + yRotation;

        const targetPosition = cameraTarget.getAbsolutePosition();
        const targetX = targetPosition.x + Math.sin(radians) * this.radius;

        const targetZ = targetPosition.z + Math.cos(radians) * this.radius;
        const dx = targetX - this.position.x;
        const dy = targetPosition.y + this.heightOffset - this.position.y;
        const dz = targetZ - this.position.z;
        let vx = dx * this.cameraAcceleration * 2; //this is set to .05
        let vy = dy * this.cameraAcceleration;
        let vz = dz * this.cameraAcceleration * 2;

        if (vx > this.maxCameraSpeed || vx < -this.maxCameraSpeed) {
            vx = vx < 1 ? -this.maxCameraSpeed : this.maxCameraSpeed;
        }

        if (vy > this.maxCameraSpeed || vy < -this.maxCameraSpeed) {
            vy = vy < 1 ? -this.maxCameraSpeed : this.maxCameraSpeed;
        }

        if (vz > this.maxCameraSpeed || vz < -this.maxCameraSpeed) {
            vz = vz < 1 ? -this.maxCameraSpeed : this.maxCameraSpeed;
        }

        this.position = new Vector3(this.position.x + vx, this.position.y + vy, this.position.z + vz);
        this.setTarget(targetPosition);
    }


    /**
     * Gets the camera class name.
     * @returns the class name
     */
    getClassName() {
        return "FollowCamera2";
    }
}
