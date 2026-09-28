import {SHOES} from './state.js';
const el=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
export function showShoeShop(game){
 const s=game.state,kit=s.shoes,atShop=s.nearby()?.kind==='shoe-shop';
 const body=game.modal(atShop?'小步补给站':'小步的运动装备',`可用 ${s.availableCoins} 足迹币 · 累计 ${s.totalCoins}。一次只穿一双；购买永久保存，切换免费。`,[['继续冒险',()=>game.resume(),true]],'shoe-dialog');
 body.append(el('p','shoe-location',atShop?'收集 → 试穿 → 购买 → 带上装备再出发。购买不会减少建筑的累计解锁进度。':'购买地点：大堂入口的绿色补给站，靠近后按 F。这里可以免费试穿和切换已购装备。'));
 const grid=el('div','shoe-grid');
 for(const item of Object.values(SHOES)){
  const owned=kit.owned.includes(item.id),equipped=kit.equipped===item.id;
  const card=el('article','shoe-card'+(equipped?' equipped':''));const figure=el('div','shoe-figure'),img=el('img','');img.src='./assets/equipment/'+item.id+'.png';img.alt=item.model+' 游戏概念鞋模型';figure.append(img,el('span','shoe-tag',equipped?'✓ 正在穿戴':item.tag));
  card.append(figure,el('small','shoe-model',item.model),el('h3','',item.name),el('p','shoe-effect',item.text),el('p','shoe-detail',item.detail));
  const row=el('div','shoe-actions'),buy=el('button','primary',equipped?'已穿戴':owned?'穿上这双':!atShop?'在大堂购买':s.availableCoins<item.cost?'还差 '+(item.cost-s.availableCoins)+' 枚金币':item.cost+' 金币 · 购买并穿上');
  buy.disabled=equipped||!owned&&(!atShop||s.availableCoins<item.cost);buy.onclick=()=>{const ok=owned?kit.equip(item.id,s):kit.buy(item.id,s);if(ok){game.events();game.refresh();showShoeShop(game);}};
  const trial=el('button','','免费试穿 30 秒');trial.setAttribute('aria-label','试穿 '+item.model);trial.onclick=()=>game.startShoeTrial(item.id);row.append(buy,trial);card.append(row);grid.append(card);
 }
 body.append(grid);
 if(kit.equipped){const off=el('button','shoe-remove','换回普通运动鞋');off.onclick=()=>{if(kit.equip(null,s)){game.events();game.refresh();showShoeShop(game);}};body.append(off);}
 body.append(el('p','shoe-footnote','鞋款灵感来自 ANTA 产品；外观为原创概念模型，金币价格与技能均为游戏设定。护盾、反击用于训练馆与机械猎豹战斗；疾跑也适用于云端步道。密室和接力保持各自的机关规则。'));
}
