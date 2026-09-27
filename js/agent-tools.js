/** Optional WebMCP: the same start/pause actions used by the visible interface. */
export function registerAdventureTools(game){
 const context=document.modelContext;if(!context?.registerTool)return;
 const lifecycle=new AbortController();addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 const state=()=>({started:game.active,paused:game.paused,chapter:Math.min(game.chapter+1,4),score:game.score,finished:game.finished,memories:game.collected.size,objective:document.querySelector('#quest-title').textContent});
 const empty=input=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object.');};
 const list=[
  {name:'read_adventure_state',title:'读取万步奇遇进度',description:'Read the current objective and progress without changing the game.',annotations:{readOnlyHint:true},execute(input){empty(input);return state();}},
  {name:'start_adventure',title:'开启万步奇遇',description:'Start the game from its welcome screen. This does not complete any challenge or discard an active journey.',annotations:{readOnlyHint:false},execute(input){empty(input);if(game.active)throw new Error('Journey already started.');game.start();return state();}},
  {name:'pause_adventure',title:'暂停万步奇遇',description:'Pause the active journey and open the visible pause panel, saving the current progress on this device.',annotations:{readOnlyHint:false},execute(input){empty(input);if(!game.active)throw new Error('Start a journey first.');game.ui.pause(true);return state();}}
 ];
 for(const tool of list){try{Promise.resolve(context.registerTool({...tool,inputSchema:{type:'object',properties:{},additionalProperties:false}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}
}
