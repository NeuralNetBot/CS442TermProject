
class Camera {

    constructor( position, roll, pitch, yaw, perspective ) {
        this.position = position;
        this.roll = roll;
        this.pitch = pitch;
        this.yaw = yaw;
        this.perspective = perspective;
        this.rot = this.calculateRotationMatrix();
        this.frustumplanes = new Array(6);
        this.matrix = null;
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
    
    calcFrustum() {
        this.frustumplanes[0] = new Vec4(this.matrix.rc(3, 0) + this.matrix.rc(0, 0), this.matrix.rc(3, 1) + this.matrix.rc(0, 1), this.matrix.rc(3, 2) + this.matrix.rc(0, 2), this.matrix.rc(3, 3) + this.matrix.rc(0, 3));
        this.frustumplanes[1] = new Vec4(this.matrix.rc(3, 0) - this.matrix.rc(0, 0), this.matrix.rc(3, 1) - this.matrix.rc(0, 1), this.matrix.rc(3, 2) - this.matrix.rc(0, 2), this.matrix.rc(3, 3) - this.matrix.rc(0, 3));
        this.frustumplanes[2] = new Vec4(this.matrix.rc(3, 0) + this.matrix.rc(1, 0), this.matrix.rc(3, 1) + this.matrix.rc(1, 1), this.matrix.rc(3, 2) + this.matrix.rc(1, 2), this.matrix.rc(3, 3) + this.matrix.rc(1, 3));
        this.frustumplanes[3] = new Vec4(this.matrix.rc(3, 0) - this.matrix.rc(1, 0), this.matrix.rc(3, 1) - this.matrix.rc(1, 1), this.matrix.rc(3, 2) - this.matrix.rc(1, 2), this.matrix.rc(3, 3) - this.matrix.rc(1, 3));
        this.frustumplanes[4] = new Vec4(this.matrix.rc(3, 0) + this.matrix.rc(2, 0), this.matrix.rc(3, 1) + this.matrix.rc(2, 1), this.matrix.rc(3, 2) + this.matrix.rc(2, 2), this.matrix.rc(3, 3) + this.matrix.rc(2, 3));
        this.frustumplanes[5] = new Vec4(this.matrix.rc(3, 0) - this.matrix.rc(2, 0), this.matrix.rc(3, 1) - this.matrix.rc(2, 1), this.matrix.rc(3, 2) - this.matrix.rc(2, 2), this.matrix.rc(3, 3) - this.matrix.rc(2, 3));
    }

    getMatrix(translate=true) {
        let cameramat = null;
        if(translate) {
            cameramat = Mat4.translation(this.position.x, this.position.y, this.position.z).mul(this.rot);
        } else {
            cameramat = this.rot;
        }
        let view = cameramat.inverse();
        this.matrix = this.perspective.mul(view);
        return this.matrix;
    }

    isPointInFrustum(point) {
        for(let i = 0; i < this.frustumplanes.length; i++)
        {
            if(this.frustumplanes[i].dot(point) < 0.0) {
                return false;
            }
        }
        return true;
    }

    //returns true if any of the points are within the frustum
    isPointsInFrustum(points) {
        for(let i = 0; i < points.length; i++)
        {
            if(this.isPointInFrustum(points[i])) {
                return true;
            }
        }
        return false;
    }

  
}