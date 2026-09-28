import {CampusState} from '../campus/state.js';
import {SHOES} from './state.js';
// A disposable game state: no purchases, rewards or encounter results are copied back.
export function createShoeTrial(id){
 if(!Object.hasOwn(SHOES,id))return null;
 const state=new CampusState({version:7,storySeen:true,sites:['jinjiang','xiamen','shanghai'],circuit:{claw:true,run:true,target:true,poolSwitch:true,poolCrossed:true,courtGate:true},resume:{room:'court',x:18,y:0}});
 state.shoes.equipped=id;state.circuit.startPhase('runner',state);state.drain();return state;
}
