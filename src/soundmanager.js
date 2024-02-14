import { Sound } from '@babylonjs/core/Audio/sound';
import { AssetsManager } from '@babylonjs/core/Misc/assetsManager';

import { GlobalManager } from "./globalmanager";

import musicUrl from "../assets/musics/Black Diamond.mp3";
import hitSoundUrl from "../assets/sounds/344033__reitanna__cute-impact.wav";
import skiingSoundUrl from "../assets/sounds/skiing.mp3";


// assets here : https://itch.io/game-assets/free/tag-music
class SoundManager {


  SoundsFX = Object.freeze({
    WHISTLE: 0,
  })


  Musics = Object.freeze({
    START_MUSIC: 0,
    GAME_MUSIC: 1,
    GAMEOVER_MUSIC: 2,
  });

  #soundsFX = [];
  #musics = [ ];

  #prevMusic;

  static get instance() {
    return (globalThis[Symbol.for(`PF_${SoundManager.name}`)] ||= new this());
  }

  constructor() {
    this.#prevMusic = null;
  }

  async init() {
    return this.loadAssets();
  }

  update(delta) {
    
  }

  playSound(soundIndex) {
    if (soundIndex >= 0 && soundIndex < this.#soundsFX.length)
      this.#soundsFX[soundIndex].play();
  }

  playMusic(musicIndex) {
    if (this.#prevMusic != null)
      this.#musics[this.#prevMusic].stop();
    if (musicIndex >= 0 && musicIndex < this.#musics.length) {
      this.#musics[musicIndex].play();
      this.#prevMusic = musicIndex;
    }
  }

  async loadAssets() {
    return new Promise((resolve, reject) => {

      // Asset manager for loading texture and particle system
      let assetsManager = new AssetsManager(GlobalManager.scene);

      const music1Data = assetsManager.addBinaryFileTask("music1", musicUrl);

      const skiingSoundData = assetsManager.addBinaryFileTask("fireSound", skiingSoundUrl);

      // after all tasks done, set up particle system
      assetsManager.onFinish = (tasks) => {
        console.log("tasks successful", tasks);

        this.#musics[this.Musics.START_MUSIC] = new Sound("music1", music1Data.data, GlobalManager.scene, undefined, { loop: true, autoplay: false, volume: 0.4 });

        this.#soundsFX[this.SoundsFX.WHISTLE] = new Sound("whistle", skiingSoundData.data, GlobalManager.scene);

        resolve(true);
      }

      assetsManager.onError = (task, message, exception) => {
        console.log(task, message, exception);
        reject(false);
      }


      // load all tasks
      assetsManager.load();

    });


  }
}

const { instance } = SoundManager;
export { instance as SoundManager };
