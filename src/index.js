import { Engine } from '@babylonjs/core/Engines/engine';

import Game from "./game";

let canvas;
let engine;

const babylonInit = async () => {
    
    canvas = document.getElementById("renderCanvas");
    engine = new Engine(canvas, false, {
            adaptToDeviceRatio: true,
    });
    
    window.addEventListener("resize", function () {
        engine.resize();
    });
};



babylonInit().then(() => {
    const game = new Game(canvas, engine);
    game.start();    
});

