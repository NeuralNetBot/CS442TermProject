
class Input {
    static keyStates = new Map();
    static mousefunc = undefined;

    static handleKeyDown(event) {
        Input.keyStates.set(event.key, true);
    }

    static handleKeyUp(event) {
        Input.keyStates.set(event.key, false);
    }

    static getKeyState(key) {
        return Input.keyStates.get(key) || false;
    }


    static isLocked = false;

    static lockMouse() {
        const canvas = document.getElementById('the-canvas');
        if (!canvas) return;

        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;

        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
            Input.isLocked = true;
        }
    }

    static unlockMouse() {
        document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;

        if (document.exitPointerLock) {
            document.exitPointerLock();
            Input.isLocked = false;
        }
    }

    static setMouseHandler( mousefunc )
    {
        Input.mousefunc = mousefunc;
    }

    static handleMouseMove(event) {
        if (Input.isLocked) {

            const deltaX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            const deltaY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

            if (typeof Input.mousefunc === 'function') {
                Input.mousefunc(deltaX, deltaY);
            }
        }
    }

    static handlePointerLock() {
        Input.isLocked = document.pointerLockElement === null;
        const canvas = document.getElementById('the-canvas');
        if(document.pointerLockElement === canvas || document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas) {
            Input.isLocked = true;
        } else {
            Input.isLocked = false;
        }
    }

    static init() {
        document.addEventListener('pointerlockchange', Input.handlePointerLock);
        document.addEventListener('mozpointerlockchange', Input.handlePointerLock);
        document.addEventListener('webkitpointerlockchange', Input.handlePointerLock);
        document.addEventListener('mousemove', Input.handleMouseMove);
        document.addEventListener('keydown', Input.handleKeyDown);
        document.addEventListener('keyup', Input.handleKeyUp);
    }

}
