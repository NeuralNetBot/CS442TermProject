
class Camera {

    constructor( position, roll, pitch, yaw, perspective ) {
        this.position = position;
        this.roll = roll;
        this.pitch = pitch;
        this.yaw = yaw;
        this.perspective = perspective;
        this.rot = this.calculateRotationMatrix();
    }
    
    calculateRotationMatrix() {
        return Mat4.rotation_xz(this.yaw).mul(
               Mat4.rotation_yz(this.pitch).mul(
               Mat4.rotation_xy(this.roll)));
    }
    
    setRPY( roll, pitch, yaw) {
        this.roll = roll;
        this.pitch = pitch;
        this.yaw = yaw;
        this.rot = this.calculateRotationMatrix();
    }
    
    setPosition( position ) {
        this.position = position;
    }

    rotateBy( roll, pitch, yaw) {
        this.roll += roll;
        this.pitch += pitch;
        this.yaw += yaw;
        this.rot = this.calculateRotationMatrix();
    }
    
    translate( amount ) {
        this.position = this.position.add(amount);
    }
    
    //moves the camera in the direction its facing
    //z forward, y up, x right
    move ( amount ) {
        this.translate(this.rot.transform_vec(amount));
    }
    
    setPerspectiveMat(perspective) {
        this.perspective = perspective;
    }
    
    getPosition() {
        return this.position;
    }
    
    getMatrix() {

        let cameramat = Mat4.translation(this.position.x, this.position.y, this.position.z).mul(this.rot);
        let view = cameramat.inverse();
            
        return this.perspective.mul(view);
    }

  
}