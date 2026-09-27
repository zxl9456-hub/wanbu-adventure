// The same constants drive hit detection, skill feedback and combat QA.
export const CLAW={cooldown:.7,duration:.34,windup:.08,activeUntil:.25,reach:3.4,damage:15,weakDamage:30};
export const GUARDIAN_HP=180;
export const EXPOSE_TIME=3.2;
export const DEFEAT_TIME=1.3;
export function clawTouches(player,strike,guardian){
 if(!strike||strike.hit||strike.elapsed<CLAW.windup||strike.elapsed>CLAW.activeUntil)return false;
 const forward=(guardian.x-player.x)*strike.facing;
 return forward>=-.45&&forward<=CLAW.reach&&player.y>=-.5&&player.y<=2.7;
}
