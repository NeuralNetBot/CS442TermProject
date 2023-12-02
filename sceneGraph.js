class Node {
    constructor(parent, offsetMatrix, children = []) {
        this.parent = parent;
        if (this.parent) {
            this.parent.addChild(this);
        }
        this.matrix = Mat4.translation(0, 0, 0);
        this.offsetMatrix = offsetMatrix;
        this.children = children;

        this.children.forEach(child => {
            child.setParent(this);
        });
    }

    update() {
        if (this.parent) {
            this.matrix = this.parent.matrix.mul(this.offsetMatrix);
        }

        else {
            this.matrix = this.offsetMatrix;
        }

        this.children.forEach(child => {
            child.update();
        });
    }

    addChild(node) {
        this.children.push(node);
    }

    removeChild(node) {
        let index = this.children.indexOf(node);
        if (index !== -1) {
            this.children.splice(index, 1);
            node.parent = null;
        }

    }

    setParent(node) {
        this.parent = node;
    }
}

class SceneGraph {
    constructor() {
        this.root = new Node(null, Mat4.translation(0, 0, 0));
    }

    getRoot() {
        return this.root;
    }

    update() {
        this.root.update();
    }

}